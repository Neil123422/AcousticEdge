from pathlib import Path
import sys

import numpy as np
import torch

sys.path.insert(0, str(Path(__file__).parents[1]))
from src.train_cnn import AudioFeatureCNN, FeatureDataset, TrainConfig, load_data, set_seed


def test_cnn_forward_shape():
    model = AudioFeatureCNN(in_channels=1, num_classes=3)
    inputs = torch.randn(4, 1, 32, 40)
    outputs = model(inputs)
    assert outputs.shape == (4, 3)


def test_feature_dataset_accepts_three_dimensional_features():
    dataset = FeatureDataset(np.zeros((5, 32, 40), dtype=np.float32), np.array([0, 1, 0, 1, 0]))
    features, label = dataset[0]
    assert features.shape == (1, 32, 40)
    assert label.item() == 0


def test_split_creation_is_deterministic(tmp_path):
    set_seed(42)
    features = np.random.randn(30, 32, 40).astype(np.float32)
    labels = np.repeat(np.arange(3), 10)
    path = tmp_path / "features.npz"
    np.savez(path, X=features, y=labels, class_names=np.array(["normal", "idler_fault", "unknown"]))
    config = TrainConfig(features=str(path), output_dir=str(tmp_path / "models"))
    _, _, _, splits_a = load_data(config)
    _, _, _, splits_b = load_data(config)
    for name in ("train", "val", "test"):
        assert np.array_equal(splits_a[name], splits_b[name])
        assert len(splits_a[name]) > 0
