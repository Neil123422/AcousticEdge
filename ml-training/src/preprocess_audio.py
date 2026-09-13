"""Audio loading, quality gating, and feature extraction for conveyor acoustics."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
import librosa
import soundfile as sf


@dataclass
class FeatureConfig:
    sample_rate: int = 16_000
    duration_seconds: float = 4.0
    n_fft: int = 1024
    hop_length: int = 256
    n_mels: int = 64
    n_mfcc: int = 40
    feature_kind: str = "logmel"
    quality_threshold_silence_rms: float = 1e-4
    quality_threshold_clip_peak: float = 0.999

    @property
    def target_samples(self) -> int:
        return int(self.sample_rate * self.duration_seconds)

    @property
    def target_frames(self) -> int:
        return 1 + int(np.floor(self.target_samples / self.hop_length))


def to_config_dict(config: FeatureConfig) -> dict:
    return {
        "sample_rate": config.sample_rate,
        "duration_seconds": config.duration_seconds,
        "n_fft": config.n_fft,
        "hop_length": config.hop_length,
        "n_mels": config.n_mels,
        "n_mfcc": config.n_mfcc,
        "feature_kind": config.feature_kind,
    }


def load_audio(
    path: str | Path,
    config: FeatureConfig,
) -> np.ndarray:
    """Load audio as float32 mono at the configured sample rate.

    Resamples when needed and pads or trims to exactly target_samples.
    """
    path = Path(path)
    try:
        samples, native_sr = sf.read(path, dtype="float32", always_2d=False)
        samples = samples.astype(np.float32)
        if samples.ndim > 1:
            samples = samples.mean(axis=1)
        if native_sr != config.sample_rate:
            samples = librosa.resample(
                samples, orig_sr=native_sr, target_sr=config.sample_rate
            )
    except Exception:
        samples, native_sr = librosa.load(path, sr=None, mono=True)
        samples = samples.astype(np.float32)
        if native_sr != config.sample_rate:
            samples = librosa.resample(
                samples, orig_sr=native_sr, target_sr=config.sample_rate
            )

    target = config.target_samples
    if samples.size < target:
        pad = target - samples.size
        samples = np.pad(samples, (0, pad))
    elif samples.size > target:
        samples = samples[:target]
    return samples.astype(np.float32)


def quality_flags(samples: np.ndarray, config: FeatureConfig) -> list[str]:
    """Return quality flags for a fixed-length clip."""
    flags: list[str] = []
    rms = float(np.sqrt(np.mean(np.square(samples, dtype=np.float64))))
    if rms < config.quality_threshold_silence_rms:
        flags.append("near_silence")
    peak = float(np.max(np.abs(samples))) if samples.size else 0.0
    if peak >= config.quality_threshold_clip_peak:
        flags.append("clipping")
    if samples.size == 0:
        flags.append("empty")
    return flags


def extract_feature(
    samples: np.ndarray,
    config: FeatureConfig,
) -> np.ndarray:
    """Extract a log-mel or MFCC feature matrix of shape (n_features, frames)."""
    if config.feature_kind == "mfcc":
        feat = librosa.feature.mfcc(
            y=samples,
            sr=config.sample_rate,
            n_mfcc=config.n_mfcc,
            n_fft=config.n_fft,
            hop_length=config.hop_length,
        )
    else:
        spec = librosa.feature.melspectrogram(
            y=samples,
            sr=config.sample_rate,
            n_fft=config.n_fft,
            hop_length=config.hop_length,
            n_mels=config.n_mels,
        )
        feat = librosa.power_to_db(spec, ref=1.0, top_db=None)
    return feat.astype(np.float32)