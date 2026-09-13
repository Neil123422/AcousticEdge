from pathlib import Path
import sys

import numpy as np
import soundfile as sf

sys.path.insert(0, str(Path(__file__).parents[1]))
from src.preprocess_audio import FeatureConfig, extract_feature, load_audio, quality_flags


def test_logmel_and_mfcc_shapes():
    config = FeatureConfig(duration_seconds=1.0)
    audio = np.sin(np.linspace(0, 2 * np.pi * 440, config.target_samples)).astype(np.float32)
    logmel = extract_feature(audio, config)
    mfcc = extract_feature(audio, FeatureConfig(duration_seconds=1.0, feature_kind="mfcc"))
    assert logmel.shape == (config.n_mels, config.target_frames)
    assert mfcc.shape == (config.n_mfcc, config.target_frames)
    assert np.isfinite(logmel).all()
    assert np.isfinite(mfcc).all()


def test_audio_load_and_quality_flags(tmp_path):
    path = tmp_path / "tone.wav"
    config = FeatureConfig(duration_seconds=1.0)
    audio = np.zeros(config.target_samples // 2, dtype=np.float32)
    sf.write(path, audio, config.sample_rate)
    loaded = load_audio(path, config)
    flags = quality_flags(loaded, config)
    assert loaded.shape == (config.target_samples,)
    assert "near_silence" in flags
