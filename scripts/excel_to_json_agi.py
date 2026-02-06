#!/usr/bin/env python3
"""
Convert AGI TR Final Schedule Excel to option_c v0.8.0 JSON format.

Usage:
    python scripts/excel_to_json_agi.py [input.xlsx] [output.json]
    
Default:
    input: data/agi_tr_final_schedule.xlsx
    output: data/schedule/option_c_from_excel.json
"""

import json
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any

try:
    import pandas as pd
except ImportError:
    print("ERROR: pandas not found.")
    print("Install with: pip install pandas openpyxl")
    sys.exit(1)


def parse_date(date_val) -> str:
    """Parse date value to YYYY-MM-DD format."""
    if pd.isna(date_val):
        return None
    
    if isinstance(date_val, str):
        # Already string format
        return date_val[:10] if len(date_val) >= 10 else date_val
    
    # Convert datetime to string
    try:
        return pd.to_datetime(date_val).strftime('%Y-%m-%d')
    except:
        return str(date_val)[:10]


def assign_tr_unit(activity_id: str, level1: str, level2: str) -> tuple[str, str, list]:
    """
    Assign TR unit based on activity ID and levels.
    Returns: (tr_unit_id, trip_id, tr_ids_list)
    """
    if not activity_id:
        return ('OTHER', 'TRIP_00', [])
    
    # Check level1 first
    if level1 == 'MOBILIZATION':
        return ('MOBILIZATION', 'TRIP_00', [])
    elif level1 == 'DEMOBILIZATION':
        return ('DEMOBILIZATION', 'TRIP_00', [])
    
    # Check level2
    if level2 and 'AGI TR Unit' in level2:
        tr_num = level2.replace('AGI TR Unit ', '').strip()
        return (f'TR_{tr_num.zfill(2)}', f'TRIP_{tr_num.zfill(2)}', [f'TR_{tr_num.zfill(2)}'])
    
    # Parse from activity_id
    if activity_id.startswith('A1'):
        return ('TR_01', 'TRIP_01', ['TR_01'])
    elif activity_id.startswith('A2'):
        try:
            id_num = int(activity_id[1:])
            if 2000 <= id_num < 2100:
                if id_num in [2000, 2010, 2020]:
                    return ('DEMOBILIZATION', 'TRIP_00', [])
                return ('TR_02', 'TRIP_02', ['TR_02'])
            elif 2100 <= id_num < 2200:
                return ('TR_02', 'TRIP_02', ['TR_02'])
            elif 2200 <= id_num < 2400:
                return ('TR_03', 'TRIP_03', ['TR_03'])
            elif 2400 <= id_num < 2600:
                return ('TR_04', 'TRIP_04', ['TR_04'])
            elif 2600 <= id_num < 2700:
                return ('TR_05', 'TRIP_05', ['TR_05'])
            elif 2700 <= id_num < 2800:
                return ('TR_06', 'TRIP_06', ['TR_06'])
            elif 2800 <= id_num < 3000:
                return ('TR_07', 'TRIP_07', ['TR_07'])
        except:
            pass
    
    return ('OTHER', 'TRIP_00', [])


def excel_to_json(excel_path: Path, output_path: Path):
    """Convert Excel to Contract v0.8.0 JSON format."""
    print(f"Loading {excel_path}...")
    
    # Read Excel file
    try:
        xls = pd.ExcelFile(excel_path)
        print(f"Found sheets: {xls.sheet_names}")
        
        # Use first sheet
        sheet_name = xls.sheet_names[0]
        df = pd.read_excel(excel_path, sheet_name=sheet_name)
        print(f"Loaded {len(df)} rows from '{sheet_name}'")
        print(f"Columns: {list(df.columns)}")
        
    except Exception as e:
        print(f"ERROR reading Excel: {e}")
        raise
    
    # Initialize Contract v0.8.0 structure
    output = {
        "contract": {
            "name": "TR Dashboard SSOT",
            "version": "0.8.0",
            "timezone": "Asia/Dubai",
            "ssot": {
                "activity_is_source_of_truth": True,
                "derived_fields_read_only": True
            }
        },
        "policy": {
            "view_modes": ["live", "history", "approval", "compare"],
            "reflow": {
                "snap_direction": "forward",
                "tie_break": ["lock_level", "priority", "planned_start", "activity_id"],
                "calendar_granularity_min": 60
            }
        },
        "catalog": {
            "enums": {
                "activity_state": [
                    "draft", "planned", "ready", "in_progress",
                    "paused", "blocked", "completed", "canceled", "aborted"
                ],
                "lock_level": ["none", "soft", "hard", "baseline"],
                "blocker_code": [
                    "NONE", "WEATHER", "PTW", "CERT", "RESOURCE", "LINKSPAN", "BARGE"
                ],
                "dependency_type": ["FS", "SS", "FF", "SF"],
                "evidence_stage": ["before_start", "before_complete", "after_complete"],
                "collision_severity": ["minor", "major", "blocking"],
                "collision_kind": [
                    "dependency_cycle", "dependency_violation", "constraint_window_violation",
                    "resource_overallocated", "resource_unavailable", "spatial_conflict",
                    "baseline_conflict", "data_incomplete", "risk_hold"
                ]
            }
        },
        "entities": {
            "activities": {},
            "trips": {},
            "trs": {},
            "resources": {}
        },
        "collisions": [],
        "reflow_runs": [],
        "baselines": [],
        "history_events": []
    }
    
    # Convert activities to dictionary (Contract v0.8.0 requires dict, not array)
    activities_dict = {}
    activity_count = 0
    skipped_count = 0
    
    print("\nProcessing activities...")
    
    for idx, row in df.iterrows():
        # Get activity ID
        activity_id = row.get('Activity ID') or row.get('activity_id')
        
        # Skip rows without activity ID
        if pd.isna(activity_id) or str(activity_id).strip() == '':
            skipped_count += 1
            continue
        
        activity_id = str(activity_id).strip()
        
        # Get other fields
        activity_name = str(row.get('Activity Name', '') or row.get('activity_name', ''))
        planned_start = parse_date(row.get('Start Date') or row.get('planned_start'))
        planned_finish = parse_date(row.get('End Date') or row.get('planned_finish'))
        duration = row.get('Duration') or row.get('duration')
        level1 = str(row.get('Level 1', '') or row.get('level1', ''))
        level2 = str(row.get('Level 2', '') or row.get('level2', ''))
        
        # Parse duration
        try:
            duration = int(duration) if pd.notna(duration) else 0
        except:
            duration = 0
        
        # Assign TR unit, trip, and TR IDs
        tr_unit_id, trip_id, tr_ids = assign_tr_unit(activity_id, level1, level2)
        
        # Determine type_id based on level1
        type_id = "transport"
        if level1 == 'MOBILIZATION':
            type_id = "mobilization"
        elif level1 == 'DEMOBILIZATION':
            type_id = "demobilization"
        elif 'PREP' in activity_name.upper() or 'PREPARATION' in activity_name.upper():
            type_id = "preparation"
        elif 'LOAD' in activity_name.upper():
            type_id = "loading"
        elif 'UNLOAD' in activity_name.upper() or 'OFFLOAD' in activity_name.upper():
            type_id = "offloading"
        
        # Convert dates to ISO 8601 timestamps (with Asia/Dubai timezone)
        start_ts = f"{planned_start}T00:00:00+04:00" if planned_start else None
        end_ts = f"{planned_finish}T23:59:59+04:00" if planned_finish else None
        duration_min = duration * 1440  # Convert days to minutes
        
        # Build activity object (Contract v0.8.0 format)
        activity = {
            "activity_id": activity_id,
            "type_id": type_id,
            "trip_id": trip_id,
            "tr_ids": tr_ids,
            "tr_unit_id": tr_unit_id,
            "title": activity_name,
            "state": "planned",
            "lock_level": "none",
            "blocker_code": None,
            "blocker_detail": {},
            "evidence_required": [],
            "evidence_ids": [],
            "reflow_pins": [],
            "plan": {
                "start_ts": start_ts,
                "end_ts": end_ts,
                "duration_min": duration_min,
                "duration_mode": "work",
                "location": {
                    "from_location_id": None,
                    "to_location_id": None,
                    "route_id": None,
                    "geo_fence_ids": []
                },
                "dependencies": [],
                "resources": [],
                "constraints": [],
                "notes": ""
            },
            "actual": {
                "start_ts": None,
                "end_ts": None,
                "progress_pct": 0,
                "location_override": None,
                "resource_assignments": [],
                "notes": ""
            },
            "calc": {
                "es_ts": start_ts,
                "ef_ts": end_ts,
                "ls_ts": start_ts,
                "lf_ts": end_ts,
                "tf_min": 0,
                "ff_min": 0
            },
            "meta": {
                "tags": [],
                "notes": "",
                "external_refs": {},
                "level1": level1,
                "level2": level2
            }
        }
        
        activities_dict[activity_id] = activity
        activity_count += 1
        
        if activity_count % 100 == 0:
            print(f"  Processed {activity_count} activities...")
    
    output["entities"]["activities"] = activities_dict
    
    print(f"\nConversion summary:")
    print(f"  Total rows: {len(df)}")
    print(f"  Activities created: {activity_count}")
    print(f"  Rows skipped: {skipped_count}")
    
    # Group by TR unit
    tr_counts = {}
    for activity_id, activity in activities_dict.items():
        tr_unit_id = activity.get('tr_unit_id', 'OTHER')
        tr_counts[tr_unit_id] = tr_counts.get(tr_unit_id, 0) + 1
    
    print(f"\nTR Unit distribution:")
    for tr_unit_id in sorted(tr_counts.keys()):
        print(f"  {tr_unit_id}: {tr_counts[tr_unit_id]} activities")
    
    # Write JSON
    print(f"\nWriting {output_path}...")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    
    file_size = output_path.stat().st_size / 1024
    print(f"\n[SUCCESS] Conversion complete!")
    print(f"   Output: {output_path}")
    print(f"   Size: {file_size:.1f} KB")
    print(f"   Activities: {activity_count}")


def main():
    """Main entry point."""
    # Parse arguments
    if len(sys.argv) > 2:
        input_path = Path(sys.argv[1])
        output_path = Path(sys.argv[2])
    elif len(sys.argv) > 1:
        input_path = Path(sys.argv[1])
        output_path = Path("data/schedule/option_c_from_excel.json")
    else:
        input_path = Path("data/agi_tr_final_schedule.xlsx")
        output_path = Path("data/schedule/option_c_from_excel.json")
    
    # Verify input exists
    if not input_path.exists():
        print(f"ERROR: Input file not found: {input_path}")
        print(f"\nUsage: python scripts/excel_to_json_agi.py [input.xlsx] [output.json]")
        sys.exit(1)
    
    # Convert
    try:
        excel_to_json(input_path, output_path)
        return 0
    except Exception as e:
        print(f"\n[ERROR] Conversion failed: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
