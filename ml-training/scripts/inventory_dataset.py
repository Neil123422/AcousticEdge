#!/usr/bin/env python3
"""Scan data/raw for audio files and emit prefilled metadata + manifest CSVs.

Idempotent: existing manifest rows are preserved, only new files are added.
Prefills what can be derived (sample_id tail, checksum, recorded_at, and
conveyor/label/session when the filename follows the convention
YYYY-MM-DD_CONVEYORID_LABEL_SESSION.ext). Fill the remaining columns later.

Usage:
    python scripts/inventory_dataset.py [--raw-dir data/raw]
        [--metadata-dir data/metadata] [--prefix SAMPLE]
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import re
from datetime import datetime
from pathlib import Path

AUDIO_EXTENSIONS = {".wav", ".mp3", ".m4a", ".flac", ".ogg", ".aac", ".opus", ".webm"}

NAME_PATTERN = re.compile(r"^(\d{4}-\d{2}-\d{2})_([A-Za-z0-9\-]+)_(.+)_(\d+)$")

METADATA_COLUMNS = [
    "sample_id",
    "file_name",
    "recorded_at",
    "conveyor_id",
    "plant_id",
    "operator_id_or_code",
    "fault_label",
    "fault_severity",
    "label_confidence",
    "belt_speed_mps",
    "load_condition",
    "material_type",
    "microphone_position",
    "microphone_device",
    "phone_model",
    "ambient_noise",
    "weather_or_environment",
    "maintenance_state",
    "technician_reviewer",
    "safety_approval",
    "notes",
]

MANIFEST_COLUMNS = [
    "sample_id",
    "file_name",
    "split",
    "session_id",
    "conveyor_id",
    "label_code",
    "quality_status",
    "source_path",
    "checksum",
    "review_status",
    "model_use",
    "notes",
]


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def parse_name(file_name: str) -> dict[str, str]:
    match = NAME_PATTERN.match(Path(file_name).stem)
    if not match:
        return {}
    date, conveyor, label, session = match.groups()
    return {
        "recorded_at": datetime.strptime(date, "%Y-%m-%d").isoformat(),
        "conveyor_id": conveyor,
        "label_code": label,
        "session_id": f"SESSION-{session:>04}",
    }


def load_existing(path: Path) -> dict[str, dict[str, str]]:
    if not path.exists():
        return {}
    with path.open("r", newline="", encoding="utf-8-sig") as fh:
        return {row["file_name"]: row for row in csv.DictReader(fh)}


def write_csv(path: Path, columns: list[str], rows: list[dict[str, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=columns)
        writer.writeheader()
        for row in rows:
            writer.writerow({col: row.get(col, "") for col in columns})


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--raw-dir", type=Path, default=Path("data/raw"))
    parser.add_argument("--metadata-dir", type=Path, default=Path("data/metadata"))
    parser.add_argument("--prefix", default="SAMPLE")
    args = parser.parse_args()

    raw_dir = args.raw_dir
    metadata_dir = args.metadata_dir
    if not raw_dir.exists():
        parser.error(f"{raw_dir} does not exist")

    files = sorted(
        p for p in raw_dir.rglob("*") if p.is_file() and p.suffix.lower() in AUDIO_EXTENSIONS
    )
    if not files:
        print(f"No audio files found under {raw_dir}.")
        return

    manifest_path = metadata_dir / "dataset-manifest.csv"
    metadata_path = metadata_dir / "recording-metadata.csv"
    existing = load_existing(manifest_path)

    manifest_rows: list[dict[str, str]] = []
    metadata_rows: list[dict[str, str]] = []
    next_index = 1

    known_indices = set()
    for row in existing.values():
        idx = re.fullmatch(rf"^{re.escape(args.prefix)}-(\d+)$", row.get("sample_id", ""))
        if idx:
            known_indices.add(int(idx.group(1)))
    known_indices_below = {i for i in known_indices}
    if known_indices_below:
        next_index = max(known_indices_below) + 1

    for path in files:
        rel = path.relative_to(raw_dir).as_posix()
        name = rel
        existing_row = existing.get(name, {})
        if existing_row:
            existing_row["source_path"] = rel
            existing_row["checksum"] = existing_row.get("checksum") or sha256(path)
            manifest_rows.append(existing_row)
            metadata_rows.append({col: existing_row.get(col, "") for col in METADATA_COLUMNS})
            continue

        parsed = parse_name(name)
        sample_id = f"{args.prefix}-{next_index:04d}"
        next_index += 1

        manifest_rows.append(
            {
                "sample_id": sample_id,
                "file_name": rel,
                "split": "",
                "session_id": parsed.get("session_id", ""),
                "conveyor_id": parsed.get("conveyor_id", ""),
                "label_code": parsed.get("label_code", "normal"),
                "quality_status": "",
                "source_path": rel,
                "checksum": sha256(path),
                "review_status": "",
                "model_use": "train",
                "notes": "",
            }
        )
        metadata_rows.append(
            {
                "sample_id": sample_id,
                "file_name": name,
                "recorded_at": parsed.get("recorded_at", ""),
                "conveyor_id": parsed.get("conveyor_id", ""),
                "plant_id": "",
                "operator_id_or_code": "",
                "fault_label": parsed.get("label_code", "normal"),
                "fault_severity": "none",
                "label_confidence": "high",
                "belt_speed_mps": "",
                "load_condition": "",
                "material_type": "",
                "microphone_position": "",
                "microphone_device": "",
                "phone_model": "",
                "ambient_noise": "",
                "weather_or_environment": "",
                "maintenance_state": "",
                "technician_reviewer": "",
                "safety_approval": "",
                "notes": "",
            }
        )

    write_csv(manifest_path, MANIFEST_COLUMNS, manifest_rows)
    write_csv(metadata_path, METADATA_COLUMNS, metadata_rows)
    print(f"Scanned {len(files)} audio files under {raw_dir}")
    print(f"Wrote {manifest_path} ({len(manifest_rows)} rows)")
    print(f"Wrote {metadata_path} ({len(metadata_rows)} rows)")
    print("Next: fill conveyor_id, session_id, phone_model, mic position, belt speed/load.")
    print("Then run `python scripts/build_manifest.py --split-by session` to assign splits.")


if __name__ == "__main__":
    main()