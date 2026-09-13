"""Batch preprocessing: raw audio -> windowed features -> features.npz."""

from __future__ import annotations

import argparse
import csv
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import soundfile as sf
import librosa

from src.preprocess_audio import (
    FeatureConfig,
    extract_feature,
    load_audio,
    quality_flags,
    to_config_dict,
)


@dataclass
class WindowedSample:
    file_name: str
    session_id: str
    conveyor_id: str
    label_code: str
    windows: list[np.ndarray]
    window_flags: list[list[str]]
    duration_seconds: float


def load_full_audio(path: Path, sample_rate: int) -> np.ndarray:
    try:
        samples, native_sr = sf.read(path, dtype="float32", always_2d=False)
        samples = samples.astype(np.float32)
        if samples.ndim > 1:
            samples = samples.mean(axis=1)
        if native_sr != sample_rate:
            samples = librosa.resample(samples, orig_sr=native_sr, target_sr=sample_rate)
    except Exception:
        samples, native_sr = librosa.load(path, sr=None, mono=True)
        samples = samples.astype(np.float32)
        if native_sr != sample_rate:
            samples = librosa.resample(samples, orig_sr=native_sr, target_sr=sample_rate)
    return samples.astype(np.float32)


def window_audio(
    samples: np.ndarray,
    config: FeatureConfig,
    overlap: float = 0.5,
) -> list[np.ndarray]:
    """Split audio into overlapping windows of duration_seconds."""
    win = config.target_samples
    step = max(1, int(win * (1.0 - overlap)))
    windows: list[np.ndarray] = []
    start = 0
    while start <= len(samples) - 1 and len(windows) < 1000:
        seg = samples[start : start + win]
        if seg.size < win:
            seg = np.pad(seg, (0, win - seg.size))
        windows.append(seg)
        if start + win >= len(samples):
            break
        start += step
    return windows


def preprocess_to_npz(
    manifest_path: Path,
    audio_root: Path,
    npz_out: Path,
    feature_kind: str = "logmel",
    window_seconds: float = 4.0,
    overlap: float = 0.5,
) -> dict:
    """Convert manifest rows into a features.npz with window metadata."""
    import json

    config = FeatureConfig(feature_kind=feature_kind, duration_seconds=window_seconds)
    with manifest_path.open("r", newline="", encoding="utf-8-sig") as fh:
        rows = list(csv.DictReader(fh))

    sample_rows: list[WindowedSample] = []
    for row in rows:
        path = audio_root / row.get("file_name", "")
        if not path.exists():
            continue
        full = load_full_audio(path, config.sample_rate)
        windows = window_audio(full, config, overlap)
        if not windows:
            continue
        features = [extract_feature(w, config) for w in windows]
        flags = [quality_flags(w, config) for w in windows]
        sample_rows.append(
            WindowedSample(
                file_name=row.get("file_name", ""),
                session_id=row.get("session_id", "") or row.get("file_name", "session"),
                conveyor_id=row.get("conveyor_id", ""),
                label_code=row.get("label_code", "normal"),
                windows=features,
                window_flags=flags,
                duration_seconds=len(full) / config.sample_rate,
            )
        )

    X = np.stack([w for s in sample_rows for w in s.windows])
    window_of_sample = np.concatenate(
        [np.full(len(s.windows), i) for i, s in enumerate(sample_rows)]
    )
    file_names = [s.file_name for s in sample_rows]
    sessions = [s.session_id for s in sample_rows]
    labels = [s.label_code for s in sample_rows]
    sample_flags = [s.window_flags for s in sample_rows]
    durations = [s.duration_seconds for s in sample_rows]

    npz_out.parent.mkdir(parents=True, exist_ok=True)
    np.savez(
        npz_out,
        X=X,
        window_of_sample=window_of_sample,
        file_names=np.asarray(file_names, dtype=object),
        sessions=np.asarray(sessions, dtype=object),
        labels=np.asarray(labels, dtype=object),
        sample_flags=np.asarray(sample_flags, dtype=object),
        durations=np.asarray(durations),
        feature_config=np.asarray([json.dumps(to_config_dict(config))]),
    )
    return {
        "n_samples": len(sample_rows),
        "n_windows": len(X),
        "feature_shape": X[0].shape if len(X) else None,
        "feature_kind": feature_kind,
        "feature_config": to_config_dict(config),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Batch preprocess audio to features.npz")
    parser.add_argument("--manifest", required=True, type=Path)
    parser.add_argument("--audio-root", required=True, type=Path)
    parser.add_argument("--npz-out", required=True, type=Path)
    parser.add_argument("--feature-kind", choices=["logmel", "mfcc"], default="logmel")
    parser.add_argument("--window-seconds", type=float, default=4.0)
    parser.add_argument("--overlap", type=float, default=0.5)
    args = parser.parse_args()

    summary = preprocess_to_npz(
        args.manifest,
        args.audio_root,
        args.npz_out,
        feature_kind=args.feature_kind,
        window_seconds=args.window_seconds,
        overlap=args.overlap,
    )
    print(summary)


if __name__ == "__main__":
    main()