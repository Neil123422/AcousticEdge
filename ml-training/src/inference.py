"""FastAPI inference service for the conveyor acoustic classifier.

Run as: python -m uvicorn src.inference:app --host 0.0.0.0 --port 8000
"""

from __future__ import annotations

import io
import json
import tempfile
from pathlib import Path

import numpy as np
import torch

from src.features import window_audio
from src.preprocess_audio import FeatureConfig, extract_feature, quality_flags
from src.train_cnn import AudioFeatureCNN

MODEL_DIR = Path("models/classifier")

feature_config = FeatureConfig(duration_seconds=4.0, feature_kind="logmel")

_CONFIDENCE_REVIEW = 0.55


def _load_audio_bytes(data: bytes, config: FeatureConfig) -> np.ndarray:
    from src.preprocess_audio import load_audio

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp.write(data)
        tmp.flush()
        path = Path(tmp.name)
    try:
        return load_audio(path, config)
    finally:
        path.unlink(missing_ok=True)


def _load_model(model_dir: Path) -> tuple:
    checkpoint = torch.load(
        model_dir / "best_model.pt", map_location="cpu", weights_only=False
    )
    state = checkpoint["model"] if isinstance(checkpoint, dict) and "model" in checkpoint else checkpoint
    label_map_path = model_dir / "label_map.json"
    label_to_index = json.loads(label_map_path.read_text(encoding="utf-8"))
    index_to_label = {int(v): k for k, v in label_to_index.items()}
    num_classes = len(index_to_label)
    model = AudioFeatureCNN(in_channels=1, num_classes=num_classes)
    model.load_state_dict(state["state_dict"] if isinstance(state, dict) and "state_dict" in state else state)
    model.eval()
    return model, index_to_label


def _load_normalize(model_dir: Path) -> tuple[np.ndarray, np.ndarray]:
    norm_path = model_dir / "normalize.json"
    if not norm_path.exists():
        return np.zeros((1, 64, 251), dtype=np.float32), np.ones((1, 64, 251), dtype=np.float32)
    data = json.loads(norm_path.read_text(encoding="utf-8"))
    mean = np.asarray(data["mean"], dtype=np.float32).reshape(1, 64, 251)
    std = np.asarray(data["std"], dtype=np.float32).reshape(1, 64, 251)
    return mean, std


def _classify_windows(model, features: np.ndarray, mean: np.ndarray, std: np.ndarray) -> np.ndarray:
    x = features[:, None, :, :].astype(np.float32)
    x = (x - mean) / std
    with torch.no_grad():
        logits = model(torch.from_numpy(x))
        probs = torch.softmax(logits, dim=1).numpy()
    return probs


def _quality_unknown(window_flags: list[list[str]], duration: float) -> bool:
    if duration < 3.0:
        return True
    for flags in window_flags:
        if "near_silence" in flags or "clipping" in flags:
            return True
    return False


def analyze_audio(
    audio_wav: bytes,
    model_dir: Path = MODEL_DIR,
) -> dict:
    """Run the classifier on an uploaded WAV file."""
    model, index_to_label = _load_model(model_dir)
    mean, std = _load_normalize(model_dir)
    norm_data = json.loads((model_dir / "normalize.json").read_text(encoding="utf-8"))
    feature_cfg = norm_data.get("feature_config") or {}
    model_version = norm_data.get("model_version", "BENCHMARK-CNN-v1")

    samples = _load_audio_bytes(audio_wav, feature_config)
    duration = len(samples) / feature_config.sample_rate
    windows = window_audio(samples, feature_config, 0.5)
    features = np.stack([extract_feature(w, feature_config) for w in windows])
    flags = [quality_flags(w, feature_config) for w in windows]

    if _quality_unknown(flags, duration):
        return {
            "risk": "review",
            "score": 0.52,
            "signalQuality": "Needs review",
            "summary": "Recording below the quality gate (too short, silent, or clipped).",
            "recommendation": "Retake the sample from the approved measurement point.",
            "model": "signal-quality-gate",
            "model_version": model_version,
            "features": ["quality-gate"],
            "threshold_review": None,
            "threshold_critical": None,
            "window_errors": [],
            "disclaimer": feature_cfg,
        }

    probs = _classify_windows(model, features, mean, std)
    mean_probs = probs.mean(axis=0)
    pred_idx = int(np.argmax(mean_probs))
    pred_label = index_to_label[pred_idx]
    confidence = float(mean_probs[pred_idx])

    if pred_label == "abnormal":
        risk = "critical"
    elif confidence < _CONFIDENCE_REVIEW:
        risk = "review"
    else:
        risk = "normal"

    return {
        "risk": risk,
        "score": round(confidence, 3),
        "signalQuality": "Good" if risk == "normal" else "Fair",
        "summary": (
            "Normal conveyor operation."
            if pred_label == "normal"
            else "Detected abnormal acoustic pattern. "
            "This is a prototype screen, not a confirmed fault."
        ),
        "recommendation": (
            "No action needed. Record regularly following the inspection protocol."
            if risk == "normal"
            else "Request authorized inspection; do not approach moving machinery."
        ),
        "model": model_version,
        "model_version": model_version,
        "predicted_class": pred_label,
        "class_probs": {index_to_label[i]: round(float(p), 4) for i, p in enumerate(mean_probs)},
        "features": [feature_cfg.get("feature_kind", "logmel")],
        "threshold_review": _CONFIDENCE_REVIEW,
        "threshold_critical": None,
        "window_errors": [],
        "disclaimer": "BENCHMARK model - trained on public ToyConveyor audio; "
                      "not plant-validated. Recalibrate with field data.",
    }


try:
    from fastapi import FastAPI, File, Form, UploadFile

    app = FastAPI(title="Conveyor Sentinel Inference", version="cnn")

    @app.get("/health")
    def health() -> dict:
        return {"ok": True}

    @app.get("/model-info")
    def model_info() -> dict:
        norm_path = MODEL_DIR / "normalize.json"
        data = json.loads(norm_path.read_text(encoding="utf-8")) if norm_path.exists() else {}
        label_path = MODEL_DIR / "label_map.json"
        labels = json.loads(label_path.read_text(encoding="utf-8")) if label_path.exists() else {}
        return {
            "model_version": data.get("model_version", "BENCHMARK-CNN-v1"),
            "architecture": "AudioFeatureCNN (2-class supervised classifier)",
            "feature_config": data.get("feature_config"),
            "labels": labels,
        }

    @app.post("/inspect")
    def inspect(
        file: UploadFile = File(...),
        conveyor_id: str = Form(""),
    ) -> dict:
        data = file.file.read()
        result = analyze_audio(data)
        result["conveyor_id"] = conveyor_id
        return result

except ImportError:
    pass