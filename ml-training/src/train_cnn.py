"""Supervised CNN training utilities for mel/MFCC feature classifiers."""

from __future__ import annotations

import random
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn


def set_seed(seed: int) -> None:
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


class AudioFeatureCNN(nn.Module):
    """Small CNN classifier over (1, n_features, n_frames) feature maps."""

    def __init__(self, in_channels: int = 1, num_classes: int = 3) -> None:
        super().__init__()
        self.features = nn.Sequential(
            nn.Conv2d(in_channels, 16, kernel_size=3, stride=1, padding=1),
            nn.BatchNorm2d(16),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2),
            nn.Conv2d(16, 32, kernel_size=3, stride=1, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2),
            nn.Conv2d(32, 64, kernel_size=3, stride=1, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=True),
        )
        self.pool = nn.AdaptiveAvgPool2d((1, 1))
        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Linear(64, 64),
            nn.ReLU(inplace=True),
            nn.Dropout(0.3),
            nn.Linear(64, num_classes),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.features(x)
        x = self.pool(x)
        return self.classifier(x)


class FeatureDataset(torch.utils.data.Dataset):
    """Dataset over precomputed feature arrays with optional channel dimension."""

    def __init__(self, features: np.ndarray, labels: np.ndarray) -> None:
        if features.ndim == 3:
            features = features[:, None, :, :]
        self.features = torch.from_numpy(np.asarray(features, dtype=np.float32))
        self.labels = torch.from_numpy(np.asarray(labels, dtype=np.int64))

    def __len__(self) -> int:
        return len(self.labels)

    def __getitem__(self, index: int):
        return self.features[index], self.labels[index]


@dataclass
class TrainConfig:
    features: str
    output_dir: str
    epochs: int = 40
    patience: int = 7
    batch_size: int = 16
    lr: float = 1e-3
    weight_decay: float = 1e-4
    seed: int = 42
    train_frac: float = 0.7
    val_frac: float = 0.15


def _permuted_splits(n: int, config: TrainConfig) -> dict[str, np.ndarray]:
    rng = np.random.RandomState(config.seed)
    indices = rng.permutation(n)
    n_train = int(n * config.train_frac)
    n_val = int(n * config.val_frac)
    return {
        "train": indices[:n_train],
        "val": indices[n_train : n_train + n_val],
        "test": indices[n_train + n_val :],
    }


def load_data(config: TrainConfig):
    """Load an npz (X, y, class_names) into train/val/test FeatureDatasets.

    Returns (train_ds, val_ds, test_ds, splits) where splits maps split name
    to the index array used for that split. Splits are deterministic.
    """
    data = np.load(config.features, allow_pickle=True)
    x = data["X"].astype(np.float32)
    y = np.asarray(data["y"])
    class_names = list(np.asarray(data["class_names"]))

    splits = _permuted_splits(len(x), config)
    datasets: dict[str, FeatureDataset] = {}
    for name, idx in splits.items():
        datasets[name] = FeatureDataset(x[idx], y[idx])
    return datasets["train"], datasets["val"], datasets["test"], splits


def train_classifier(
    train_ds: FeatureDataset,
    val_ds: FeatureDataset,
    feature_kind: str,
    class_names: list[str],
    label_to_index: dict[str, int],
    feature_config: dict,
    output_dir: str | Path,
    epochs: int,
    patience: int,
    batch_size: int,
    lr: float,
    weight_decay: float,
    seed: int,
    device: str,
    test_ds: FeatureDataset | None = None,
    class_weights: torch.Tensor | None = None,
) -> dict:
    """Train the CNN and persist best_model.pt, metrics.json, label_map.json."""
    import json

    set_seed(seed)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    num_classes = len(class_names)
    model = AudioFeatureCNN(in_channels=1, num_classes=num_classes).to(device)
    optimizer = torch.optim.AdamW(
        model.parameters(), lr=lr, weight_decay=weight_decay
    )
    criterion = nn.CrossEntropyLoss(weight=class_weights) if class_weights is not None else nn.CrossEntropyLoss()
    test_loader = (
        torch.utils.data.DataLoader(test_ds, batch_size=batch_size)
        if test_ds is not None else None
    )

    train_loader = torch.utils.data.DataLoader(
        train_ds, batch_size=batch_size, shuffle=True
    )
    val_loader = torch.utils.data.DataLoader(val_ds, batch_size=batch_size)

    best_val_loss = float("inf")
    best_state = None
    best_epoch = 0
    patience_counter = 0
    history: list[dict] = []
    split_sizes = {
        "train": len(train_ds),
        "val": len(val_ds),
    }

    for epoch in range(1, epochs + 1):
        model.train()
        train_loss, train_correct, train_total = 0.0, 0, 0
        train_all_y, train_all_p = [], []
        for x, y in train_loader:
            x, y = x.to(device), y.to(device)
            optimizer.zero_grad()
            out = model(x)
            loss = criterion(out, y)
            loss.backward()
            optimizer.step()
            train_loss += loss.item() * len(y)
            train_correct += (out.argmax(1) == y).sum().item()
            train_total += len(y)
            train_all_y.extend(y.cpu().tolist())
            train_all_p.extend(out.detach().cpu().argmax(1).tolist())

        model.eval()
        val_loss, val_correct, val_total = 0.0, 0, 0
        val_all_y, val_all_p = [], []
        with torch.no_grad():
            for x, y in val_loader:
                x, y = x.to(device), y.to(device)
                out = model(x)
                loss = criterion(out, y)
                val_loss += loss.item() * len(y)
                val_correct += (out.argmax(1) == y).sum().item()
                val_total += len(y)
                val_all_y.extend(y.cpu().tolist())
                val_all_p.extend(out.detach().cpu().argmax(1).tolist())

        train_metrics = _classification_metrics(train_all_y, train_all_p)
        val_metrics = _classification_metrics(val_all_y, val_all_p)
        history.append(
            {
                "epoch": epoch,
                "train_loss": round(train_loss / max(train_total, 1), 6),
                "val_loss": round(val_loss / max(val_total, 1), 6),
                **{f"train_{k}": v for k, v in train_metrics.items()},
                **{f"val_{k}": v for k, v in val_metrics.items()},
            }
        )

        if val_loss < best_val_loss:
            best_val_loss = val_loss
            best_epoch = epoch
            best_state = {k: v.detach().cpu().clone() for k, v in model.state_dict().items()}
            patience_counter = 0
        else:
            patience_counter += 1
            if patience_counter >= patience:
                break

    model.load_state_dict(best_state)
    model.to(device)
    model.eval()

    if test_loader is not None:
        test_loss, test_metrics = _evaluate_test_classifier(model, test_loader, device)
    else:
        test_loss, test_metrics = _evaluate_test_classifier(model, val_loader, device)

    torch.save(
        {
            "state_dict": best_state,
            "num_classes": num_classes,
            "class_names": class_names,
            "label_to_index": label_to_index,
            "feature_kind": feature_kind,
            "feature_config": feature_config,
            "architecture": "AudioFeatureCNN",
        },
        output_dir / "best_model.pt",
    )

    metrics = {
        "device": device,
        "class_names": class_names,
        "label_to_index": label_to_index,
        "feature_config": feature_config,
        "split_sizes": split_sizes,
        "test_split_size": len(test_ds) if test_ds is not None else len(val_ds),
        "best_epoch": best_epoch,
        "test_loss": round(test_loss, 6),
        "test_metrics": {k: round(v, 6) for k, v in test_metrics.items()},
        "history": history,
    }
    with (output_dir / "metrics.json").open("w") as fh:
        json.dump(metrics, fh, indent=2)

    with (output_dir / "label_map.json").open("w") as fh:
        json.dump(label_to_index, fh, indent=2)

    return metrics


def _classification_metrics(y_true: list, y_pred: list) -> dict[str, float]:
    from sklearn.metrics import (
        accuracy_score,
        f1_score,
        precision_score,
        recall_score,
    )

    return {
        "accuracy": round(accuracy_score(y_true, y_pred), 6),
        "precision_macro": round(precision_score(y_true, y_pred, average="macro", zero_division=0), 6),
        "recall_macro": round(recall_score(y_true, y_pred, average="macro", zero_division=0), 6),
        "f1_macro": round(f1_score(y_true, y_pred, average="macro", zero_division=0), 6),
    }


def _evaluate_test_classifier(model, loader, device):
    import numpy as np

    criterion = nn.CrossEntropyLoss()
    total_loss, total = 0.0, 0
    all_y, all_p = [], []
    with torch.no_grad():
        for x, y in loader:
            x, y = x.to(device), y.to(device)
            out = model(x)
            total_loss += criterion(out, y).item() * len(y)
            total += len(y)
            all_y.extend(y.cpu().tolist())
            all_p.extend(out.argmax(1).cpu().tolist())
    return total_loss / max(total, 1), _classification_metrics(all_y, all_p) if all_y else {
        "accuracy": 0.0,
        "precision_macro": 0.0,
        "recall_macro": 0.0,
        "f1_macro": 0.0,
    }