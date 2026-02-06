import json
import shutil
from datetime import datetime
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
SSOT_PATH = REPO_ROOT / 'data' / 'schedule' / 'option_c_v0.8.0.json'
CORRECTIONS_PATH = REPO_ROOT / 'reports' / 'corrections.json'
TRIPS_PATH = REPO_ROOT / 'reports' / 'trips_generated.json'
TRS_PATH = REPO_ROOT / 'reports' / 'trs_generated.json'

if not SSOT_PATH.exists():
    raise SystemExit(f'Missing SSOT file: {SSOT_PATH}')
if not CORRECTIONS_PATH.exists():
    raise SystemExit(f'Missing corrections file: {CORRECTIONS_PATH}')
if not TRIPS_PATH.exists():
    raise SystemExit(f'Missing trips file: {TRIPS_PATH}')
if not TRS_PATH.exists():
    raise SystemExit(f'Missing trs file: {TRS_PATH}')

backup_path = SSOT_PATH.with_name(
    f"{SSOT_PATH.stem}_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}{SSOT_PATH.suffix}"
)
shutil.copy(SSOT_PATH, backup_path)
print(f'Backup created: {backup_path}')

with SSOT_PATH.open('r', encoding='utf-8') as f:
    ssot = json.load(f)

with CORRECTIONS_PATH.open('r', encoding='utf-8') as f:
    corrections_payload = json.load(f)

corrections = corrections_payload.get('corrections', [])

with TRIPS_PATH.open('r', encoding='utf-8') as f:
    trips = json.load(f)

with TRS_PATH.open('r', encoding='utf-8') as f:
    trs = json.load(f)

activities = ssot.get('entities', {}).get('activities', {})

applied = 0
for correction in corrections:
    act_id = correction.get('activity_id')
    if not act_id or act_id not in activities:
        print(f'Skip missing activity: {act_id}')
        continue
    activity = activities[act_id]
    current_trip_id = activity.get('trip_id')
    current_tr_unit_id = activity.get('tr_unit_id')
    activity['trip_id'] = correction['correct_trip_id']
    activity['tr_unit_id'] = correction['correct_tr_unit_id']
    activity['tr_ids'] = correction['correct_tr_ids']
    applied += 1
    print(
        f"Updated {act_id}: trip_id {current_trip_id} -> {activity['trip_id']}, "
        f"tr_unit_id {current_tr_unit_id} -> {activity['tr_unit_id']}"
    )

ssot.setdefault('entities', {})['trips'] = trips
ssot.setdefault('entities', {})['trs'] = trs

with SSOT_PATH.open('w', encoding='utf-8') as f:
    json.dump(ssot, f, indent=2, ensure_ascii=False)
    f.write('\n')

print(f'Applied corrections: {applied}')
print('SSOT updated.')
