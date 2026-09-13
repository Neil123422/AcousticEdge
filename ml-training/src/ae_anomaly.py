"""Normal-only convolutional autoencoder for anomaly scoring."""

from __future__ import annotations

import torch
import torch.nn as nn
import torch.nn.functional as F


class ConvAutoencoder(nn.Module):
    """Conv autoencoder over (1, n_features, n_frames) feature maps.

    Reconstruction error per window is the anomaly score.
    """

    def __init__(self, base_channels: int = 16) -> None:
        super().__init__()
        self.encoder = nn.Sequential(
            nn.Conv2d(1, base_channels, 3, stride=2, padding=1),
            nn.ReLU(inplace=True),
            nn.Conv2d(base_channels, base_channels * 2, 3, stride=2, padding=1),
            nn.ReLU(inplace=True),
            nn.Conv2d(base_channels * 2, base_channels * 4, 3, stride=2, padding=1),
            nn.ReLU(inplace=True),
        )
        self.decoder = nn.Sequential(
            nn.ConvTranspose2d(
                base_channels * 4, base_channels * 2, 3, stride=2, padding=1, output_padding=1
            ),
            nn.ReLU(inplace=True),
            nn.ConvTranspose2d(
                base_channels * 2, base_channels, 3, stride=2, padding=1, output_padding=1
            ),
            nn.ReLU(inplace=True),
            nn.ConvTranspose2d(base_channels, 1, 3, stride=2, padding=1, output_padding=1),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        h = self.encoder(x)
        y = self.decoder(h)
        return y[..., : x.shape[-2], : x.shape[-1]]


def window_reconstruction_error(model: nn.Module, x: torch.Tensor) -> torch.Tensor:
    """Per-window MSE between input and reconstruction (flattened)."""
    with torch.no_grad():
        model.eval()
        x_hat = model(x)
        err = torch.mean((x - x_hat) ** 2, dim=(1, 2, 3))
    return err