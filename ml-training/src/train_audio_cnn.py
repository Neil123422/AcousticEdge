"""Integrated supervised CNN trainer runnable as: python -m src.train_audio_cnn"""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path

import numpy as np
import torch

from src.preprocess_audio import FeatureConfig, extract_feature, to_config_dict
from src.features import load_full_audio, window_audio
from src.train_cnn import set_seed, train_classifier


def _read_manifest(path: Path) -> list[dict]:
    with path.open("r", newline="", encoding="utf-8-sig") as fh:
        return list(csv.DictReader(fh))


def _machine_of(file_name: str) -> str:
    import re

    m = re.search(r"(?:normal|anomaly)_id_(\d{2})", file_name)
    return m.group(1) if m else "00"


def _map_fault_type(fault_type: str) -> str:
    """Map raw fault_type to standardized class names."""
    mapping = {
        "Normal": "Normal",
        "Idler Bearing Failure": "Idler Bearing Failure",
        "Belt Slip Friction": "Belt Slip Friction",
        "Splice Failure Belt Tear": "Splice Failure Belt Tear",
    }
    return mapping.get(fault_type, "Unknown")


def main() -> None:
    parser = argparse.ArgumentParser(description="Train the audio CNN")
    parser.add_argument("--metadata", required=True, type=Path)
    parser.add_argument("--audio-root", required=True, type=Path)
    parser.add_argument("--feature-kind", choices=["logmel", "mfcc"], default="logmel")
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--split-by", choices=["session", "machine"], default="session")
    parser.add_argument("--class-weights", action="store_true", help="inverse-frequency class weights")
    parser.add_argument("--overlap", type=float, default=0.5, help="window overlap (default 0.5)")
    parser.add_argument("--epochs", type=int, default=40)
    parser.add_argument("--patience", type=int, default=7)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--lr", type=float, default=1e-3)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    set_seed(args.seed)
    device = "cuda" if torch.cuda.is_available() else "cpu"

    config = FeatureConfig(feature_kind=args.feature_kind)
    rows = _read_manifest(args.metadata)
    
    # Use fault_type column for 4-class classification
    labels = sorted({_map_fault_type(r.get("fault_type", r.get("label_code", ""))) for r in rows if r.get("fault_type") or r.get("label_code")})
    label_to_index = {label: i for i, label in enumerate(labels)}

    sample_groups: list[dict] = []  # one entry per clip: machine, label_idx, n_windows
    features: list[np.ndarray] = []
    skipped: list[str] = []
    for row in rows:
        path = args.audio_root / row["file_name"]
        raw_label = row.get("fault_type") or row.get("label_code", "")
        fault_type = _map_fault_type(raw_label)
        if fault_type not in label_to_index or not path.exists():
            skipped.append(str(path))
            continue
        try:
            samples = load_full_audio(path, config.sample_rate)
            segs = window_audio(samples, config, overlap=args.overlap)
            if not segs:
                skipped.append(f"{path}: no windows")
                continue
            feats = [extract_feature(seg, config) for seg in segs]
        except Exception as exc:
            skipped.append(f"{path}: {exc}")
            continue
        sample_groups.append(
            {
                "machine": _machine_of(row.get("file_name", "")),
                "label": label_to_index[fault_type],
                "n_windows": len(feats),
            }
        )
        features.extend(feats)

    if len(features) == 0:
        raise SystemExit("No usable audio files; aborting.")

    X = np.stack(features)
    n_windows = len(X)
    window_of_sample = np.repeat(
        np.arange(len(sample_groups)),
        [g["n_windows"] for g in sample_groups],
    )
    y = np.asarray([sample_groups[s]["label"] for s in window_of_sample], dtype=np.int64)

    rng = np.random.RandomState(args.seed)
    n_samples = len(sample_groups)
    if args.split_by == "machine":
        groups: dict[str, list[int]] = {}
        for i, g in enumerate(sample_groups):
            groups.setdefault(g["machine"], []).append(i)
        machine_ids_sorted = sorted(groups)
        if len(machine_ids_sorted) < 3:
            raise SystemExit("Need at least 3 machines for machine-level splits.")
        val_machine, test_machine = machine_ids_sorted[-2], machine_ids_sorted[-1]
        train_samples = sorted(
            set(range(n_samples)) - set(groups[val_machine]) - set(groups[test_machine])
        )
        val_samples = groups[val_machine]
        test_samples = groups[test_machine]
    else:
        indices = rng.permutation(n_samples)
        n_train = max(1, int(n_samples * 0.7))
        n_val = max(1, int(n_samples * 0.15))
        train_samples = indices[:n_train]
        val_samples = indices[n_train : n_train + n_val]
        test_samples = indices[n_train + n_val :]

    def expand(ids):
        return np.flatnonzero(np.isin(window_of_sample, ids))

    train_idx = expand(train_samples)
    val_idx = expand(val_samples)
    test_idx = expand(test_samples)

    args.output_dir.mkdir(parents=True, exist_ok=True)

    from src.train_cnn import FeatureDataset

    train_ds = FeatureDataset(X[train_idx], y[train_idx])
    val_ds = FeatureDataset(X[val_idx], y[val_idx])
    test_ds = FeatureDataset(X[test_idx], y[test_idx])

    normalize_mean = train_ds.features.mean(0, keepdim=True)
    normalize_std = train_ds.features.std(0, keepdim=True) + 1e-8
    for ds in (train_ds, val_ds, test_ds):
        ds.features = (ds.features - normalize_mean) / normalize_std

    class_weights = None
    if args.class_weights:
        counts = np.bincount(y[train_idx], minlength=len(labels)).astype(np.float64)
        counts = np.where(counts == 0, 1.0, counts)
        class_weights = torch.from_numpy(
            counts.sum() / (len(labels) * counts)
        ).float().to(device)

    metrics = train_classifier(
        train_ds=train_ds,
        val_ds=val_ds,
        feature_kind=args.feature_kind,
        class_names=labels,
        label_to_index=label_to_index,
        feature_config=to_config_dict(config),
        output_dir=args.output_dir,
        epochs=args.epochs,
        patience=args.patience,
        batch_size=args.batch_size,
        lr=args.lr,
        weight_decay=1e-4,
        seed=args.seed,
        device=device,
        test_ds=test_ds,
        class_weights=class_weights,
    )

    with (args.output_dir / "metrics.json").open("r") as fh:
        metrics_on_disk = json.load(fh)
    metrics_on_disk["split_sizes"]["test"] = len(test_ds)
    metrics_on_disk["split_by"] = args.split_by
    if args.split_by == "machine":
        metrics_on_disk["machines"] = {
            "train": sorted({sample_groups[i]["machine"] for i in train_samples}),
            "val": sorted({sample_groups[i]["machine"] for i in val_samples}),
            "test": sorted({sample_groups[i]["machine"] for i in test_samples}),
        }
    metrics_on_disk["n_windows"] = int(n_windows)
    metrics_on_disk["n_samples"] = int(n_samples)

    with (args.output_dir / "normalize.json").open("w") as fh:
        json.dump(
            {
                "mean": normalize_mean.numpy().reshape(-1).tolist(),
                "std": normalize_std.numpy().reshape(-1).tolist(),
                "feature_config": to_config_dict(config),
                "feature_kind": args.feature_kind,
                "model_version": "BENCHMARK-CNN-v2",
            },
            fh,
        )
    metrics_on_disk["class_weights"] = args.class_weights
    metrics_on_disk["skipped_files"] = skipped
    with (args.output_dir / "metrics.json").open("w") as fh:
        json.dump(metrics_on_disk, fh, indent=2)

    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()