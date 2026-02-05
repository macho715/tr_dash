# TR Location Adjustment Plan

**Created:** 2026-02-04
**Status:** DRAFT
**Author:** tr-planner (agent-orchestrator pipeline)

---

## 1. Executive Summary

**Goal:** Adjust TR current locations to reflect actual situation:
- TR-01: Located at AGI (Al Ghallan Island)
- TR-02~TR-07: Located at Mina Zayed Port

**Issue Discovered:** SSOT analysis reveals a significant discrepancy:
- User assumes TR_01~TR_07 exist (7 TRs)
- **Actual SSOT contains only TR_01 and TR_02** (2 TRs)
- Activity location fields (`from_location_id`, `to_location_id`) are `null` for all activities
- All activities in `planned` state with no `actual.start_ts` or `actual.end_ts`

**Conclusion:** **Cannot proceed with original request without clarification.**

---

## 2. Current State Analysis

### 2.1 TR Inventory (from `option_c_v0.8.0.json`)

```
TR_01: TR 01
  - Trip: TRIP_01
  - Activities: 25
  - Current state: All activities in "planned" state
  - Current location: Cannot be determined (all location fields are null)

TR_02: TR 02
  - Trip: TRIP_02
  - Activities: 89
  - Current state: All activities in "planned" state
  - Current location: Cannot be determined (all location fields are null)
```

### 2.2 Missing Data

1. **Missing TRs:**
   - TR_03, TR_04, TR_05, TR_06, TR_07 do not exist in SSOT
   - User expects 7 TRs (TR-01 to TR-07) as mentioned in requirement

2. **Missing Location Data:**
   - All activities have `plan.location.from_location_id: null`
   - All activities have `plan.location.to_location_id: null`
   - Without location data, `calculateCurrentLocationForTR` cannot determine TR position

3. **Missing Actual Data:**
   - All activities have `actual.start_ts: null`
   - All activities have `actual.end_ts: null`
   - Cannot determine if any activity is "in_progress" or "done"

### 2.3 Location Calculation Logic (from `src/lib/derived-calc.ts`)

```typescript
calculateCurrentLocationForTR(ssot, trId):
  1. Find current_activity_id (activity with actual.start_ts && !actual.end_ts)
  2. If no in-progress activity, find most recent completed activity
  3. Get location from activity:
     - Use actual.location_override.to_location_id if exists
     - If in_progress, use plan.location.to_location_id
     - If completed, use plan.location.to_location_id
     - Default: plan.location.from_location_id
```

**Problem:** Without location data in activities, function will return `null`.

---

## 3. Gap Analysis

| Requirement | Current State | Gap |
|-------------|---------------|-----|
| 7 TRs (TR-01 to TR-07) | 2 TRs (TR_01, TR_02) | Missing 5 TRs |
| TR-01 at AGI | TR_01 location unknown (no location data) | Missing location data |
| TR-02~07 at MZP | Only TR_02 exists, location unknown | Missing 5 TRs + location data |
| Activities with locations | All activities have null location fields | Missing location data for 114 activities |
| Some activities started | All activities in "planned" state | Missing actual timestamps |

---

## 4. Options for Resolution

### Option A: Clarify User Intent (RECOMMENDED)

**Action:** Ask user to clarify:
1. Is `option_c_v0.8.0.json` the correct SSOT file?
2. Should we work with a different file (e.g., `option_c.json`, `agi tr final schedule.json`)?
3. Are TR_03~TR_07 expected to be added, or is this a misunderstanding?
4. What is the source of truth for location data?

**Rationale:** Cannot make assumptions about data structure without confirmation.

### Option B: Work with Existing Data (TR_01, TR_02 only)

If user confirms `option_c_v0.8.0.json` is correct:

1. **Add location data to activities:**
   - Parse activity names/IDs to infer locations (e.g., "MZP to AGI Transit")
   - Manually map first activities to LOC_MZP (Mina Zayed Port)
   - Manually map AGI-related activities to LOC_AGI

2. **Set TR_01 to AGI:**
   - Find first AGI-related activity for TR_01
   - Set `actual.start_ts` (e.g., current timestamp or past date)
   - Optionally set previous activities to "done" with actual.end_ts

3. **Keep TR_02 at MZP:**
   - Keep all TR_02 activities in "planned" state
   - No actual timestamps needed

**Challenges:**
- Requires inferring location data (error-prone)
- May violate SSOT integrity if inferred incorrectly
- Cannot address TR_03~TR_07 requirement

### Option C: Check Alternative SSOT Files

**Action:** Inspect other schedule files:
- `data/schedule/option_c.json` (main SSOT file referenced in AGENTS.md)
- `data/schedule/agi tr final schedule.json` (backup file)

**Rationale:** User may have referenced wrong file, or `option_c_v0.8.0.json` may be outdated/incomplete.

---

## 5. Recommended Next Steps

### Step 1: Verify Correct SSOT File

Check `option_c.json` (main SSOT file):

```bash
node -e "const data = require('./data/schedule/option_c.json'); console.log('TRs:', Object.keys(data.entities.trs)); console.log('Sample activity:', JSON.stringify(Object.values(data.entities.activities)[0], null, 2).slice(0, 500))"
```

### Step 2: User Clarification (BLOCKING)

**Questions for user:**
1. Is `option_c_v0.8.0.json` the correct SSOT file to modify?
2. If TR_03~TR_07 do not exist in SSOT, should we:
   - Add them (requires activity data)?
   - Adjust request to work with TR_01 and TR_02 only?
3. What is the expected source for location data (from_location_id, to_location_id)?
   - Should we infer from activity names?
   - Is there a separate location mapping file?

### Step 3: Proceed Based on Clarification

Once clarified, execute one of:
- **Plan A:** Add missing TRs and location data (requires data source)
- **Plan B:** Adjust TR_01 and TR_02 locations only (if user confirms 2-TR scope)
- **Plan C:** Work with different SSOT file (e.g., `option_c.json`)

---

## 6. Contract v0.8.0 Compliance Notes

If we proceed with modifications, must ensure:

1. **State Machine:**
   - Valid transitions: `planned` → `ready` → `in_progress` → `done`
   - Cannot skip states without justification

2. **Actual Timestamps:**
   - `actual.start_ts` must be ISO 8601 with Asia/Dubai timezone
   - `actual.end_ts` >= `actual.start_ts`

3. **History Events (Append-only):**
   ```json
   {
     "event_id": "EVT_<timestamp>_<random>",
     "timestamp": "2026-02-04T10:00:00+04:00",
     "event_type": "actual_start_recorded",
     "actor": "tr-implementer",
     "activity_id": "A1013",
     "delta": {
       "actual.start_ts": {
         "old": null,
         "new": "2026-02-04T10:00:00+04:00"
       }
     }
   }
   ```

4. **Location Override (if needed):**
   ```json
   "actual": {
     "location_override": {
       "to_location_id": "LOC_AGI",
       "reason": "TR delivered to AGI ahead of schedule"
     }
   }
   ```

---

## 7. Blockers

- [ ] **BLOCKER:** User clarification required (see Step 2)
- [ ] **BLOCKER:** Missing location data in activities
- [ ] **BLOCKER:** Missing TR_03~TR_07 entities

---

## 8. Exit Criteria

- [ ] TR_01 current location calculated as LOC_AGI
- [ ] TR_02~TR_07 current locations calculated as LOC_MZP (or adjusted scope)
- [ ] Map component displays TRs at correct locations
- [ ] `calculateCurrentLocationForTR` returns expected values
- [ ] `scripts/validate_optionc.py` passes
- [ ] No SSOT integrity violations

---

## 9. Additional Findings

### 9.1 Data Quality Issues

Further inspection reveals additional problems:

1. **All activities unnamed:**
   - Every activity has `name: null` or `undefined`
   - Cannot infer location from activity name

2. **Empty locations entity:**
   - `entities.locations` is completely empty `{}`
   - LOC_MZP and LOC_AGI do not exist in SSOT
   - `MapPanel.tsx` has hardcoded LOCATION_OVERRIDES:
     ```typescript
     LOC_MZP: { lat: 24.5327093, lon: 54.3781822, name: 'Mina Zayed Port' }
     LOC_AGI: { lat: 24.841096, lon: 53.658619, name: 'AGI Jetty (Al Ghallan Island)' }
     ```

3. **No location references in activities:**
   - Cannot establish "TR at location" without activity location data

### 9.2 Possible Root Causes

**Hypothesis:** `option_c_v0.8.0.json` may be:
- A test/skeleton file (minimal data for structure testing)
- An export that stripped out location and name data
- An incomplete migration from another format

**Evidence:**
- Contract version exists (v0.8.0) but data is sparse
- Structure is valid but content is minimal
- Other SSOT files (`option_c.json`, `agi tr final schedule.json`) are empty

---

## 10. Proposed Solution (Pragmatic Approach)

Since SSOT data is incomplete, propose **minimal viable fix** to unblock user:

### Step 1: Add Locations to SSOT

```json
"entities": {
  "locations": {
    "LOC_MZP": {
      "location_id": "LOC_MZP",
      "name": "Mina Zayed Port",
      "lat": 24.5327093,
      "lon": 54.3781822
    },
    "LOC_AGI": {
      "location_id": "LOC_AGI",
      "name": "AGI Jetty (Al Ghallan Island)",
      "lat": 24.841096,
      "lon": 53.658619
    }
  }
}
```

### Step 2: Set Initial Locations for Activities

**For TR_01 (Goal: at AGI):**
- First activity (A1004) as MZP → AGI transit
- Set `plan.location.from_location_id: "LOC_MZP"`
- Set `plan.location.to_location_id: "LOC_AGI"`
- Set `actual.start_ts` and `actual.end_ts` to mark as completed
- Set `state: "done"`

**For TR_02 (Goal: at MZP):**
- First activity (A2029) as MZP-based
- Set `plan.location.from_location_id: "LOC_MZP"`
- Set `plan.location.to_location_id: "LOC_MZP"` (or another location for future trip)
- Keep `state: "planned"`, no actual timestamps

### Step 3: Add History Events

For each modification, add history_event to `ssot.history_events[]`:

```json
{
  "event_id": "EVT_20260204_001",
  "timestamp": "2026-02-04T12:00:00+04:00",
  "event_type": "location_data_initialization",
  "actor": "tr-implementer",
  "activity_id": "A1004",
  "delta": {
    "plan.location": {
      "old": null,
      "new": {
        "from_location_id": "LOC_MZP",
        "to_location_id": "LOC_AGI"
      }
    }
  }
}
```

### Step 4: Verify

- Run `calculateCurrentLocationForTR("TR_01")` → should return `"LOC_AGI"`
- Run `calculateCurrentLocationForTR("TR_02")` → should return `"LOC_MZP"`
- Map should display markers correctly

---

## 11. User Decision Points

**REQUIRED: User must approve before proceeding:**

1. **Scope adjustment:**
   - ✅ Accept working with TR_01 and TR_02 only (not TR_01~TR_07)
   - ❌ Reject and provide correct SSOT file or data source

2. **Data initialization:**
   - ✅ Accept adding locations to SSOT (LOC_MZP, LOC_AGI)
   - ✅ Accept adding location references to activities
   - ❌ Reject and provide source of truth for location data

3. **TR_01 state change:**
   - ✅ Accept marking TR_01 first activity as "done" to place TR at AGI
   - Alternative: Specify which activity should be marked as completed
   - ❌ Reject and explain desired state

**IF USER APPROVES:** Proceed to tr-implementer with above plan.

**IF USER REJECTS:** Provide alternative data source or clarification.

---

## 12. Next Agent

**HOLD:** Awaiting user approval (see Section 11).

Once approved → handoff to **tr-implementer** with approved modifications.

---

## Refs

- [AGENTS.md](../../AGENTS.md) - Section 1.1 SSOT principles
- [option_c_v0.8.0.json](../../data/schedule/option_c_v0.8.0.json) - Current SSOT
- [src/lib/derived-calc.ts](../../src/lib/derived-calc.ts) - Location calculation logic
- [components/map/MapPanel.tsx](../../components/map/MapPanel.tsx) - LOCATION_OVERRIDES hardcoded
- [Contract v0.8.0](../../data/schedule/option_c_v0.8.0.json) - Lines 1-10
