#!/usr/bin/env python3
import json

# Load v0.8.0
with open('data/schedule/option_c_v0.8.0.json', encoding='utf-8') as f:
    data = json.load(f)

activities = data['entities']['activities']
sample_activity = list(activities.values())[0]

print("=== Contract v0.8.0 Activity Structure ===\n")
print(f"Activity ID: {list(activities.keys())[0]}")
print(f"\nTop-level keys: {list(sample_activity.keys())}\n")

if 'plan' in sample_activity:
    print("✅ Has 'plan' section")
    print(f"   Plan keys: {list(sample_activity['plan'].keys())}")
    if 'start_ts' in sample_activity['plan']:
        print(f"   start_ts: {sample_activity['plan']['start_ts']}")
    if 'end_ts' in sample_activity['plan']:
        print(f"   end_ts: {sample_activity['plan']['end_ts']}")

if 'planned_start' in sample_activity:
    print(f"\n✅ Has 'planned_start': {sample_activity['planned_start']}")
if 'planned_finish' in sample_activity:
    print(f"✅ Has 'planned_finish': {sample_activity['planned_finish']}")

# Check for empty/null dates
print("\n=== Checking for invalid dates ===")
invalid_count = 0
for aid, act in list(activities.items())[:10]:
    if 'plan' in act:
        start = act['plan'].get('start_ts')
        end = act['plan'].get('end_ts')
        if not start or not end:
            print(f"⚠️  {aid}: Missing dates (start={start}, end={end})")
            invalid_count += 1

print(f"\nInvalid dates in first 10: {invalid_count}")
