"""Train a normal-only convolutional autoencoder and calibrate anomaly thresholds.

Run as: python -m src.train_ae --manifest data/metadata/dataset-manifest.csv
  --audio-root data/raw --output-dir models/anomaly
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn

from src.ae_anomaly import ConvAutoencoder, window_reconstruction_error
from src.features import preprocess_to_npz
from src.preprocess_audio import FeatureConfig, to_config_dict
from src.train_cnn import set_seed


def _session_split(samples: list, n_windows_per_sample: np.ndarray, seed: int):
    """Assign each sample (session) to train/val/test by session id hash."""
    rng = np.random.RandomState(seed)
    indices = rng.permutation(len(samples))
    n = len(samples)
    n_train = max(1, int(n * 0.7))
    n_val = max(1, int(n * 0.15))
    train_s, val_s, test_s = indices[:n_train], indices[n_train : n_train + n_val], indices[n_train + n_val :]

    split_of_window = np.empty(int(np.sum(n_windows_per_sample)), dtype=np.int64)
    start = 0
    split_id = {"train": 0, "val": 1, "test": 2}
    for pos, (name, group) in enumerate(
        [("train", train_s), ("val", val_s), ("test", test_s)]
    ):
        for si in group:
            end = start + n_windows_per_sample[si]
            split_of_window[start:end] = split_id[name]
            start = end
    return split_of_window, {"train": list(train_s), "val": list(val_s), "test": list(test_s)}


def _standardize(X: np.ndarray, mean: np.ndarray | None = None, std: np.ndarray | None = None):
    x = X.astype(np.float32)
    if mean is None:
        mean = x.mean(axis=0, keepdims=True).astype(np.float32)
    if std is None:
        std = x.std(axis=0, keepdims=True).astype(np.float32) + 1e-8
    return (x - mean) / std, mean, std


def _aggregate_errors(errors_per_window: np.ndarray, window_of_sample: np.ndarray, n_samples: int) -> np.ndarray:
    agg = np.zeros(n_samples, dtype=np.float32)
    for i in range(n_samples):
        errs = errors_per_window[window_of_sample == i]
        if errs.size:
            agg[i] = float(np.mean(errs))
    return agg


def main() -> None:
    parser = argparse.ArgumentParser(description="Train the anomaly autoencoder")
    parser.add_argument("--manifest", required=True, type=Path)
    parser.add_argument("--audio-root", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--feature-kind", choices=["logmel", "mfcc"], default="logmel")
    parser.add_argument("--window-seconds", type=float, default=4.0)
    parser.add_argument("--overlap", type=float, default=0.5)
    parser.add_argument("--epochs", type=int, default=40)
    parser.add_argument("--patience", type=int, default=7)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--lr", type=float, default=1e-3)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--threshold-q-review", type=float, default=0.95)
    parser.add_argument("--threshold-q-critical", type=float, default=0.999)
    parser.add_argument("--disclaimer", default="PROTOTYPE")
    args = parser.parse_args()

    set_seed(args.seed)
    device = "cuda" if torch.cuda.is_available() else "cpu"

    feature_config = FeatureConfig(feature_kind=args.feature_kind, duration_seconds=args.window_seconds)

    manifest = args.manifest
    if not manifest.exists():
        raise SystemExit(f"Manifest not found: {manifest}")

    if args.overlap > 0.5:
        print(f"WARNING: overlap {args.overlap} > 0.5 counts some windows in adjacent recordings.")

    npz_path = args.output_dir / "features.npz"
    summary = preprocess_to_npz(
        manifest,
        args.audio_root,
        npz_path,
        feature_kind=args.feature_kind,
        window_seconds=args.window_seconds,
        overlap=args.overlap,
    )
    print("Preprocessing:", json.dumps(summary))

    data = np.load(npz_path, allow_pickle=True)
    X = data["X"].astype(np.float32)
    if X.ndim == 3:
        X = X[:, None, :, :]
    window_of_sample = data["window_of_sample"].astype(np.int64)
    file_names = list(data["file_names"])
    sessions = list(data["sessions"])
    n_samples = len(file_names)

    if n_samples < 3:
        raise SystemExit("Need at least 3 samples to create session-level splits.")

    split_of_window, split_session_idx = _session_split(
        list(range(n_samples)), np.bincount(window_of_sample), args.seed
    )
    print(f"Samples: {n_samples} ({len(split_session_idx['train'])} train / "
          f"{len(split_session_idx['val'])} val / {len(split_session_idx['test'])} test)")

    X_train, mean, std = _standardize(X[split_of_window == 0])
    X_val = _standardize(X[split_of_window == 1], mean, std)[0]
    X_test = _standardize(X[split_of_window == 2], mean, std)[0]

    train_t = torch.from_numpy(X_train).to(device)
    val_t = torch.from_numpy(X_val).to(device)
    test_t = torch.from_numpy(X_test).to(device)

    model = ConvAutoencoder().to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=args.lr)
    criterion = nn.MSELoss()

    n_batches = max(1, int(np.ceil(len(train_t) / args.batch_size)))
    best_val_loss, best_state, best_epoch, patience_counter = float("inf"), None, 0, 0
    history = []

    for epoch in range(1, args.epochs + 1):
        model.train()
        train_loss, seen = 0.0, 0
        perm = torch.randperm(len(train_t), device=device)
        for b in range(n_batches):
            idx = perm[b * args.batch_size : (b + 1) * args.batch_size]
            if not len(idx):
                continue
            batch = train_t[idx]
            optimizer.zero_grad()
            out = model(batch)
            loss = criterion(out, batch)
            loss.backward()
            optimizer.step()
            n = len(batch)
            train_loss += loss.item() * n
            seen += n
        train_loss /= max(seen, 1)

        model.eval()
        val_loss = criterion(model(val_t), val_t).item() if len(val_t) else float("nan")
        history.append({"epoch": epoch, "train_loss": round(train_loss, 6), "val_loss": round(float(val_loss), 6)})

        if val_loss < best_val_loss:
            best_val_loss, best_epoch, patience_counter = val_loss, epoch, 0
            best_state = {k: v.detach().cpu().clone() for k, v in model.state_dict().items()}
        else:
            patience_counter += 1
            if patience_counter >= args.patience:
                print(f"Early stop at epoch {epoch} (best {best_epoch})")
                break

    model.load_state_dict(best_state)
    model.to(device)

    val_errors = (
        window_reconstruction_error(model, val_t).cpu().numpy() if len(val_t) else np.zeros(1)
    )
    test_errors = (
        window_reconstruction_error(model, test_t).cpu().numpy() if len(test_t) else np.zeros(1)
    )

    q95 = float(np.quantile(val_errors, args.threshold_q_review))
    q99 = float(np.quantile(val_errors, args.threshold_q_critical))
    review_threshold = max(q95, 1e-6)
    critical_threshold = max(q99, review_threshold * 1.5)

    class Thresholds(dict):
        pass

    score_normal_cutoff = review_threshold / critical_threshold
    score_review_cutoff = 1.0
    thresholds = {
        "review_threshold": review_threshold,
        "critical_threshold": critical_threshold,
        "score_normal_cutoff": score_normal_cutoff,
        "score_review_cutoff": score_review_cutoff,
        "method": "val-window reconstruction-error quantiles",
        "provisional": True,
        "note": "Thresholds from normal-only validation sessions. "
                "Recalibrate with confirmed abnormal field recordings before any "
                "fault decision.",
    }

    model_version = f"{args.disclaimer}-ae-v0"
    checkpoint = {
        "state_dict": best_state,
        "model_version": model_version,
        "architecture": "ConvAutoencoder",
        "feature_config": to_config_dict(feature_config),
        "normalize_mean": mean,
        "normalize_std": std,
        "thresholds": thresholds,
        "class_names": ["normal"],
    }
    args.output_dir.mkdir(parents=True, exist_ok=True)
    torch.save(checkpoint, args.output_dir / "ae_model.pt")

    (args.output_dir / "config.json").write_text(
        json.dumps(
            {
                "model_version": model_version,
                "disclaimer": args.disclaimer,
                "architecture": "ConvAutoencoder",
                "feature_config": to_config_dict(feature_config),
                "thresholds": thresholds,
                "audio": {
                    "sample_rate": feature_config.sample_rate,
                    "window_seconds": args.window_seconds,
                    "overlap": args.overlap,
                },
            },
            indent=2,
        )
    )
    (args.output_dir / "thresholds.json").write_text(json.dumps(thresholds, indent=2))

    metrics = {
        "model_version": model_version,
        "device": device,
        "disclaimer": args.disclaimer,
        "n_samples": n_samples,
        "n_windows": {"train": len(train_t), "val": len(val_t), "test": len(test_t)},
        "n_windows_total": len(X),
        "sessions": {
            "train": [sessions[i] for i in split_session_idx["train"]],
            "val": [sessions[i] for i in split_session_idx["val"]],
            "test": [sessions[i] for i in split_session_idx["test"]],
        },
        "best_epoch": best_epoch,
        "best_val_loss": best_val_loss,
        "val_reconstruction_error_stats": {
            "mean": float(np.mean(val_errors)),
            "std": float(np.std(val_errors)),
            "q95": q95,
            "max": float(np.max(val_errors)),
        },
        "test_reconstruction_error_stats": {
            "mean": float(np.mean(test_errors)),
            "std": float(np.std(test_errors)),
            "max": float(np.max(test_errors)),
        },
        "thresholds": thresholds,
        "history": history,
    }
    (args.output_dir / "metrics.json").write_text(json.dumps(metrics, indent=2))

    print(json.dumps(
        {"model": str(args.output_dir / "ae_model.pt"), "best_epoch": best_epoch,
         "val_err": round(float(np.mean(val_errors)), 6), "review": review_threshold,
         "critical": critical_threshold},
        indent=2,
    ))


if __name__ == "__main__":
    main()