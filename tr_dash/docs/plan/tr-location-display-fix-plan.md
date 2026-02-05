# TR Location Display Fix Plan

**Date:** 2026-02-04  
**Agent:** tr-planner  
**Issue:** TR-2~7이 Map에서 Mina Zayed Port에 표시되지 않음

---

## 1. Problem Analysis

### 1.1 Current Behavior
- **TR-1:** AGI에 정상 표시됨 (activity 상태: `planned`)
- **TR-2~7:** Map에 표시되지 않음 (activity 상태: `planned`)

### 1.2 SSOT Verification
```json
// option_c_v0.8.0.json - TR_03 예시
{
  "activity_id": "ACT_TR03_MZMZ_STANDBY",
  "tr_ids": ["TR_03"],
  "state": "planned",
  "plan": {
    "location": {
      "from_location_id": "LOC_MZP",
      "to_location_id": "LOC_MZP"
    }
  },
  "actual": {
    "start_ts": null,
    "end_ts": null
  }
}
```
✅ SSOT는 올바름 (`from_location_id: "LOC_MZP"`)

### 1.3 Root Cause

**`calculateCurrentLocationForTR` 로직 (src/lib/derived-calc.ts:75-108):**

```typescript
export function calculateCurrentLocationForTR(
  ssot: OptionC,
  trId: string
): string | null {
  const currentActivityId = calculateCurrentActivityForTR(ssot, trId);
  
  if (!currentActivityId) {
    return null;  // ❌ 여기서 null 반환
  }
  // ...
}
```

**`calculateCurrentActivityForTR` 로직 (src/lib/derived-calc.ts:36-68):**

```typescript
export function calculateCurrentActivityForTR(
  ssot: OptionC,
  trId: string
): string | null {
  const activities = getActivitiesForTR(ssot, trId);
  
  // in_progress 활동 찾기
  const inProgress = activities.filter(a =>
    a.actual.start_ts !== null && a.actual.end_ts === null
  );
  
  if (inProgress.length > 0) {
    return sorted[0].activity_id;
  }
  
  // completed 활동 찾기
  const completed = activities
    .filter(a => a.actual.end_ts !== null)
    .sort(...);
  
  return completed[0]?.activity_id || null;  // ❌ planned 상태는 null 반환
}
```

**문제:**
- `planned` 상태 (actual.start_ts === null)의 activity는 "current activity"로 인식되지 않음
- 따라서 `calculateCurrentLocationForTR`가 `null`을 반환
- MapPanel에서 fallback 로직이 있지만, **TR-2~7에 대해 작동하지 않는 것으로 추정**

---

## 2. Solution Design

### 2.1 Strategy: Fallback Chain
`calculateCurrentActivityForTR`와 `calculateCurrentLocationForTR`를 수정하여 **planned** 상태도 처리:

```
1. in_progress → 진행 중인 activity
2. completed → 가장 최근 완료된 activity
3. ready/committed → 시작 준비된 activity
4. planned → 계획된 activity 중 가장 빠른 것 (plan.start_ts 기준)
```

### 2.2 Implementation Plan

#### Task 1: Update `calculateCurrentActivityForTR`
**File:** `src/lib/derived-calc.ts`

**Changes:**
```typescript
export function calculateCurrentActivityForTR(
  ssot: OptionC,
  trId: string
): string | null {
  const activities = getActivitiesForTR(ssot, trId);
  
  // 1. in_progress
  const inProgress = activities.filter(a =>
    a.actual.start_ts !== null && a.actual.end_ts === null
  );
  if (inProgress.length > 0) {
    const sorted = inProgress.sort((a, b) => {
      const aStart = new Date(a.actual.start_ts!).getTime();
      const bStart = new Date(b.actual.start_ts!).getTime();
      return bStart - aStart;
    });
    return sorted[0].activity_id;
  }
  
  // 2. completed
  const completed = activities
    .filter(a => a.actual.end_ts !== null)
    .sort((a, b) => {
      const aEnd = new Date(a.actual.end_ts!).getTime();
      const bEnd = new Date(b.actual.end_ts!).getTime();
      return bEnd - aEnd;
    });
  if (completed.length > 0) {
    return completed[0].activity_id;
  }
  
  // 3. ready/committed (NEW)
  const ready = activities.filter(a =>
    (a.state === 'ready' || a.state === 'committed') &&
    a.actual.start_ts === null
  );
  if (ready.length > 0) {
    const sorted = ready.sort((a, b) => {
      const aStart = new Date(a.plan.start_ts).getTime();
      const bStart = new Date(b.plan.start_ts).getTime();
      return aStart - bStart; // Ascending (earliest first)
    });
    return sorted[0].activity_id;
  }
  
  // 4. planned (NEW)
  const planned = activities.filter(a =>
    a.state === 'planned' && a.actual.start_ts === null
  );
  if (planned.length > 0) {
    const sorted = planned.sort((a, b) => {
      const aStart = new Date(a.plan.start_ts).getTime();
      const bStart = new Date(b.plan.start_ts).getTime();
      return aStart - bStart;
    });
    return sorted[0].activity_id;
  }
  
  // 5. fallback: first activity (NEW)
  return activities[0]?.activity_id || null;
}
```

**Rationale:**
- **planned** 상태도 "current activity"로 인식
- **from_location_id**가 반환되도록 `calculateCurrentLocationForTR` 로직 활용

#### Task 2: Verify `calculateCurrentLocationForTR` Logic
**File:** `src/lib/derived-calc.ts`

**Current logic (lines 75-108):**
```typescript
export function calculateCurrentLocationForTR(
  ssot: OptionC,
  trId: string
): string | null {
  const currentActivityId = calculateCurrentActivityForTR(ssot, trId);
  
  if (!currentActivityId) {
    return null;
  }
  
  const activity = ssot.entities.activities[currentActivityId];
  
  if (!activity) {
    return null;
  }
  
  // Use actual location if exists
  if (activity.actual.location_override) {
    return activity.actual.location_override.to_location_id;
  }
  
  // If in progress, use to_location_id
  if (activity.actual.start_ts && !activity.actual.end_ts) {
    return activity.plan.location.to_location_id;
  }
  
  // If completed, use to_location_id
  if (activity.actual.end_ts) {
    return activity.plan.location.to_location_id;
  }
  
  // Default to from_location_id (planned 상태 포함)
  return activity.plan.location.from_location_id;  // ✅ 이미 올바름
}
```

**Analysis:**
- ✅ 로직은 올바름 (마지막 fallback이 `from_location_id`)
- ✅ **Task 1**만 수정하면 문제 해결됨

#### Task 3: Update Tests
**File:** `src/lib/__tests__/derived-calc.test.ts`

**New Test Cases:**
```typescript
describe('calculateCurrentActivityForTR - planned state', () => {
  it('should return first planned activity when no actual data', () => {
    const ssot = {
      entities: {
        activities: {
          ACT_1: {
            activity_id: 'ACT_1',
            tr_ids: ['TR_01'],
            state: 'planned',
            plan: { start_ts: '2026-02-10T08:00:00Z' },
            actual: { start_ts: null, end_ts: null }
          },
          ACT_2: {
            activity_id: 'ACT_2',
            tr_ids: ['TR_01'],
            state: 'planned',
            plan: { start_ts: '2026-02-11T08:00:00Z' },
            actual: { start_ts: null, end_ts: null }
          }
        }
      }
    };
    
    const currentActivity = calculateCurrentActivityForTR(ssot, 'TR_01');
    expect(currentActivity).toBe('ACT_1'); // Earliest planned
  });
  
  it('should return ready activity over planned', () => {
    const ssot = {
      entities: {
        activities: {
          ACT_1: {
            activity_id: 'ACT_1',
            tr_ids: ['TR_01'],
            state: 'planned',
            plan: { start_ts: '2026-02-10T08:00:00Z' },
            actual: { start_ts: null, end_ts: null }
          },
          ACT_2: {
            activity_id: 'ACT_2',
            tr_ids: ['TR_01'],
            state: 'ready',
            plan: { start_ts: '2026-02-11T08:00:00Z' },
            actual: { start_ts: null, end_ts: null }
          }
        }
      }
    };
    
    const currentActivity = calculateCurrentActivityForTR(ssot, 'TR_01');
    expect(currentActivity).toBe('ACT_2'); // ready > planned
  });
});

describe('calculateCurrentLocationForTR - planned state', () => {
  it('should return from_location_id for planned activity', () => {
    const ssot = {
      entities: {
        activities: {
          ACT_1: {
            activity_id: 'ACT_1',
            tr_ids: ['TR_01'],
            state: 'planned',
            plan: {
              start_ts: '2026-02-10T08:00:00Z',
              location: {
                from_location_id: 'LOC_MZP',
                to_location_id: 'LOC_AGI'
              }
            },
            actual: { start_ts: null, end_ts: null }
          }
        }
      }
    };
    
    const currentLocation = calculateCurrentLocationForTR(ssot, 'TR_01');
    expect(currentLocation).toBe('LOC_MZP'); // from_location_id for planned
  });
});
```

#### Task 4: Verify MapPanel Integration
**File:** `components/map/MapPanel.tsx`

**Current fallback (lines 121-132):**
```typescript
let locId = calculateCurrentLocationForTR(ssot!, trId)
// Fallback: use SSOT calc or first activity's from_location
if (!locId && tr?.calc?.current_location_id) {
  locId = tr.calc.current_location_id
}
if (!locId) {
  const acts = Object.values(activities).filter((a) => a.tr_ids?.includes(trId))
  const first = acts[0]
  if (first?.plan?.location?.from_location_id) {
    locId = first.plan.location.from_location_id
  }
}
```

**Analysis:**
- ✅ Fallback 로직은 올바름
- ✅ **Task 1** 수정 후 `calculateCurrentLocationForTR`가 정상 작동하므로 추가 수정 불필요

---

## 3. Verification Plan

### 3.1 Unit Tests
```bash
pnpm test src/lib/__tests__/derived-calc.test.ts
```

**Expected:**
- ✅ All existing tests pass
- ✅ New tests for `planned` state pass

### 3.2 Integration Test
```bash
pnpm dev
```

**Manual Verification:**
1. Open dashboard: http://localhost:3000
2. Check Map Panel:
   - ✅ TR-1 at AGI (as before)
   - ✅ TR-2~7 at Mina Zayed Port (NEW)
3. Check TR markers:
   - Status: `planned` (blue)
   - Tooltip: Shows TR name, location name, activity name

### 3.3 SSOT Validation
```bash
python scripts/validate_optionc.py
```

**Expected:**
- ✅ SSOT integrity maintained (no data changes)

---

## 4. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Breaking existing TR-1 display | Low | High | Unit tests cover existing behavior |
| Performance degradation (sorting) | Low | Low | Activities per TR << 100 |
| Reflow compatibility | Low | Medium | Derived calc is read-only, doesn't affect reflow |

---

## 5. Rollback Plan

**If issues occur:**
1. Revert commit: `git revert HEAD`
2. Restore original logic:
   ```typescript
   export function calculateCurrentActivityForTR(...) {
     // Only in_progress + completed logic
     return completed[0]?.activity_id || null;
   }
   ```

---

## 6. Definition of Done (DoD)

- [ ] `calculateCurrentActivityForTR` handles `planned` state
- [ ] Unit tests pass (existing + new)
- [ ] TR-2~7 visible on Map at Mina Zayed Port
- [ ] TR-1 still visible at AGI (no regression)
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] SSOT validation passes

---

## 7. Task List for Implementer

### Task 1: Update `calculateCurrentActivityForTR`
- File: `src/lib/derived-calc.ts`
- Add fallback chain: ready → planned → first activity
- Preserve existing in_progress + completed logic

### Task 2: Add Unit Tests
- File: `src/lib/__tests__/derived-calc.test.ts`
- Test planned state returns earliest activity
- Test ready state takes precedence over planned
- Test location calculation for planned state

### Task 3: Run Quality Gates
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test src/lib/__tests__/derived-calc.test.ts`

### Task 4: Manual Verification
- Start dev server: `pnpm dev`
- Verify TR-2~7 visible on Map
- Verify TR-1 still visible (no regression)

### Task 5: SSOT Validation
- `python scripts/validate_optionc.py`

---

## Refs

- [AGENTS.md](../../AGENTS.md) - SSOT principles
- [src/lib/derived-calc.ts](../../src/lib/derived-calc.ts) - Current implementation
- [option_c_v0.8.0.json](../../data/schedule/option_c_v0.8.0.json) - SSOT data
- [MapPanel.tsx](../../components/map/MapPanel.tsx) - Map integration
