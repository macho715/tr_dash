import json
import re
from pathlib import Path
from datetime import datetime

SSOT_PATH = Path('data/schedule/option_c_v0.8.0.json')
OUTPUT_DIR = Path('reports')
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

TRIPS_PATH = OUTPUT_DIR / 'trips_generated.json'
TRS_PATH = OUTPUT_DIR / 'trs_generated.json'
REPORT_PATH = OUTPUT_DIR / 'entities_verification.md'

ssot = json.loads(SSOT_PATH.read_text(encoding='utf-8'))
activities = ssot.get('entities', {}).get('activities', {})

trip_ids = [f'TRIP_0{i}' for i in range(1, 8)]
tr_ids = [f'TR_0{i}' for i in range(1, 8)]

# Group activities by trip_id
trip_activities = {tid: [] for tid in trip_ids}
for act in activities.values():
    trip_id = act.get('trip_id')
    if trip_id in trip_activities:
        trip_activities[trip_id].append(act)

# Generate trips
trips = {}
for trip_id in trip_ids:
    acts = trip_activities[trip_id]
    start_dates = [a['plan']['start_ts'] for a in acts if a.get('plan') and a['plan'].get('start_ts')]
    end_dates = [a['plan']['end_ts'] for a in acts if a.get('plan') and a['plan'].get('end_ts')]
    trip_number = int(trip_id.replace('TRIP_0', ''))
    trips[trip_id] = {
        'trip_id': trip_id,
        'trip_number': trip_number,
        'transformer_id': f'TR_0{trip_number}',
        'tr_unit_id': f'TR_0{trip_number}',
        'planned_start': min(start_dates) if start_dates else None,
        'planned_finish': max(end_dates) if end_dates else None,
        'activities': [a['activity_id'] for a in acts if a.get('activity_id')],
    }

# Generate TRs
trs = {}
bay_pattern = re.compile(r'TR\s*Bay\s*(\d+)', re.IGNORECASE)
for i in range(1, 8):
    tr_id = f'TR_0{i}'
    trip_id = f'TRIP_0{i}'
    # Try to find a sample activity with matching tr_unit_id
    sample = next((a for a in activities.values() if a.get('tr_unit_id') == tr_id), None)
    bay_id = None
    if sample:
        title = sample.get('title', '')
        match = bay_pattern.search(title)
        if match:
            bay_id = f'TR Bay {match.group(1)}'
    if not bay_id:
        bay_id = f'TR Bay {i}'

    trs[tr_id] = {
        'tr_id': tr_id,
        'tr_number': i,
        'name': f'AGI TR Unit {i}',
        'weight_tons': 350,
        'bay_id': bay_id,
        'trip_ids': [trip_id],
    }

TRIPS_PATH.write_text(json.dumps(trips, indent=2), encoding='utf-8')
TRS_PATH.write_text(json.dumps(trs, indent=2), encoding='utf-8')

lines = []
lines.append('# Trips/TRs Entities Verification')
lines.append('')
lines.append(f'- Generated: {datetime.utcnow().isoformat()}Z')
lines.append(f'- Source: {SSOT_PATH}')
lines.append('')
lines.append('## Trips')
lines.append('')
lines.append('| trip_id | activities | planned_start | planned_finish |')
lines.append('| --- | --- | --- | --- |')
for trip_id in trip_ids:
    trip = trips[trip_id]
    lines.append(
        f"| {trip_id} | {len(trip['activities'])} | {trip['planned_start']} | {trip['planned_finish']} |"
    )
lines.append('')
lines.append('## TRs')
lines.append('')
lines.append('| tr_id | name | bay_id | trip_ids |')
lines.append('| --- | --- | --- | --- |')
for tr_id in tr_ids:
    tr = trs[tr_id]
    lines.append(
        f"| {tr_id} | {tr['name']} | {tr['bay_id']} | {', '.join(tr['trip_ids'])} |"
    )

REPORT_PATH.write_text('\n'.join(lines) + '\n', encoding='utf-8')

print(f'Wrote {TRIPS_PATH}')
print(f'Wrote {TRS_PATH}')
print(f'Wrote {REPORT_PATH}')
