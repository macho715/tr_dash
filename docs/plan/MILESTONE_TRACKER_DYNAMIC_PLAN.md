# Milestone Tracker SSOT Dynamic Integration - Implementation Plan

**Date:** February 6, 2026  
**Task:** MilestoneTracker 동적 SSOT 연동  
**Priority:** Post-production enhancement  
**Estimated Effort:** 3-5 days

---

## 1. Executive Summary

Transform MilestoneTracker from static hardcoded display to dynamic SSOT-driven component that:
- Calculates real-time status from activity actual/planned dates
- Shows voyage-specific milestone progress
- Integrates with Record Actual Dates feature
- Supports Historical replay in History mode

---

## 2. File Changes Required

### 2.1 Core Changes

| File | Change Type | Lines Affected | Purpose |
|------|-------------|----------------|---------|
| `components/dashboard/milestone-tracker.tsx` | **Refactor** | ~48 → ~150 | Add props, dynamic calculation, voyage filtering |
| `lib/utils/milestone-calculator.ts` | **New** | ~100 | Pure calculation logic (testable) |
| `lib/utils/__tests__/milestone-calculator.test.ts` | **New** | ~200 | TDD unit tests |
| `components/dashboard/sections/overview-section.tsx` | **Update** | +5 lines | Pass props to MilestoneTracker |
| `app/page.tsx` | **Update** | +3 lines | Pass activities, selectedDate, selectedVoyage |

### 2.2 Integration Changes

| File | Change Type | Purpose |
|------|-------------|---------|
| `components/dashboard/voyage-cards.tsx` | **Optional** | Use shared milestone calculator |
| `components/dashboard/voyage-focus-drawer.tsx` | **Optional** | Use shared milestone calculator |

---

## 3. Implementation Phases

### Phase 1: Core Dynamic Calculation (TDD) - 1-2 days

**Goal:** Extract calculation logic, add tests, maintain backward compatibility

#### Step 1.1: Create Utility Module (Red → Green → Refactor)

**File:** `lib/utils/milestone-calculator.ts`

```typescript
// RED: Write failing test first
describe("calculateMilestoneStatus", () => {
  it("should return 'done' when activity has actual_finish", () => {
    const activity = createMockActivity({ actual_finish: "2026-01-31T18:00" })
    const status = calculateMilestoneStatus(activity, new Date("2026-02-06"))
    expect(status).toBe("done")
  })
})

// GREEN: Implement minimal logic
export function calculateMilestoneStatus(
  activity: ScheduleActivity | undefined,
  selectedDate: Date
): "done" | "in-progress" | "pending" {
  if (!activity) return "pending"
  
  // Check actual dates (SSOT authority)
  if (activity.actual_finish) return "done"
  if (activity.actual_start) return "in-progress"
  
  // Check planned vs selected date
  const plannedStart = parseUTCDate(activity.planned_start)
  const plannedFinish = parseUTCDate(activity.planned_finish)
  
  if (selectedDate >= plannedFinish) return "done"
  if (selectedDate >= plannedStart) return "in-progress"
  
  return "pending"
}

// REFACTOR: Add voyage-specific finder
export function findMilestoneActivity(
  milestoneLabel: string,
  voyageNumber: number,
  activities: ScheduleActivity[]
): ScheduleActivity | undefined {
  // Map milestone label to activity name pattern
  const patterns: Record<string, RegExp> = {
    "Load-out": /Loading of AGI TR Unit \d+ on SPMT/i,
    "Sail-away": /LCT Sails away/i,
    "Load-in": /Load-in TR Unit \d+ at AGI/i,
    "Turning": /Turning TR Unit \d+ by 180/i,
    "Jack-down": /Jack-down of TR Unit \d+/i,
  }
  
  const pattern = patterns[milestoneLabel]
  if (!pattern) return undefined
  
  return activities.find(a => 
    a.voyage_id === `V${voyageNumber}` && 
    pattern.test(a.activity_name || "")
  )
}
```

**Tests to Write (TDD):**
```typescript
// lib/utils/__tests__/milestone-calculator.test.ts

describe("calculateMilestoneStatus", () => {
  it("returns 'pending' when no activity provided")
  it("returns 'done' when actual_finish exists")
  it("returns 'in-progress' when actual_start exists but no actual_finish")
  it("returns 'done' when selectedDate >= planned_finish (no actual)")
  it("returns 'in-progress' when selectedDate >= planned_start (no actual)")
  it("returns 'pending' when selectedDate < planned_start")
})

describe("findMilestoneActivity", () => {
  it("finds Load-out activity for voyage 1")
  it("finds Sail-away activity for voyage 2")
  it("returns undefined for invalid milestone label")
  it("returns undefined when no matching activity found")
  it("filters by voyage_id correctly")
  it("matches activity_name pattern case-insensitively")
})

describe("getMilestoneStatusForVoyage", () => {
  it("calculates all 5 milestone statuses for a voyage")
  it("respects actual dates over planned dates")
  it("handles missing activities gracefully")
  it("updates status when selectedDate changes")
})
```

**TDD Workflow:**
1. Write test → Red
2. Implement function → Green
3. Refactor for clarity → Still Green
4. Commit: `[Behavioral] Add milestone status calculator`

#### Step 1.2: Refactor MilestoneTracker Component

**File:** `components/dashboard/milestone-tracker.tsx`

**Changes:**
1. Add props interface (backward compatible)
2. Use calculation utility when props provided
3. Fallback to static display when props missing

```typescript
interface MilestoneTrackerProps {
  voyage?: Voyage | null
  selectedDate?: Date
  activities?: ScheduleActivity[]
  onMilestoneClick?: (milestone: string) => void
}

export function MilestoneTracker({
  voyage,
  selectedDate,
  activities,
  onMilestoneClick,
}: MilestoneTrackerProps) {
  // Static fallback (backward compatible)
  const staticMilestones = [
    { label: "Load-out", status: "done" },
    { label: "Sail-away", status: "in-progress" },
    { label: "Load-in", status: "pending" },
    { label: "Turning", status: "pending" },
    { label: "Jack-down", status: "pending" },
  ] as const
  
  // Dynamic calculation (when props provided)
  const dynamicMilestones = useMemo(() => {
    if (!voyage || !selectedDate || !activities) return null
    
    return staticMilestones.map(m => ({
      label: m.label,
      status: calculateMilestoneStatusForVoyage(
        m.label,
        voyage.voyage,
        activities,
        selectedDate
      )
    }))
  }, [voyage, selectedDate, activities])
  
  const milestones = dynamicMilestones || staticMilestones
  
  // ... rest of render logic (same)
}
```

**Commit:**
- `[Structural] Add props interface to MilestoneTracker (backward compatible)`
- `[Behavioral] Integrate dynamic milestone calculation`

---

### Phase 2: Voyage-Specific Integration - 1 day

**Goal:** Connect MilestoneTracker to voyage selection state

#### Step 2.1: Update overview-section.tsx

**File:** `components/dashboard/sections/overview-section.tsx`

```typescript
export function OverviewSection({
  activities,
  selectedVoyage,      // Add prop
  selectedDate,        // Add prop
  onApplyActivities,
  onSetActivities,
  onFocusActivity,
}: OverviewSectionProps) {
  return (
    <section id="overview" aria-label="Operation Overview" className="space-y-4">
      <OperationOverviewRibbon />
      <MilestoneTracker 
        voyage={selectedVoyage}
        selectedDate={selectedDate}
        activities={activities}
      />
      {/* ... rest */}
    </section>
  )
}
```

#### Step 2.2: Update app/page.tsx

**File:** `app/page.tsx`

```typescript
// Pass props from page state to OverviewSection
<OverviewSection
  activities={activities}
  selectedVoyage={selectedVoyage}  // Already tracked in state
  selectedDate={selectedDate}      // From useDate() context
  onApplyActivities={handleApplyActivities}
  onSetActivities={setActivities}
  onFocusActivity={handleActivityClick}
/>
```

**Commit:**
- `[Behavioral] Connect MilestoneTracker to voyage selection and date context`

---

### Phase 3: Record Actual Dates Real-Time Integration - 1 day

**Goal:** Milestone status updates immediately when actual dates are saved

#### Step 3.1: Leverage Existing State Management

**Current Flow (Already Works!):**
```
User saves actual dates
  → POST /api/activities/:id/actual
  → Updates option_c.json (SSOT)
  → Returns updated activity
  → app/page.tsx updates activities state (handleActualUpdate)
  → MilestoneTracker re-renders (useMemo dependency on activities)
  → Status recalculates automatically
```

**No Code Changes Required!** The existing React state flow handles this.

**Verification Test:**
1. Select activity A1030 (Load-out for Voyage 1)
2. Enter actual_finish: `2026-01-31T18:00`
3. Click [Save Actual Dates]
4. **Expected:** Load-out milestone changes from "pending" → "done"
5. **Verify:** MilestoneTracker re-renders with updated status

**Test Case:**
```typescript
// lib/utils/__tests__/milestone-calculator.test.ts

it("updates status when actual dates are added", () => {
  const activity = createMockActivity({ 
    planned_start: "2026-01-29T08:00",
    planned_finish: "2026-01-29T18:00"
  })
  
  // Before: no actual dates
  let status = calculateMilestoneStatus(activity, new Date("2026-02-06"))
  expect(status).toBe("done") // Past planned finish
  
  // After: actual_finish added
  activity.actual_finish = "2026-01-29T19:00"
  status = calculateMilestoneStatus(activity, new Date("2026-02-06"))
  expect(status).toBe("done") // Still done (with actual evidence)
})
```

---

### Phase 4: History Mode & ViewMode Support - 1 day

**Goal:** Accurate milestone status replay in different view modes

#### Step 4.1: Add ViewMode Parameter

**File:** `lib/utils/milestone-calculator.ts`

```typescript
export function calculateMilestoneStatus(
  activity: ScheduleActivity | undefined,
  selectedDate: Date,
  viewMode: "Live" | "History" | "Approval" | "Compare" = "Live"
): "done" | "in-progress" | "pending" {
  if (!activity) return "pending"
  
  // In History mode: only use data as-of selectedDate
  // (Actual dates are immutable, so they're always valid)
  if (viewMode === "History") {
    // History logic: check if actual dates exist and are <= selectedDate
    if (activity.actual_finish) {
      const actualFinishDate = parseUTCDate(activity.actual_finish)
      if (selectedDate >= actualFinishDate) return "done"
    }
    if (activity.actual_start) {
      const actualStartDate = parseUTCDate(activity.actual_start)
      if (selectedDate >= actualStartDate) return "in-progress"
    }
  } else {
    // Live/Approval/Compare: use latest actual data
    if (activity.actual_finish) return "done"
    if (activity.actual_start) return "in-progress"
  }
  
  // Fallback to planned dates
  const plannedStart = parseUTCDate(activity.planned_start)
  const plannedFinish = parseUTCDate(activity.planned_finish)
  
  if (selectedDate >= plannedFinish) return "done"
  if (selectedDate >= plannedStart) return "in-progress"
  
  return "pending"
}
```

#### Step 4.2: Pass ViewMode to MilestoneTracker

**File:** `components/dashboard/sections/overview-section.tsx`

```typescript
<MilestoneTracker 
  voyage={selectedVoyage}
  selectedDate={selectedDate}
  activities={activities}
  viewMode={viewMode}  // Add this
/>
```

**Tests:**
```typescript
describe("History mode milestone calculation", () => {
  it("shows 'pending' for actual dates after selectedDate")
  it("shows 'done' for actual dates before selectedDate")
  it("ignores future actual dates in History mode")
})
```

---

## 4. Testing Strategy

### 4.1 Unit Tests (TDD Approach)

**File:** `lib/utils/__tests__/milestone-calculator.test.ts`

**Test Coverage:**
- ✅ Status calculation logic (all edge cases)
- ✅ Activity finding by pattern matching
- ✅ Voyage-specific filtering
- ✅ ViewMode handling
- ✅ Date comparison logic
- ✅ Null/undefined safety

**Run Command:**
```bash
pnpm test:run lib/utils/__tests__/milestone-calculator.test.ts
```

### 4.2 Integration Tests

**File:** `__tests__/integration/milestone-tracker-dynamic.test.ts` (new)

```typescript
describe("MilestoneTracker Dynamic Integration", () => {
  it("displays static milestones when no props provided")
  it("calculates voyage-specific statuses when voyage selected")
  it("updates status when actual dates are saved")
  it("respects History mode time boundaries")
  it("shows correct status for each voyage (1-7)")
})
```

### 4.3 Browser Verification Tests

**Manual Test Plan:**

□ **Test 1:** Open dashboard → MilestoneTracker shows default static display  
□ **Test 2:** Select Voyage 1 → Milestones update to Voyage 1 specific status  
□ **Test 3:** Record actual finish for A1030 (Load-out) → Load-out changes to "done"  
□ **Test 4:** Switch to History mode, set date to Jan 28 → All milestones show "pending"  
□ **Test 5:** Set history date to Feb 03 → Load-out, Sail-away show "done"  
□ **Test 6:** Switch back to Live → Latest actual data displayed  
□ **Test 7:** Select different voyage → Milestones recalculate for new voyage

---

## 5. Performance Optimization

### 5.1 Calculation Complexity

**Big-O Analysis:**
- `findMilestoneActivity`: O(n) where n = number of activities
- Total for 5 milestones: O(5n) = O(n)
- Current activity count: ~150 activities
- **Expected runtime:** <5ms (well within budget)

### 5.2 Memoization Strategy

```typescript
// In MilestoneTracker component
const calculatedMilestones = useMemo(() => {
  if (!voyage || !selectedDate || !activities) return null
  
  return MILESTONE_LABELS.map(label => ({
    label,
    status: calculateMilestoneStatusForVoyage(
      label,
      voyage.voyage,
      activities,
      selectedDate,
      viewMode
    ),
    activity: findMilestoneActivity(label, voyage.voyage, activities)
  }))
}, [voyage, selectedDate, activities, viewMode])
// Only recalculate when dependencies change
```

**Dependencies:**
- `voyage` - changes when user selects different voyage
- `selectedDate` - changes when date picker updates
- `activities` - changes when actual dates saved or reflow applied
- `viewMode` - changes when view mode switches

**Re-render Triggers:**
- User selects different voyage: ~1 time per session
- Date picker change: ~5-10 times per session
- Actual date save: ~1-2 times per activity
- ViewMode switch: ~2-3 times per session

**Estimated re-calculations per session:** <20 (very low overhead)

---

## 6. Backward Compatibility Strategy

### 6.1 Progressive Enhancement Approach

```typescript
// Default behavior (no props) - Static display (current)
<MilestoneTracker />

// Enhanced behavior (with props) - Dynamic display (new)
<MilestoneTracker 
  voyage={selectedVoyage}
  selectedDate={selectedDate}
  activities={activities}
  viewMode={viewMode}
/>
```

### 6.2 Fallback Logic

```typescript
export function MilestoneTracker({
  voyage,
  selectedDate,
  activities,
  viewMode = "Live",
  onMilestoneClick,
}: MilestoneTrackerProps = {}) {  // All props optional
  
  const staticMilestones = [ /* hardcoded */ ]
  
  const dynamicMilestones = useMemo(() => {
    // Only calculate if ALL required props provided
    if (!voyage || !selectedDate || !activities) return null
    
    return calculateAllMilestones(voyage, selectedDate, activities, viewMode)
  }, [voyage, selectedDate, activities, viewMode])
  
  // Use dynamic if available, fallback to static
  const milestones = dynamicMilestones || staticMilestones
  
  // ... render (same JSX)
}
```

**Guarantee:** Existing behavior unchanged if props not provided

---

## 7. Activity-to-Milestone Mapping (Data Contract)

### 7.1 Mapping Table

| Milestone | Activity Pattern | Voyage 1 ID | Voyage 2 ID | ... |
|-----------|------------------|-------------|-------------|-----|
| **Load-out** | `"Loading of AGI TR Unit \d+ on SPMT"` | A1030 | A2030 | A2190, A2350, A2510, A2660, A2810 |
| **Sail-away** | `"LCT Sails away"` | A1060 | A2060 | A2210, A2380, A2530, A2680, A2830 |
| **Load-in** | `"Load-in TR Unit \d+ at AGI"` | A1110 | A2110 | A2260, A2430, A2580, A2730, A2880 |
| **Turning** | `"Turning TR Unit \d+ by 180"` | A1130 | A2130 | A2280, A2450, A2600, A2750, A2900 |
| **Jack-down** | `"Jack-down of TR Unit \d+"` | A1140 | A2140 | A2300, A2460, A2610, A2760, A2910 |

### 7.2 Validation Strategy

**Sanity Check:**
```typescript
// In development mode, warn if milestone activity not found
if (process.env.NODE_ENV === "development") {
  if (!activity) {
    console.warn(`Milestone activity not found: ${label} for Voyage ${voyage}`)
  }
}
```

**Unit Test:**
```typescript
it("finds milestone activity for all 7 voyages", () => {
  for (let v = 1; v <= 7; v++) {
    const loadOutActivity = findMilestoneActivity("Load-out", v, activities)
    expect(loadOutActivity).toBeDefined()
    expect(loadOutActivity?.voyage_id).toBe(`V${v}`)
  }
})
```

---

## 8. Integration with Record Actual Dates

### 8.1 Data Flow (Already Works!)

```
[User enters actual dates in ActualInputSection]
  ↓
POST /api/activities/:id/actual
  ↓
updateActualDates(activityId, { actualStart, actualEnd })
  ↓
Update option_c.json (SSOT)
  ↓
app/page.tsx: handleActualUpdate receives updated activity
  ↓
setActivities([...updated activities])
  ↓
React re-renders: MilestoneTracker receives new activities prop
  ↓
useMemo recalculates milestone statuses
  ↓
UI updates: milestone status changes (pending → done)
```

**No Additional Code Required!** React's reactivity handles this automatically.

### 8.2 Verification Test

**Browser Test:**
1. ✅ Select Voyage 1
2. ✅ Observe Load-out milestone status (should be calculated from A1030)
3. ✅ Find activity A1030 in Gantt/Schedule
4. ✅ Open DetailPanel → ActualInputSection
5. ✅ Enter actual_finish: `2026-01-31T18:00`
6. ✅ Click [Save Actual Dates]
7. ✅ Toast: "Actual dates saved."
8. ✅ **Expected:** Load-out milestone automatically updates to "done" ✅
9. ✅ Verify: No page refresh required

---

## 9. ViewMode Integration

### 9.1 Behavior by ViewMode

| ViewMode | Milestone Status Source | Interaction |
|----------|------------------------|-------------|
| **Live** | Latest actual + planned dates | Show real-time progress |
| **History** | Actual dates ≤ selectedDate, planned dates | Historical replay (as-of date) |
| **Approval** | Baseline snapshot milestone status | Read-only approval view |
| **Compare** | Baseline vs current delta | Show milestone shifts |

### 9.2 Implementation

**Pass viewMode to calculator:**
```typescript
const milestones = useMemo(() => {
  if (!voyage || !selectedDate || !activities) return staticMilestones
  
  return MILESTONE_LABELS.map(label => ({
    label,
    status: calculateMilestoneStatus(
      findMilestoneActivity(label, voyage.voyage, activities),
      selectedDate,
      viewMode  // ← Add this parameter
    )
  }))
}, [voyage, selectedDate, activities, viewMode])
```

---

## 10. Rollback Plan

### 10.1 Feature Flag Approach (Recommended)

**Environment Variable:**
```typescript
const ENABLE_DYNAMIC_MILESTONES = 
  process.env.NEXT_PUBLIC_DYNAMIC_MILESTONES === "true"

export function MilestoneTracker({ ... }: MilestoneTrackerProps) {
  const useDynamic = ENABLE_DYNAMIC_MILESTONES && 
                     voyage && 
                     selectedDate && 
                     activities
  
  const milestones = useDynamic 
    ? calculateDynamicMilestones(...) 
    : staticMilestones
  
  // ... render
}
```

**Rollback Steps:**
1. Set `NEXT_PUBLIC_DYNAMIC_MILESTONES=false` in Vercel
2. Redeploy (immediate rollback to static behavior)
3. No code changes required

### 10.2 Git Rollback (If Needed)

```bash
# If feature causes issues, revert commits
git revert <commit-hash-milestone-enhancement>
git push origin main

# Vercel auto-deploys the revert
```

---

## 11. File Structure Summary

### New Files (2)
```
lib/
  utils/
    milestone-calculator.ts          # Core calculation logic (~100 lines)
    __tests__/
      milestone-calculator.test.ts    # Unit tests (~200 lines)

__tests__/
  integration/
    milestone-tracker-dynamic.test.ts # Integration tests (~150 lines)
```

### Modified Files (3)
```
components/
  dashboard/
    milestone-tracker.tsx            # Add props, use calculator (+80 lines)
    sections/
      overview-section.tsx           # Pass props (+5 lines)

app/
  page.tsx                           # Pass state to overview (+3 lines)
```

### Total LOC Change
- **New:** ~450 lines (tests + calculator)
- **Modified:** ~88 lines (components + integration)
- **Total:** ~538 lines

---

## 12. Commit Strategy

### Structural Commits (Refactoring)
```bash
git commit -m "[Structural] Extract milestone calculation to utility module"
git commit -m "[Structural] Add MilestoneTracker props interface (backward compatible)"
```

### Behavioral Commits (Features)
```bash
git commit -m "[Behavioral] Add dynamic milestone status calculation from SSOT"
git commit -m "[Behavioral] Integrate MilestoneTracker with voyage selection"
git commit -m "[Behavioral] Add History mode support for milestone replay"
```

### Test Commits
```bash
git commit -m "[Test] Add unit tests for milestone calculator"
git commit -m "[Test] Add integration tests for dynamic milestone tracker"
```

**Total Commits:** 5-7 (small, atomic)

---

## 13. Quality Gates

### 13.1 Pre-Commit Checks

```bash
# Run tests
pnpm test:run lib/utils/__tests__/milestone-calculator.test.ts

# Type check
pnpm exec tsc --noEmit

# Lint
pnpm run lint

# Build
pnpm run build
```

### 13.2 SSOT Validation

```bash
# Validate option_c.json integrity
python scripts/validate_optionc.py

# Expected: CONTRACT PASS (no SSOT modifications)
```

### 13.3 Acceptance Criteria

- [ ] All existing tests pass (274 tests)
- [ ] New tests pass (milestone calculator unit tests)
- [ ] No TypeScript errors introduced
- [ ] SSOT validation passes (CONTRACT PASS)
- [ ] Browser verification: all 7 voyages show correct milestone status
- [ ] Real-time update works: actual date save → milestone status update
- [ ] History mode works: past dates show historical milestone status
- [ ] Performance: status calculation <50ms

---

## 14. Risk Assessment

### Low Risk Items ✅
- Adding optional props (backward compatible)
- Creating new utility module (isolated)
- Unit tests (no side effects)

### Medium Risk Items ⚠️
- Integration with voyage selection (state dependency)
- useMemo dependencies (re-render triggers)

### Mitigation Strategy
- Feature flag for easy rollback
- Extensive unit tests before integration
- Browser testing on all 7 voyages
- Performance profiling during development

---

## 15. Success Metrics

### Phase 1 Success:
- [ ] Unit tests pass (10+ test cases)
- [ ] Calculator function works for all 5 milestones
- [ ] All 7 voyages supported

### Phase 2 Success:
- [ ] Milestone status changes when voyage selected
- [ ] Static fallback works when no voyage selected
- [ ] Performance <50ms per calculation

### Phase 3 Success:
- [ ] Milestone updates after actual date save (no refresh)
- [ ] Toast notification appears
- [ ] Gantt and MilestoneTracker stay in sync

### Phase 4 Success:
- [ ] History mode shows accurate past milestone status
- [ ] ViewMode transitions preserve correctness
- [ ] Compare mode shows baseline vs current (optional)

---

## 16. Development Timeline

| Phase | Duration | Dependencies | Deliverable |
|-------|----------|--------------|-------------|
| **Phase 1:** Core calculator + tests | 1-2 days | None | `milestone-calculator.ts` + unit tests |
| **Phase 2:** Component integration | 1 day | Phase 1 | Dynamic MilestoneTracker component |
| **Phase 3:** Real-time updates | 1 day | Phase 2 | Integration with actual date saves |
| **Phase 4:** ViewMode support | 1 day | Phase 3 | History mode milestone replay |
| **Testing & Polish** | 1 day | All phases | Browser verification, performance tuning |

**Total:** 3-5 days (depending on testing thoroughness)

---

## 17. Implementation Order (TDD)

### Day 1: Red → Green → Refactor (Calculator)

**Morning:**
1. Write failing test: `calculateMilestoneStatus` returns "pending" for future activity
2. Implement minimal logic: always return "pending"
3. Write test: returns "done" for past activity with actual_finish
4. Implement: check actual_finish, return "done"
5. Write test: returns "in-progress" for activity with actual_start only
6. Implement: check actual_start, return "in-progress"
7. Refactor: extract date parsing logic

**Afternoon:**
8. Write test: `findMilestoneActivity` finds Load-out for Voyage 1
9. Implement: pattern matching for "Loading of AGI TR Unit"
10. Write test: finds all 5 milestones for all 7 voyages
11. Implement: complete pattern map for all milestones
12. Refactor: extract pattern definitions to const

**Commit:** `[Behavioral] Add milestone status calculator with full test coverage`

### Day 2: Component Integration

**Morning:**
13. Refactor MilestoneTracker: add props interface (backward compatible)
14. Commit: `[Structural] Add optional props to MilestoneTracker`
15. Implement: use calculator when props provided, fallback to static
16. Run all tests: verify no regressions
17. Commit: `[Behavioral] Integrate dynamic milestone calculation`

**Afternoon:**
18. Update overview-section.tsx: pass voyage, date, activities props
19. Update app/page.tsx: pass state to OverviewSection
20. Browser test: verify dynamic calculation works
21. Commit: `[Behavioral] Connect MilestoneTracker to voyage and date state`

### Day 3: Real-time & ViewMode

**Morning:**
22. Write test: milestone updates after actual date save
23. Verify: existing state flow handles this (no code needed!)
24. Browser test: save actual date → milestone updates
25. Add ViewMode parameter to calculator
26. Write tests: History mode respects selectedDate boundary

**Afternoon:**
27. Implement: ViewMode logic in calculator
28. Update MilestoneTracker: pass viewMode prop
29. Browser test: verify History mode shows correct past status
30. Commit: `[Behavioral] Add ViewMode support for milestone historical replay`

### Day 4-5: Testing & Polish

31. Run full test suite: `pnpm test:run`
32. Browser verification: all 7 voyages, all ViewModes
33. Performance profiling: ensure <50ms calculation
34. Documentation: update component docs
35. Final commit: `[Docs] Update MilestoneTracker documentation`

---

## 18. Post-Deployment Monitoring

### Metrics to Track

- **Render Performance:** MilestoneTracker render time
- **Calculation Performance:** Status calculation duration
- **User Engagement:** Milestone interaction rate (if interactive)
- **Error Rate:** Console errors related to milestone calculation

### Alerting

**Performance Alert:**
```typescript
if (calculationTime > 50) {
  console.warn(`Milestone calculation exceeded budget: ${calculationTime}ms`)
}
```

**Data Integrity Alert:**
```typescript
if (missingActivities.length > 0) {
  console.error(`Missing milestone activities for voyage ${voyage}:`, missingActivities)
}
```

---

## 19. Documentation Updates Required

### Component Documentation
- Update `milestone-tracker.tsx` JSDoc with props description
- Add usage examples for both static and dynamic modes

### Architecture Documentation
- Update `docs/LAYOUT.md` with milestone calculation flow
- Update `docs/MILESTONE_TRACKER_VERIFICATION.md` with enhancement details

### API Documentation
- Document `milestone-calculator.ts` public functions
- Add examples for testing and usage

---

## 20. Acceptance Checklist

### Code Quality
- [ ] All functions have TypeScript types
- [ ] All functions have JSDoc comments
- [ ] No `any` types introduced
- [ ] No console.log statements (use console.warn for dev warnings only)

### Testing
- [ ] 100% test coverage for milestone-calculator.ts
- [ ] Integration tests pass
- [ ] Browser verification complete

### SSOT Compliance
- [ ] No modifications to option_c.json schema
- [ ] Activity is authority for milestone status
- [ ] No duplication in Trip/TR objects
- [ ] validate_optionc.py passes (CONTRACT PASS)

### Performance
- [ ] Status calculation <50ms (measured)
- [ ] No unnecessary re-renders (React DevTools profiler)
- [ ] Memoization working correctly

### Deployment
- [ ] Feature flag configured (optional)
- [ ] Vercel preview deployment successful
- [ ] Production deployment plan ready
- [ ] Rollback procedure documented

---

**Plan Status:** ✅ **READY FOR IMPLEMENTATION**  
**Next Step:** Run `/go` to start TDD cycle (Red → Green → Refactor)  
**Estimated Completion:** 3-5 days (with full test coverage)

---

**End of Plan**
