#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Sync REAL TIMELINE/wa event.csv -> data/schedule/option_c_v0.8.0.json actuals.
Parses WA (work actual) events, groups by ACTIVITY ID (min start, max end),
writes actual.start_ts / actual.end_ts and sets state to "completed" where applicable.
SSOT: option_c_v0.8.0.json (contract v0.8.0). Other fields unchanged.
"""
from __future__ import annotations

import csv
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "REAL TIMELINE" / "wa event.csv"
TARGET = ROOT / "data" / "schedule" / "option_c_v0.8.0.json"
TIMEZONE_SUFFIX = "+04:00"  # Asia/Dubai per contract


def parse_wa_csv(path: Path) -> dict[str, tuple[str, str]]:
    """
    Parse TSV: for each ACTIVITY ID, return (earliest start_ts, latest end_ts) as ISO 8601.
    Skips rows where START DATE is '-' or empty.
    """
    # activity_id -> list of (start_ts, end_ts)
    by_id: dict[str, list[tuple[str, str]]] = {}

    with path.open(encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f, delimiter="\t")
        for row in reader:
            start_date = (row.get("START DATE") or "").strip()
            start_time = (row.get("START TIME") or "").strip()
            end_date = (row.get("END DATE") or "").strip()
            end_time = (row.get("END TIME") or "").strip()
            activity_id = (row.get("ACTIVITY ID") or "").strip()

            if not activity_id or start_date in ("-", "") or end_date in ("-", ""):
                continue

            # Normalize: "2026-01-24 0:00:00" -> date part; "11:34:00" -> time
            start_d = start_date.split()[0] if start_date else ""
            end_d = end_date.split()[0] if end_date else ""
            if not start_d or not end_d:
                continue

            start_ts = f"{start_d}T{start_time or '00:00:00'}{TIMEZONE_SUFFIX}"
            end_ts = f"{end_d}T{end_time or '23:59:59'}{TIMEZONE_SUFFIX}"

            # Ensure time has seconds
            if re.match(r"^\d{2}:\d{2}$", start_time or ""):
                start_ts = f"{start_d}T{(start_time or '00:00')}:00{TIMEZONE_SUFFIX}"
            if re.match(r"^\d{2}:\d{2}$", end_time or ""):
                end_ts = f"{end_d}T{(end_time or '23:59')}:59{TIMEZONE_SUFFIX}"

            by_id.setdefault(activity_id, []).append((start_ts, end_ts))

    # Collapse to one span per activity: min start, max end
    result: dict[str, tuple[str, str]] = {}
    for aid, spans in by_id.items():
        starts = [s[0] for s in spans]
        ends = [s[1] for s in spans]
        result[aid] = (min(starts), max(ends))
    return result


def main() -> None:
    if not SOURCE.is_file():
        print(f"SKIP: {SOURCE} not found")
        return

    actuals = parse_wa_csv(SOURCE)
    if not actuals:
        print("No valid activity rows in CSV")
        return

    data = json.loads(TARGET.read_text(encoding="utf-8"))
    entities = data.get("entities") or {}
    activities = entities.get("activities") or {}
    updated = 0

    for activity_id, (start_ts, end_ts) in actuals.items():
        if activity_id not in activities:
            continue
        act = activities[activity_id]
        if "actual" not in act:
            act["actual"] = {}
        act["actual"]["start_ts"] = start_ts
        act["actual"]["end_ts"] = end_ts
        if act.get("state") in ("planned", "ready", "in_progress", "paused", "blocked"):
            act["state"] = "completed"
        updated += 1

    TARGET.write_text(
        json.dumps(data, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    print(f"Synced WA events: {SOURCE.name} -> {TARGET.relative_to(ROOT)} (updated {updated} activities)")


if __name__ == "__main__":
    main()
