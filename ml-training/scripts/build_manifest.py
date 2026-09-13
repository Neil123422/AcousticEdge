#!/usr/bin/env python3
"""Assign session-level train/val/test splits to the dataset manifest.

Splits are assigned per SESSION (never splitting a session across splits) so
audio recorded during one visit stays in one bucket - standard practice to
avoid leakage when the normal-only autoencoder batches windows by session.

Session picks are deterministic, so re-running is idempotent for a given
manifest. Sessions that already carry a valid split are left untouched;
only unassigned sessions get new splits. By default the most uncertain
sessions are kept for test, the next-most for validation, rest for training.

Usage:
    python scripts/build_manifest.py --split-by session
        [--manifest data/metadata/dataset-manifest.csv]
        [--test-count 1] [--val-count 1]
        [--seed 42]
"""

from __future__ import annotations

import argparse
import csv
import random
import re
from collections import OrderedDict
from pathlib import Path

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

VALID_SPLITS = {"train", "val", "test"}


def session_uncertainty(session_rows: list[dict[str, str]]) -> int:
    """Score a session for how likely its clips were collected from mixed sources.

    Prototype placeholders carry a PROTOTYPE note; treat those (worst-case)
    as most likely to need test/val scrutiny.
    """
    score = 0
    for row in session_rows:
        notes = row.get("notes", "").lower()
        if "prototype" in notes:
            score += 10
        if row.get("label_code", "") == "":
            score += 1
        if row.get("quality_status", "").lower() in {"unknown", ""}:
            score += 1
    return score


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, default=Path("data/metadata/dataset-manifest.csv"))
    parser.add_argument("--split-by", choices=["session", "random"], default="session")
    parser.add_argument("--test-count", type=int, default=1)
    parser.add_argument("--val-count", type=int, default=1)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    if not args.manifest.exists():
        parser.error(f"{args.manifest} does not exist")

    with args.manifest.open("r", newline="", encoding="utf-8-sig") as fh:
        rows = list(csv.DictReader(fh))

    if not rows:
        print("Manifest is empty; nothing to split.")
        return

    sessions: "OrderedDict[str, list[dict[str, str]]]" = OrderedDict()
    for row in rows:
        session_id = row.get("session_id", "").strip() or "SESSION-UNASSIGNED"
        sessions.setdefault(session_id, []).append(row)

    from collections import Counter

    existing_split_of_session: dict[str, str] = {}
    for session_id, session_rows in sessions.items():
        assigned = [r.get("split", "") for r in session_rows if r.get("split", "") in VALID_SPLITS]
        if assigned:
            existing_split_of_session[session_id] = Counter(assigned).most_common(1)[0][0]

    session_ids = list(sessions.keys())
    orders = sorted(session_ids, key=lambda sid: session_uncertainty(sessions[sid]), reverse=True)

    unassigned = [sid for sid in orders if sid not in existing_split_of_session]
    assigned_ids = [
        sid for sid in orders if sid in existing_split_of_session
    ]  # keep deterministic order

    if args.split_by == "random":
        rng = random.Random(args.seed)
        rng.shuffle(unassigned)
        rng.shuffle(assigned_ids)

    orders = unassigned + assigned_ids

    test_ids = set(orders[: args.test_count])
    val_ids = set(orders[args.test_count : args.test_count + args.val_count])

    split_of_session = {
        sid: ("test" if sid in test_ids else "val" if sid in val_ids else "train")
        for sid in session_ids
    }
    split_of_session.update(existing_split_of_session)

    updates = 0
    for row in rows:
        session_id = row.get("session_id", "").strip() or "SESSION-UNASSIGNED"
        new_split = split_of_session[session_id]
        if row.get("split", "") != new_split:
            row["split"] = new_split
            updates += 1

    with args.manifest.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=MANIFEST_COLUMNS, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            writer.writerow({col: row.get(col, "") for col in MANIFEST_COLUMNS})

    counts: dict[str, int] = {}
    for row in rows:
        split = row.get("split", "")
        counts[split] = counts.get(split, 0) + 1

    print(f"Assigned splits across {len(sessions)} sessions: {dict(counts)}")
    print(f"Sessions updated: {updates}")
    for split in VALID_SPLITS:
        print(f"  {split}: {counts.get(split, 0)} samples")


if __name__ == "__main__":
    main()