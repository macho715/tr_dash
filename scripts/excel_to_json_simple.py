#!/usr/bin/env python3
"""
Convert AGI TR Final Schedule Excel to legacy option_c.json format (activities array).

This format is compatible with the dashboard's schedule-data.ts loader.

Usage:
    python scripts/excel_to_json_simple.py [input.xlsx] [output.json]
"""

import json
import sys
from pathlib import Path
from typing import Any, Dict, List

try:
    import pandas as pd
except ImportError:
    print("ERROR: pandas not found.")
    print("Install with: pip install pandas openpyxl")
    sys.exit(1)


def parse_date(date_val) -> str | None:
    """Parse date value to YYYY-MM-DD format."""
    if pd.isna(date_val):
        return None
    
    if isinstance(date_val, str):
        return date_val[:10] if len(date_val) >= 10 else date_val
    
    try:
        return pd.to_datetime(date_val).strftime('%Y-%m-%d')
    except:
        return str(date_val)[:10] if str(date_val) else None


def excel_to_json_simple(excel_path: Path, output_path: Path):
    """Convert Excel to simple activities array format."""
    print(f"Loading {excel_path}...")
    
    try:
        xls = pd.ExcelFile(excel_path)
        sheet_name = xls.sheet_names[0]
        df = pd.read_excel(excel_path, sheet_name=sheet_name)
        print(f"Loaded {len(df)} rows from '{sheet_name}'")
    except Exception as e:
        print(f"ERROR reading Excel: {e}")
        raise
    
    # Convert to activities array
    activities = []
    
    for idx, row in df.iterrows():
        activity_id = row.get('Activity ID') or row.get('activity_id')
        
        if pd.isna(activity_id) or str(activity_id).strip() == '':
            continue
        
        activity = {
            "activity_id": str(activity_id).strip(),
            "activity_name": str(row.get('Activity Name', '') or ''),
            "planned_start": parse_date(row.get('Start Date')),
            "planned_finish": parse_date(row.get('End Date')),
            "duration": int(row.get('Duration', 0)) if pd.notna(row.get('Duration')) else 0,
            "level1": str(row.get('Level 1', '') or ''),
            "level2": str(row.get('Level 2', '') or ''),
            "state": "planned",
            "status": "active",
            "progress": 0,
            "depends_on": []
        }
        
        activities.append(activity)
    
    # Simple output structure
    output = {
        "contract": {
            "name": "TR Dashboard Schedule",
            "version": "1.0",
            "timezone": "Asia/Dubai"
        },
        "activities": activities
    }
    
    # Write JSON
    print(f"\nWriting {output_path}...")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    
    print(f"\n[SUCCESS] Conversion complete!")
    print(f"   Output: {output_path}")
    print(f"   Activities: {len(activities)}")
    print(f"   Size: {output_path.stat().st_size / 1024:.1f} KB")


def main():
    if len(sys.argv) > 2:
        input_path = Path(sys.argv[1])
        output_path = Path(sys.argv[2])
    elif len(sys.argv) > 1:
        input_path = Path(sys.argv[1])
        output_path = Path("data/schedule/option_c_from_excel.json")
    else:
        input_path = Path("data/agi_tr_final_schedule.xlsx")
        output_path = Path("data/schedule/option_c_from_excel.json")
    
    if not input_path.exists():
        print(f"ERROR: File not found: {input_path}")
        sys.exit(1)
    
    try:
        excel_to_json_simple(input_path, output_path)
        return 0
    except Exception as e:
        print(f"\n[ERROR] {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
