from pathlib import Path
import csv
import subprocess
import sys

import numpy as np
import soundfile as sf

ROOT = Path(__file__).parents[1]
WORK = ROOT / "tests" / ".smoke-training"
AUDIO = WORK / "audio"
MANIFEST = WORK / "manifest.csv"
OUTPUT = WORK / "output"

WORK.mkdir(exist_ok=True)
AUDIO.mkdir(exist_ok=True)
rows = []
labels = ["normal", "idler_fault", "unknown"]
splits = ["train", "val", "test"]
for index in range(9):
    label = labels[index % len(labels)]
    split = splits[index % len(splits)]
    file_name = f"sample_{index:02d}.wav"
    t = np.linspace(0, 0.5, 8000, endpoint=False)
    frequency = 220 + (index % 3) * 80
    sf.write(AUDIO / file_name, (0.2 * np.sin(2 * np.pi * frequency * t)).astype(np.float32), 16000)
    rows.append({"sample_id": f"S{index:03d}", "file_name": file_name, "session_id": f"SESSION-{index:03d}", "conveyor_id": "CV-01", "label_code": label, "split": split})

with MANIFEST.open("w", newline="", encoding="utf-8") as handle:
    writer = csv.DictWriter(handle, fieldnames=rows[0].keys())
    writer.writeheader()
    writer.writerows(rows)

subprocess.run([
    sys.executable, "-m", "src.train_audio_cnn",
    "--metadata", str(MANIFEST),
    "--audio-root", str(AUDIO),
    "--output-dir", str(OUTPUT),
    "--epochs", "2",
    "--patience", "1",
    "--batch-size", "3",
], cwd=ROOT, check=True)

assert (OUTPUT / "best_model.pt").exists()
assert (OUTPUT / "metrics.json").exists()
assert (OUTPUT / "label_map.json").exists()
print("Integrated training smoke test: PASS")
