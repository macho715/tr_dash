import json
import re
from pathlib import Path
from datetime import datetime

SSOT_PATH = Path('data/schedule/option_c_v0.8.0.json')
OUTPUT_DIR = Path('reports')
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

CORRECTIONS_PATH = OUTPUT_DIR / 'corrections.json'
AUDIT_PATH = OUTPUT_DIR / 'trip_01_audit.md'

TRIP_ID = 'TRIP_01'

unit_pattern = re.compile(r'TR\s*Unit\s*(\d+)', re.IGNORECASE)

ssot = json.loads(SSOT_PATH.read_text(encoding='utf-8'))
activities = ssot.get('entities', {}).get('activities', {})

trip_01_activities = [a for a in activities.values() if a.get('trip_id') == TRIP_ID]

corrections = []
matched = []
unmatched = []

for act in trip_01_activities:
    title = act.get('title') or ''
    activity_id = act.get('activity_id')
    trip_id = act.get('trip_id')
    tr_unit_id = act.get('tr_unit_id')
    tr_ids = act.get('tr_ids') or []

    match = unit_pattern.search(title)
    unit_number = None
    if match:
        unit_number = int(match.group(1))
    else:
        if isinstance(tr_unit_id, str):
            unit_match = re.search(r'TR[_-]0*(\d+)', tr_unit_id)
            if unit_match:
                unit_number = int(unit_match.group(1))

    if unit_number is None:
        unmatched.append({
            'activity_id': activity_id,
            'title': title,
            'trip_id': trip_id,
            'tr_unit_id': tr_unit_id,
            'tr_ids': tr_ids,
            'reason': 'No TR Unit number found in title or tr_unit_id'
        })
        continue

    matched.append(activity_id)
    correct_trip_id = f'TRIP_0{unit_number}'
    correct_tr_unit_id = f'TR_0{unit_number}'
    correct_tr_ids = [correct_tr_unit_id]

    if trip_id != correct_trip_id:
        corrections.append({
            'activity_id': activity_id,
            'title': title,
            'current_trip_id': trip_id,
            'current_tr_unit_id': tr_unit_id,
            'current_tr_ids': tr_ids,
            'correct_trip_id': correct_trip_id,
            'correct_tr_unit_id': correct_tr_unit_id,
            'correct_tr_ids': correct_tr_ids,
            'matched_unit_number': unit_number,
        })

summary = {
    'generated_at': datetime.utcnow().isoformat() + 'Z',
    'source': str(SSOT_PATH),
    'trip_id': TRIP_ID,
    'trip_01_activity_count': len(trip_01_activities),
    'matched_count': len(matched),
    'unmatched_count': len(unmatched),
    'correction_count': len(corrections),
}

CORRECTIONS_PATH.write_text(json.dumps({'summary': summary, 'corrections': corrections}, indent=2), encoding='utf-8')

lines = []
lines.append('# TRIP_01 Activity Audit')
lines.append('')
lines.append(f'- Generated: {summary["generated_at"]}')
lines.append(f'- Source: {summary["source"]}')
lines.append(f'- TRIP_01 activities: {summary["trip_01_activity_count"]}')
lines.append(f'- Matched with TR Unit: {summary["matched_count"]}')
lines.append(f'- Unmatched: {summary["unmatched_count"]}')
lines.append(f'- Corrections needed: {summary["correction_count"]}')
lines.append('')

lines.append('## Corrections')
lines.append('')
if corrections:
    lines.append('| activity_id | title | current_trip_id | correct_trip_id | current_tr_unit_id | correct_tr_unit_id |')
    lines.append('| --- | --- | --- | --- | --- | --- |')
    for c in corrections:
        lines.append(
            f"| {c['activity_id']} | {c['title']} | {c['current_trip_id']} | {c['correct_trip_id']} | {c['current_tr_unit_id']} | {c['correct_tr_unit_id']} |"
        )
else:
    lines.append('No corrections detected.')

lines.append('')
lines.append('## Unmatched (No TR Unit Number)')
lines.append('')
if unmatched:
    lines.append('| activity_id | title | trip_id | tr_unit_id | reason |')
    lines.append('| --- | --- | --- | --- | --- |')
    for u in unmatched:
        lines.append(
            f"| {u['activity_id']} | {u['title']} | {u['trip_id']} | {u['tr_unit_id']} | {u['reason']} |"
        )
else:
    lines.append('None.')

AUDIT_PATH.write_text('\n'.join(lines) + '\n', encoding='utf-8')

print(f'Wrote {CORRECTIONS_PATH}')
print(f'Wrote {AUDIT_PATH}')
print(f'Corrections: {len(corrections)}')
print(f'Unmatched: {len(unmatched)}')
