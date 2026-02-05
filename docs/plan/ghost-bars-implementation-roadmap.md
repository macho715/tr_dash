---
doc_id: ghost-bars-implementation-roadmap
created: 2026-02-05
refs: [ghost-bars-use-cases.md, ghost-bars-phase1-implementation.md, AGENTS.md, lib/gantt/visTimelineMapper.ts]
contract_version: v0.8.0
---

# Ghost Bars - Complete Implementation Roadmap

**Created**: 2026-02-05  
**Project**: TR 이동 대시보드  
**Feature**: Ghost Bars 다중 시나리오 확장 (10 scenarios)  
**Estimated Duration**: 3 phases over 12 weeks

---

## Executive Summary

Ghost Bars는 "변경 전/후 비교"를 시각화하는 핵심 UX 패턴입니다. 현재 **Reflow Preview**에 성공적으로 구현되었으며, 이를 **10가지 시나리오**로 확장합니다.

### 10 Scenarios Overview

| # | Scenario | Priority | Difficulty | Impact | Duration |
|---|----------|----------|------------|--------|----------|
| 1 | **What-If Simulation** | P0 | Low | Very High | 1 week |
| 2 | **Baseline Comparison** | P0 | Low | High | 1 week |
| 3 | **Manual Drag Preview** | P1 | Medium | High | 2 weeks |
| 4 | **Weather Delay Preview** | P1 | Medium | Very High | 2 weeks |
| 5 | **Critical Path Changes** | P1 | Medium | High | 2 weeks |
| 6 | **Resource Leveling** | P2 | High | High | 3 weeks |
| 7 | **History Replay** | P2 | Medium | Medium | 2 weeks |
| 8 | **Multi-Scenario Compare** | P2 | High | Very High | 3 weeks |
| 9 | **Dependency Propagation** | P3 | High | Medium | 2 weeks |
| 10 | **AI Optimization** | P3 | Very High | Very High | Future |

### Expected Overall Impact

| Category | Metric | Improvement |
|----------|--------|-------------|
| **Decision Speed** | Scenario analysis time | 3x faster |
| **Risk Response** | Weather delay response | 80% faster |
| **UX Quality** | Drag errors | 90% reduction |
| **Visibility** | Baseline compliance | 100% tracking |
| **Efficiency** | Collision identification | 70% faster |

### Phase Structure

- **Phase 1 (Weeks 1-2)**: Foundation - What-If + Baseline (P0)
- **Phase 2 (Weeks 3-6)**: Core Features - Drag + Weather + CP (P1)
- **Phase 3 (Weeks 7-12)**: Advanced - Leveling + History + Multi-Scenario (P2)

---

## Phase 1: Foundation (Weeks 1-2) — P0 Quick Wins

**Goal**: Establish Ghost Bar infrastructure and deliver immediate business value

**Status**: ✅ Detailed plan exists in `ghost-bars-phase1-implementation.md`

### 1.1 What-If Simulation (Scenario #1) — 1 week

**Business Value**: 
- Decision speed 3x faster
- Risk response time 70% faster
- Enables "what if SPMT breaks down?" scenarios without plan modification

**Implementation** (from existing phase1 plan):

```typescript
// components/ops/WhatIfPanel.tsx
export interface WhatIfScenario {
  activity_id: string
  delay_days: number
  reason: string
  confidence?: number
}

export function simulateWhatIf(
  activities: ScheduleActivity[],
  scenario: WhatIfScenario
): WhatIfResult {
  const activity = activities.find(a => a.activity_id === scenario.activity_id)
  if (!activity) throw new Error("Activity not found")
  
  const newStart = addDays(activity.planned_start, scenario.delay_days)
  
  const result = reflowSchedule(activities, scenario.activity_id, newStart, {
    respectLocks: true,
    checkResourceConflicts: true
  })
  
  return {
    ghostConfig: {
      type: "what_if",
      changes: result.impact_report.changes,
      metadata: {
        scenario: scenario.reason,
        confidence: scenario.confidence || 0.85
      },
      style: { color: "orange", dashPattern: "5,5" }
    },
    impact: result.impact_report,
    metrics: {
      affected_count: result.impact_report.changes.length,
      total_delay_days: scenario.delay_days,
      new_conflicts: result.impact_report.conflicts.length
    }
  }
}
```

**UI Flow**:
```
User clicks activity → "What-If" button → WhatIfPanel opens
→ Input delay days + reason → "Simulate" button
→ Ghost bars show cascaded impacts (orange dashed)
→ Badge: [WHAT-IF: SPMT breakdown, +3 days] | [COL: 2 new conflicts]
→ [Apply] or [Cancel]
```

**Acceptance Criteria**:
- [ ] WhatIfPanel renders with activity selection
- [ ] Delay input validates (1-90 days)
- [ ] Ghost bars display in orange dashed pattern
- [ ] Cascaded impacts calculated correctly (reflow engine)
- [ ] Metrics display: Affected count, Total delay, New conflicts
- [ ] Apply button updates option_c.json (with history event)
- [ ] Cancel button clears ghost bars
- [ ] No option_c.json modification until Apply

**Testing**:
```typescript
// __tests__/what-if-simulation.test.ts
it("should simulate SPMT breakdown delay cascade", () => {
  const scenario = {
    activity_id: "A1030",
    delay_days: 3,
    reason: "SPMT breakdown"
  }
  
  const result = simulateWhatIf(activities, scenario)
  
  expect(result.metrics.affected_count).toBeGreaterThan(0)
  expect(result.ghostConfig.type).toBe("what_if")
  expect(result.ghostConfig.metadata.scenario).toBe("SPMT breakdown")
})
```

---

### 1.2 Baseline Comparison (Scenario #2) — 1 week

**Business Value**:
- Baseline compliance tracking 100%
- Audit response time 90% faster
- "Why delayed?" questions answered instantly

**Implementation** (from existing phase1 plan):

```typescript
// lib/ssot/baseline-manager.ts
export interface Baseline {
  baseline_id: string
  name: string
  approved_at: string
  approved_by?: string
  activities: ScheduleActivity[]
  locked: boolean
}

export function compareWithBaseline(
  baseline: Baseline,
  current: ScheduleActivity[]
): DateChange[] {
  const changes: DateChange[] = []
  
  baseline.activities.forEach(baselineActivity => {
    const currentActivity = current.find(
      a => a.activity_id === baselineActivity.activity_id
    )
    
    if (!currentActivity) return
    
    if (
      baselineActivity.planned_start !== currentActivity.planned_start ||
      baselineActivity.planned_finish !== currentActivity.planned_finish
    ) {
      changes.push({
        activity_id: baselineActivity.activity_id,
        old_start: baselineActivity.planned_start,
        new_start: currentActivity.planned_start,
        old_finish: baselineActivity.planned_finish,
        new_finish: currentActivity.planned_finish,
        reason: "Baseline deviation"
      })
    }
  })
  
  return changes
}
```

**UI Flow**:
```
Control Bar: [Baseline Overlay: ON] [Last Approved: 2026-01-20]

Timeline:
┈┈┈┈┈┈┈┈┈ (Baseline: Feb 10-12, green dashed)
▓▓▓▓▓▓▓▓▓▓▓ (Current: Feb 13-15, solid)
Badge: [DELAYED vs Baseline: +3 days]
```

**Acceptance Criteria**:
- [ ] "Show Baseline" toggle in Control Bar
- [ ] Baseline snapshot saved with approval metadata
- [ ] Ghost bars display in green dashed pattern (baseline position)
- [ ] Current plan displays in solid color (actual status)
- [ ] Badge shows deviation: [DELAYED +Xd] or [ADVANCED -Xd]
- [ ] Baseline timestamp displayed
- [ ] Read-only (no Apply in baseline overlay mode)

**Testing**:
```typescript
// __tests__/baseline-comparison.test.ts
it("should detect delayed activities from baseline", () => {
  const baseline = createBaseline(baselineActivities, "Approved Plan")
  const changes = compareWithBaseline(baseline, currentActivities)
  
  const delayed = changes.filter(c => 
    new Date(c.new_start) > new Date(c.old_start)
  )
  
  expect(delayed.length).toBeGreaterThan(0)
  expect(delayed[0].reason).toBe("Baseline deviation")
})
```

---

### Phase 1 Deliverables

**Checklist**:
- [ ] What-If simulation functional (orange ghost bars)
- [ ] Baseline comparison functional (green ghost bars)
- [ ] GhostBarConfig type supports "what_if" | "baseline"
- [ ] CSS classes: `.ghost-bar-what-if`, `.ghost-bar-baseline`
- [ ] All unit tests pass (>95% coverage)
- [ ] Integration tests pass
- [ ] option_c.json validation passes
- [ ] No SSOT violations

**Validation Command**:
```bash
pnpm typecheck && pnpm lint && pnpm test
pnpm test __tests__/integration/ghost-bars-phase1.test.ts
scripts/validate_optionc.py --strict
```

---

## Phase 2: Core Features (Weeks 3-6) — P1 High Impact

**Goal**: Enhance drag interactions, weather integration, and critical path tracking

### 2.1 Manual Drag Preview (Scenario #3) — 2 weeks

**Business Value**:
- Drag errors 90% reduction
- Reflow trust 50% improvement
- Original position always visible

**Implementation**:

```typescript
// components/gantt/VisTimelineGantt.tsx
const handleItemMoving = (item: TimelineItem, callback: Function) => {
  const originalStart = item.start
  const originalEnd = item.end
  
  // 1. Create ghost at original position
  const ghostItem: VisItem = {
    id: `ghost_drag_${item.id}`,
    group: item.group,
    start: originalStart,
    end: originalEnd,
    className: "ghost-bar-drag",
    type: "background",
    title: "Original position"
  }
  
  setDragGhosts([ghostItem])
  
  // 2. Calculate reflow preview
  const newStart = callback.start
  const reflowResult = reflowSchedule(activities, item.id, newStart, {
    respectLocks: true
  })
  
  // 3. Show cascaded ghosts
  const cascadedGhosts = reflowResult.impact_report.changes.map(change => ({
    activity_id: change.activity_id,
    old_start: change.old_start,
    old_finish: change.old_finish,
    new_start: change.new_start,
    new_finish: change.new_finish
  }))
  
  setReflowPreview({
    changes: cascadedGhosts,
    conflicts: reflowResult.impact_report.conflicts,
    isDragging: true
  })
  
  // 4. Update tooltip
  setDragTooltip(`Move from ${format(originalStart, 'MMM d')} → ${format(newStart, 'MMM d')}. Affects ${cascadedGhosts.length} activities.`)
}

const handleItemMoved = (item: TimelineItem) => {
  // Show Apply/Cancel after drop
  setShowApplyButtons(true)
}

const handleDragApply = async () => {
  await applyReflow(reflowPreview)
  clearDragGhosts()
  setShowApplyButtons(false)
}

const handleDragCancel = () => {
  timeline.setItems(originalItems) // Restore
  clearDragGhosts()
  setShowApplyButtons(false)
}
```

**UI Flow**:
```
Timeline (드래그 중):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
| A1030  ┈┈┈┈┈┈┈ (Ghost: Original, gray dashed)
|        🖐️ ▓▓▓▓▓▓▓▓▓ (Dragging: New position)

| A1040  ┈┈┈┈┈┈┈ (Ghost: Original)
|        ▓▓▓▓▓▓▓▓▓ (Reflow cascaded)

Tooltip: "Move A1030 from Feb 10 → Feb 13. Affects 3 activities."
[Apply] [Cancel]
```

**Acceptance Criteria**:
- [ ] Ghost bar appears at original position during drag
- [ ] Dragged item follows cursor smoothly
- [ ] Cascaded activities show ghosts in real-time
- [ ] Tooltip displays impact summary
- [ ] Apply/Cancel buttons appear after drop
- [ ] Cancel restores exact original positions
- [ ] Apply triggers reflow with history event
- [ ] Performance: <100ms reflow calculation during drag

**Testing**:
```typescript
// __tests__/manual-drag-preview.test.ts
it("should show ghost at original position during drag", async () => {
  const { container } = render(<VisTimelineGantt activities={activities} />)
  
  const activity = screen.getByTestId("activity-A1030")
  
  // Start drag
  fireEvent.mouseDown(activity, { clientX: 100, clientY: 100 })
  fireEvent.mouseMove(activity, { clientX: 150, clientY: 100 })
  
  // Check ghost
  await waitFor(() => {
    expect(container.querySelector(".ghost-bar-drag")).toBeInTheDocument()
  })
  
  // Check tooltip
  expect(screen.getByText(/Affects \d+ activities/)).toBeInTheDocument()
})
```

---

### 2.2 Weather Delay Preview (Scenario #4) — 2 weeks

**Business Value**:
- Weather risk response 80% faster
- Safety violations 100% prevented
- Automated delay forecasting

**Implementation**:

```typescript
// lib/weather/weather-delay-preview.ts
export interface WeatherEvent {
  severity: number // 0-10
  Hs: number // Wave height (m)
  wind: number // Wind speed (kt)
  limit: { Hs: number, wind: number }
  affected_activity_ids: string[]
  predicted_delay_days: number
  confidence: number // 0-1
  forecast_valid_until: string
}

export function simulateWeatherDelay(
  activities: ScheduleActivity[],
  weatherEvent: WeatherEvent
): WeatherDelayResult {
  // 1. Filter marine activities
  const affectedActivities = activities.filter(a => 
    weatherEvent.affected_activity_ids.includes(a.activity_id) &&
    a.marine_activity === true
  )
  
  // 2. Apply delay
  const delayedActivities = affectedActivities.map(a => ({
    ...a,
    planned_start: addDays(a.planned_start, weatherEvent.predicted_delay_days)
  }))
  
  // 3. Reflow schedule
  const reflowResult = reflowMultipleActivities(
    activities,
    delayedActivities,
    { respectLocks: true }
  )
  
  return {
    ghostConfig: {
      type: "weather",
      changes: reflowResult.impact_report.changes,
      metadata: {
        trigger: "WEATHER",
        scenario: `High wave: Hs ${weatherEvent.Hs}m (limit ${weatherEvent.limit.Hs}m)`,
        confidence: weatherEvent.confidence,
        expires_at: weatherEvent.forecast_valid_until
      },
      style: { color: "red", dashPattern: "8,4", opacity: 0.8 }
    },
    alert: {
      level: weatherEvent.severity > 7 ? "CRITICAL" : "HIGH",
      message: `Weather delay predicted: +${weatherEvent.predicted_delay_days} days for ${affectedActivities.length} marine activities`,
      actions: ["Accept Delay", "Request Alternative Route"]
    },
    impact: reflowResult.impact_report
  }
}
```

**UI Flow**:
```
Alert Panel: 
⚠️ WEATHER DELAY PREDICTED (Confidence: 92%)
High wave forecast: Hs 4.5m (limit: 3.0m)
Expected delay: +3 days for 2 marine activities

Timeline:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
| A1100  ┈┈┈┈┈┈┈ (Ghost: Original plan)
| [SEA]  ▓▓▓▓▓▓▓▓▓▓▓ (Weather delay: +3 days, red dashed)
|        Badge: [WEATHER: Hs 4.5m, 92%]

Total Impact: 5 activities delayed, Project ETA: +3 days
[Accept Delay] [Request Alternative Route]
```

**Acceptance Criteria**:
- [ ] Weather API integration (data/schedule/weather.json)
- [ ] Marine activities auto-detected (activity.marine_activity flag)
- [ ] Ghost bars display in red dashed pattern
- [ ] Alert panel shows weather warning with confidence %
- [ ] Badge: [WEATHER: Hs 4.5m, 92%]
- [ ] Forecast expiry time displayed
- [ ] Accept/Reject delay actions functional
- [ ] Integration with Weather Overlay layer (from vis-timeline plan)

**Testing**:
```typescript
// __tests__/weather-delay-preview.test.ts
it("should predict delay when wave height exceeds limit", () => {
  const weatherEvent: WeatherEvent = {
    severity: 8,
    Hs: 4.5,
    wind: 25,
    limit: { Hs: 3.0, wind: 30 },
    affected_activity_ids: ["A1100", "A1110"],
    predicted_delay_days: 3,
    confidence: 0.92,
    forecast_valid_until: "2026-02-08T18:00:00Z"
  }
  
  const result = simulateWeatherDelay(activities, weatherEvent)
  
  expect(result.ghostConfig.type).toBe("weather")
  expect(result.alert.level).toBe("CRITICAL")
  expect(result.impact.changes.length).toBeGreaterThan(0)
})
```

---

### 2.3 Critical Path Change Tracking (Scenario #5) — 2 weeks

**Business Value**:
- CP awareness 90% faster
- Project delay risk early detection
- Automatic CP shift notification

**Implementation**:

```typescript
// lib/gantt/critical-path-tracker.ts
export interface CPChangeResult {
  removed: ScheduleActivity[] // Lost CP status
  added: ScheduleActivity[]   // Became CP
  stable: ScheduleActivity[]  // Still CP
  ghostConfig: GhostBarConfig
  alerts: Alert[]
}

export function trackCriticalPathChanges(
  oldActivities: ScheduleActivity[],
  newActivities: ScheduleActivity[]
): CPChangeResult {
  // 1. Calculate old CP
  const oldSlackMap = calculateSlack(oldActivities, PROJECT_END_DATE)
  const oldCP = oldActivities.filter(a => oldSlackMap[a.activity_id] === 0)
  
  // 2. Calculate new CP
  const newSlackMap = calculateSlack(newActivities, PROJECT_END_DATE)
  const newCP = newActivities.filter(a => newSlackMap[a.activity_id] === 0)
  
  // 3. Detect changes
  const removed = oldCP.filter(a => !newCP.find(n => n.activity_id === a.activity_id))
  const added = newCP.filter(a => !oldCP.find(o => o.activity_id === a.activity_id))
  const stable = newCP.filter(a => oldCP.find(o => o.activity_id === a.activity_id))
  
  return {
    removed,
    added,
    stable,
    ghostConfig: {
      type: "cp_change",
      changes: removed.map(a => ({
        activity_id: a.activity_id,
        old_start: a.planned_start,
        old_finish: a.planned_finish,
        new_start: a.planned_start,
        new_finish: a.planned_finish,
        metadata: {
          reason: "Lost CP status",
          new_slack: newSlackMap[a.activity_id]
        }
      })),
      style: { color: "green", dashPattern: "4,4", opacity: 0.5 }
    },
    alerts: added.map(a => ({
      level: "HIGH",
      message: `${a.name} is now on Critical Path (0 slack)`
    }))
  }
}
```

**UI Flow**:
```
Timeline:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
| A1030  ┈┈┈┈┈┈┈ (Ghost: Was CP, green dashed)
|        ▓▓▓▓▓▓▓▓▓ (No longer CP, normal border)
|        Badge: [CP LOST: +2 days slack]

| A1040  ▓▓▓▓▓▓▓▓▓ (New CP, red pulsing border)
|        Badge: [NEW CP: 0 slack]

Alert: ⚠️ Critical Path changed! A1040 is now CP (0 slack).
```

**Acceptance Criteria**:
- [ ] Ghost bars show activities that LOST CP status (green dashed)
- [ ] New CP activities have pulsing red border animation
- [ ] Badge: [CP LOST: +Xd slack] or [NEW CP: 0 slack]
- [ ] Alert notification for CP changes
- [ ] CP legend updated in Timeline
- [ ] Integration with CP Highlight feature (from vis-timeline plan)

**Testing**:
```typescript
// __tests__/critical-path-tracker.test.ts
it("should detect CP shift when activity delays", () => {
  const delayed = updateActivity(activities, "A1030", {
    planned_start: addDays(activities[0].planned_start, 3)
  })
  
  const result = trackCriticalPathChanges(activities, delayed)
  
  expect(result.removed.length).toBeGreaterThan(0)
  expect(result.added.length).toBeGreaterThan(0)
  expect(result.ghostConfig.type).toBe("cp_change")
})
```

---

### Phase 2 Deliverables

**Checklist**:
- [ ] Manual drag preview functional (gray ghost bars)
- [ ] Weather delay preview functional (red ghost bars)
- [ ] Critical path change tracking functional (green ghost bars)
- [ ] GhostBarConfig supports "drag" | "weather" | "cp_change"
- [ ] CSS classes: `.ghost-bar-drag`, `.ghost-bar-weather`, `.ghost-bar-cp-change`
- [ ] All unit tests pass
- [ ] Integration tests pass
- [ ] Weather integration with weather.json validated
- [ ] CP calculation accuracy verified

**Validation Command**:
```bash
pnpm typecheck && pnpm lint && pnpm test
pnpm test __tests__/integration/ghost-bars-phase2.test.ts
pnpm test lib/weather/__tests__/weather-delay-preview.test.ts
scripts/validate_optionc.py --strict
```

---

## Phase 3: Advanced Features (Weeks 7-12) — P2 Strategic Value

**Goal**: Resource optimization, history tracking, and multi-scenario planning

### 3.1 Resource Leveling Preview (Scenario #6) — 3 weeks

**Business Value**:
- Resource conflict resolution 60% faster
- Manual reallocation errors 80% reduction
- Automated optimization

**Implementation**:

```typescript
// lib/ops/resource-leveling.ts
export interface LevelingOptions {
  resource: string // "SPMT_01"
  strategy: "minimize_delay" | "minimize_cost" | "balance_load"
}

export function levelResources(
  activities: ScheduleActivity[],
  options: LevelingOptions
): LevelingResult {
  // 1. Find resource conflicts
  const conflicts = detectResourceConflicts(activities, options.resource)
  
  // 2. Apply leveling strategy
  let leveledActivities = [...activities]
  
  if (options.strategy === "minimize_delay") {
    // Shift lower-priority activities
    conflicts.forEach(conflict => {
      const conflictActivities = conflict.activity_ids.map(id => getActivity(id))
      const sortedByPriority = conflictActivities.sort((a, b) => b.priority - a.priority)
      
      // Keep high-priority, shift low-priority
      const toShift = sortedByPriority.slice(1)
      toShift.forEach(activity => {
        const newStart = calculateNextAvailableSlot(activity, options.resource)
        leveledActivities = updateActivity(leveledActivities, activity.activity_id, {
          planned_start: newStart
        })
      })
    })
  }
  
  // 3. Calculate metrics
  const totalDelay = calculateTotalDelay(activities, leveledActivities)
  
  return {
    leveledActivities,
    changes: calculateDateChanges(activities, leveledActivities),
    metrics: {
      total_delay_days: totalDelay,
      conflicts_resolved: conflicts.length,
      cost_impact: 0 // Placeholder
    },
    ghostConfig: {
      type: "leveling",
      changes: calculateDateChanges(activities, leveledActivities),
      metadata: {
        strategy: options.strategy,
        metrics: { totalDelay, conflictsResolved: conflicts.length }
      },
      style: { color: "purple", dashPattern: "6,4" }
    }
  }
}
```

**UI Flow**:
```
Resource Leveling Panel:
[Resource: SPMT_01]
[Strategy: Minimize Delay ▼]
[Level Resources]

Timeline:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SPMT_01:
| A1030  ┈┈┈┈┈┈┈ (Ghost: Original, conflict)
|        ▓▓▓▓▓▓▓▓▓ (Leveled: Shifted +2 days, purple dashed)

| A1040  ▓▓▓▓▓▓▓▓▓ (Unchanged)

Metrics:
- Conflicts resolved: 2 → 0
- Total delay: +2 days (minimal)
- Cost impact: $0 (no overtime)

[Apply Leveling] [Try Another Strategy]
```

**Acceptance Criteria**:
- [ ] User selects resource + leveling strategy
- [ ] Ghost bars show shifted activities (purple dashed)
- [ ] Metrics display: Conflicts resolved, Total delay, Cost
- [ ] "Apply Leveling" applies changes to option_c.json
- [ ] "Try Another Strategy" allows comparison
- [ ] Strategy options: minimize_delay, minimize_cost, balance_load

**Testing**:
```typescript
// __tests__/resource-leveling.test.ts
it("should resolve SPMT conflicts with minimal delay", () => {
  const options: LevelingOptions = {
    resource: "SPMT_01",
    strategy: "minimize_delay"
  }
  
  const result = levelResources(activities, options)
  
  expect(result.metrics.conflicts_resolved).toBe(2)
  expect(result.metrics.total_delay_days).toBeLessThanOrEqual(3)
  expect(result.ghostConfig.type).toBe("leveling")
})
```

---

### 3.2 History Replay (Scenario #7) — 2 weeks

**Business Value**:
- Audit response 90% faster
- Change tracking 100% visibility
- "Why delayed?" instant answers

**Implementation**:

```typescript
// lib/ssot/history-replay.ts
export function replayHistory(
  currentPlan: ScheduleActivity[],
  historyDate: Date
): HistoryReplayResult {
  // 1. Load snapshot from history
  const snapshot = loadHistorySnapshot(historyDate)
  
  // 2. Compare with current plan
  const differences = compareSnapshots(snapshot.activities, currentPlan)
  
  return {
    ghostConfig: {
      type: "history",
      changes: differences,
      metadata: {
        timestamp: historyDate.toISOString(),
        scenario: "Historical Plan"
      },
      style: { color: "gray", dashPattern: "4,4", opacity: 0.5 }
    },
    events: snapshot.events.filter(e => 
      isAfter(new Date(e.timestamp), historyDate)
    ),
    summary: {
      total_changes: differences.length,
      delayed_count: differences.filter(d => new Date(d.new_start) > new Date(d.old_start)).length,
      advanced_count: differences.filter(d => new Date(d.new_start) < new Date(d.old_start)).length
    }
  }
}
```

**UI Flow**:
```
Control Bar: [History: 2026-01-20 ▼] [Current Plan Overlay: ON]

Timeline:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
| A1030  ▓▓▓▓▓▓▓▓▓ (2026-01-20: Feb 10-12)
|        ┈┈┈┈┈┈┈┈┈┈┈ (Ghost: Current Feb 13-15, gray dashed)
|        Badge: [DELAYED since 2026-01-20: +3 days]

History Events:
- 2026-01-21: Weather delay applied (+2 days)
- 2026-01-25: Resource reallocation (+1 day)
```

**Acceptance Criteria**:
- [ ] History mode has date picker
- [ ] Historical plan shows in solid colors
- [ ] Current plan overlays as gray ghosts
- [ ] Timeline shows events between history date and now
- [ ] Badge: [DELAYED since {date}: +Xd]
- [ ] Read-only (no Apply in History mode)

**Testing**:
```typescript
// __tests__/history-replay.test.ts
it("should show plan changes since historical date", () => {
  const historyDate = new Date("2026-01-20")
  const result = replayHistory(currentActivities, historyDate)
  
  expect(result.summary.total_changes).toBeGreaterThan(0)
  expect(result.ghostConfig.type).toBe("history")
  expect(result.events.length).toBeGreaterThan(0)
})
```

---

### 3.3 Multi-Scenario Compare (Scenario #8) — 3 weeks

**Business Value**:
- Decision time 70% faster
- Scenario confidence improved
- Executive reporting quality

**Implementation**:

```typescript
// lib/compare/multi-scenario.ts
export interface Scenario {
  name: string
  color: string
  activities: ScheduleActivity[]
}

export function compareScenarios(
  baseline: ScheduleActivity[],
  scenarios: Scenario[]
): MultiScenarioResult {
  const scenarioDiffs = scenarios.map(scenario => ({
    name: scenario.name,
    color: scenario.color,
    changes: compareSnapshots(baseline, scenario.activities),
    metrics: calculateScenarioMetrics(scenario.activities)
  }))
  
  return {
    ghostConfigs: scenarioDiffs.map(diff => ({
      type: "multi",
      changes: diff.changes,
      metadata: {
        scenario: diff.name,
        metrics: diff.metrics
      },
      style: {
        color: diff.color,
        dashPattern: "5,5",
        opacity: 0.7
      }
    })),
    comparisonTable: {
      headers: ["Scenario", "Total Days", "Cost", "Risk"],
      rows: scenarioDiffs.map(diff => [
        diff.name,
        diff.metrics.total_days,
        diff.metrics.total_cost,
        diff.metrics.risk_score
      ])
    }
  }
}
```

**UI Flow**:
```
Control Bar: [Compare: A/B/C ▼] [Fast Track: Cyan] [Cost: Green] [Balanced: Yellow]

Timeline:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
| A1030  ▬▬▬▬▬▬▬ (Baseline: Feb 10-12)
|        ┈┈┈┈┈┈┈┈┈┈┈ (Cyan: Fast Track, Feb 9-11, -1 day)
|        ┈┈┈┈┈┈┈┈┈┈┈┈┈ (Green: Cost, Feb 13-15, +3 days)
|        ┈┈┈┈┈┈┈┈┈┈┈ (Yellow: Balanced, Feb 11-13, +1 day)

Comparison Table:
| Scenario      | Total Days | Cost      | Risk  |
|---------------|------------|-----------|-------|
| Fast Track    | 42         | $120,000  | High  |
| Cost Optimized| 48         | $90,000   | Low   |
| Balanced      | 45         | $105,000  | Med   |

[Select: Balanced]
```

**Acceptance Criteria**:
- [ ] User can add up to 3 scenarios (A/B/C)
- [ ] Each scenario has distinct color (cyan/green/yellow)
- [ ] Ghost bars overlay simultaneously (multi-layer)
- [ ] Comparison table shows metrics side-by-side
- [ ] "Select" applies chosen scenario to Live mode
- [ ] Legend shows scenario colors

**Testing**:
```typescript
// __tests__/multi-scenario.test.ts
it("should compare 3 scenarios with distinct colors", () => {
  const scenarios: Scenario[] = [
    { name: "Fast Track", color: "cyan", activities: fastActivities },
    { name: "Cost Optimized", color: "green", activities: costActivities },
    { name: "Balanced", color: "yellow", activities: balancedActivities }
  ]
  
  const result = compareScenarios(baseline, scenarios)
  
  expect(result.ghostConfigs.length).toBe(3)
  expect(result.comparisonTable.rows.length).toBe(3)
})
```

---

### 3.4 Dependency Propagation (Scenario #9) — 2 weeks (Optional)

**Business Value**:
- Dependency understanding 80% improved
- Educational value for new users
- Chain reaction visualization

**Implementation**:

```typescript
// lib/gantt/propagation-chain.ts
export interface PropagationStep {
  activity_id: string
  depth: number
  delay_ms: number
  old_start: Date
  new_start: Date
}

export function traceDependencyChain(
  activities: ScheduleActivity[],
  rootActivityId: string
): PropagationChain {
  const chain: PropagationStep[] = []
  const visited = new Set<string>()
  
  function traverse(activityId: string, depth: number, delay: number) {
    if (visited.has(activityId)) return
    visited.add(activityId)
    
    const activity = getActivity(activityId)
    chain.push({
      activity_id: activityId,
      depth,
      delay_ms: delay,
      old_start: activity.planned_start,
      new_start: addDays(activity.planned_start, depth)
    })
    
    // Find dependent activities
    const dependents = activities.filter(a => 
      a.dependencies?.some(d => d.from_activity_id === activityId)
    )
    
    dependents.forEach(dep => {
      traverse(dep.activity_id, depth + 1, delay + 200)
    })
  }
  
  traverse(rootActivityId, 0, 0)
  return { steps: chain }
}

// Animate ghost bars sequentially
export function animatePropagation(chain: PropagationChain): void {
  chain.steps.forEach(step => {
    setTimeout(() => {
      addGhostBar(step, { className: "ghost-bar-propagation fade-in" })
      animateDependencyArrow(step.activity_id, step.delay_ms)
    }, step.delay_ms)
  })
}
```

**Acceptance Criteria**:
- [ ] Ghost bars appear sequentially (200ms delay)
- [ ] Dependency arrows animate from root to dependents
- [ ] Badge: [PROPAGATION: {count} activities in {duration}]
- [ ] Animation can be paused/replayed
- [ ] Educational tooltips explain each step

---

### 3.5 AI Optimization (Scenario #10) — Future Placeholder

**Status**: ⏳ Future (requires AI integration)

**Placeholder Implementation**:

```typescript
// lib/ops/ai-optimization.ts (Future)
export async function optimizeScheduleWithAI(
  activities: ScheduleActivity[],
  objectives: string[]
): Promise<AIOptimizationResult> {
  // 1. Call AI optimization API
  const aiSuggestion = await fetch("/api/ai-optimize", {
    method: "POST",
    body: JSON.stringify({ activities, objectives })
  })
  
  // 2. Return ghost config
  return {
    ghostConfig: {
      type: "ai",
      changes: aiSuggestion.optimized_plan,
      metadata: {
        ai_score: aiSuggestion.score,
        improvements: aiSuggestion.metrics,
        reasoning: aiSuggestion.explanation
      },
      style: { color: "purple", dashPattern: "8,4" }
    }
  }
}
```

---

### Phase 3 Deliverables

**Checklist**:
- [ ] Resource leveling functional (purple ghost bars)
- [ ] History replay functional (gray ghost bars)
- [ ] Multi-scenario compare functional (multi-color ghosts)
- [ ] Dependency propagation animation functional (optional)
- [ ] GhostBarConfig supports "leveling" | "history" | "multi"
- [ ] All unit tests pass
- [ ] Integration tests pass
- [ ] Performance: Multi-scenario render <2s

**Validation Command**:
```bash
pnpm typecheck && pnpm lint && pnpm test
pnpm test __tests__/integration/ghost-bars-phase3.test.ts
scripts/validate_optionc.py --strict
```

---

## Technical Architecture

### Ghost Bar Type System

```typescript
// lib/gantt/types/ghost-bars.ts
export type GhostBarType = 
  | "reflow"        // Current: Reflow preview (exists)
  | "what_if"       // Phase 1: Scenario simulation
  | "baseline"      // Phase 1: Baseline comparison
  | "drag"          // Phase 2: Manual drag ghost
  | "weather"       // Phase 2: Weather delay
  | "cp_change"     // Phase 2: Critical path shift
  | "leveling"      // Phase 3: Resource leveling
  | "history"       // Phase 3: Historical replay
  | "multi"         // Phase 3: Multi-scenario
  | "ai"            // Future: AI optimization

export interface GhostBarConfig {
  type: GhostBarType
  changes: DateChange[]
  metadata?: {
    scenario?: string
    trigger?: string
    confidence?: number
    metrics?: Record<string, any>
    expires_at?: string
  }
  style?: {
    color?: string
    dashPattern?: string
    opacity?: number
  }
}
```

### CSS Class Naming

```css
/* app/globals.css */

/* Phase 1 */
.ghost-bar-what-if {
  border: 2px dashed rgba(255, 165, 0, 0.7) !important; /* Orange */
  background: rgba(251, 146, 60, 0.18) !important;
}

.ghost-bar-baseline {
  border: 2px dashed rgba(34, 197, 94, 0.7) !important; /* Green */
  background: rgba(34, 197, 94, 0.12) !important;
}

/* Phase 2 */
.ghost-bar-drag {
  border: 2px dashed rgba(156, 163, 175, 0.7) !important; /* Gray */
  background: rgba(156, 163, 175, 0.1) !important;
}

.ghost-bar-weather {
  border: 2px dashed rgba(239, 68, 68, 0.7) !important; /* Red */
  background: rgba(239, 68, 68, 0.15) !important;
}

.ghost-bar-cp-change {
  border: 2px dashed rgba(34, 197, 94, 0.7) !important; /* Green */
  opacity: 0.5;
}

/* Phase 3 */
.ghost-bar-leveling {
  border: 2px dashed rgba(147, 51, 234, 0.7) !important; /* Purple */
  background: rgba(147, 51, 234, 0.12) !important;
}

.ghost-bar-history {
  border: 2px dashed rgba(107, 114, 128, 0.7) !important; /* Gray */
  opacity: 0.5;
}

.ghost-bar-multi {
  /* Color set dynamically based on scenario */
  border-width: 2px;
  border-style: dashed;
  opacity: 0.7;
}

.ghost-bar-ai {
  border: 2px dashed rgba(147, 51, 234, 0.8) !important; /* Purple */
  background: rgba(147, 51, 234, 0.15) !important;
}
```

---

## Testing Strategy

### Unit Tests Coverage

```typescript
// __tests__/ghost-bars/
├── what-if-simulation.test.ts
├── baseline-comparison.test.ts
├── manual-drag-preview.test.ts
├── weather-delay-preview.test.ts
├── critical-path-tracker.test.ts
├── resource-leveling.test.ts
├── history-replay.test.ts
├── multi-scenario.test.ts
└── propagation-chain.test.ts
```

### Integration Tests

```typescript
// __tests__/integration/ghost-bars-e2e.test.ts
describe("Ghost Bars End-to-End", () => {
  it("should support all 10 ghost bar types", async () => {
    const ghostTypes: GhostBarType[] = [
      "reflow", "what_if", "baseline", "drag", "weather",
      "cp_change", "leveling", "history", "multi", "ai"
    ]
    
    ghostTypes.forEach(type => {
      const config = createGhostConfig(type, mockChanges)
      const items = addGhostBars(config)
      expect(items.length).toBeGreaterThan(0)
      expect(items[0].className).toContain(`ghost-bar-${type}`)
    })
  })
})
```

### Visual Regression Tests

```typescript
// __tests__/visual/ghost-bars-appearance.test.ts
import { toMatchImageSnapshot } from 'jest-image-snapshot'

describe("Ghost Bars Visual Regression", () => {
  it("should match baseline ghost bar appearance", async () => {
    const { container } = render(
      <VisTimelineGantt 
        activities={activities}
        ghostConfig={{
          type: "baseline",
          changes: baselineChanges,
          style: { color: "green", dashPattern: "3,3" }
        }}
      />
    )
    
    expect(container).toMatchImageSnapshot()
  })
})
```

---

## Success Metrics

### Performance Metrics

| Metric | Phase 1 Target | Phase 2 Target | Phase 3 Target |
|--------|----------------|----------------|----------------|
| Ghost bar render time | <100ms | <100ms | <200ms (multi) |
| Reflow calculation | <500ms | <500ms | <1s (leveling) |
| UI responsiveness | <50ms | <50ms | <50ms |

### Business Metrics

| Scenario | Metric | Baseline | Target |
|----------|--------|----------|--------|
| What-If | Decision time | Manual | <60s |
| Baseline | Compliance tracking | 0% | 100% |
| Drag | Error rate | Unknown | <5% |
| Weather | Response time | Unknown | <10min |
| CP | Awareness time | Unknown | <30s |
| Leveling | Conflict resolution | Manual | 60% faster |
| History | Audit response | Unknown | 90% faster |
| Multi | Scenario comparison | Manual | <5min |

---

## Implementation Timeline

```
Week 1-2: Phase 1 (P0)
├── Week 1: What-If Simulation
└── Week 2: Baseline Comparison

Week 3-6: Phase 2 (P1)
├── Week 3-4: Manual Drag Preview
├── Week 5: Weather Delay Preview
└── Week 6: Critical Path Changes

Week 7-12: Phase 3 (P2)
├── Week 7-9: Resource Leveling
├── Week 10-11: History Replay
└── Week 12: Multi-Scenario Compare

(Optional)
├── Week 13-14: Dependency Propagation
└── Future: AI Optimization
```

---

## SSOT Contract Compliance

### Preview → Apply Workflow

All Ghost Bar scenarios follow strict Preview → Apply separation:

```typescript
// lib/ops/preview-apply-workflow.ts
export async function previewChange(
  activities: ScheduleActivity[],
  changeRequest: ChangeRequest
): Promise<PreviewResult> {
  // 1. Calculate impact WITHOUT modifying option_c.json
  const reflowResult = reflowSchedule(activities, changeRequest)
  
  // 2. Generate ghost bar config
  const ghostConfig = createGhostConfig(changeRequest.type, reflowResult)
  
  // 3. Return preview (no SSOT mutation)
  return {
    ghostConfig,
    impact: reflowResult.impact_report,
    conflicts: reflowResult.impact_report.conflicts,
    canApply: reflowResult.impact_report.conflicts.every(c => c.severity < 0.8)
  }
}

export async function applyChange(
  previewResult: PreviewResult
): Promise<ApplyResult> {
  // 1. Validate user has permission (Live mode only)
  if (viewMode !== "Live") {
    throw new Error("Cannot apply changes in read-only mode")
  }
  
  // 2. Apply changes to option_c.json
  const updatedActivities = applyDateChanges(
    activities,
    previewResult.ghostConfig.changes
  )
  
  // 3. Record history event (append-only)
  const historyEvent: HistoryEvent = {
    event_id: generateId(),
    timestamp: new Date(),
    event_type: previewResult.ghostConfig.type,
    actor: getCurrentUser(),
    changes: previewResult.ghostConfig.changes,
    reason: previewResult.ghostConfig.metadata?.scenario
  }
  appendHistory(historyEvent)
  
  // 4. Validate option_c.json integrity
  await validateOptionC(updatedActivities)
  
  // 5. Save to SSOT
  await saveOptionC(updatedActivities)
  
  return { success: true, historyEvent }
}
```

---

## References

### Source Documents
- [ghost-bars-use-cases.md](./ghost-bars-use-cases.md) - Original 10 scenarios
- [ghost-bars-phase1-implementation.md](./ghost-bars-phase1-implementation.md) - Detailed Phase 1 plan
- [innovation-scout-vis-timeline-upgrade-20260204.md](./innovation-scout-vis-timeline-upgrade-20260204.md) - VisTimeline integration

### Project Standards
- [AGENTS.md](../../AGENTS.md) - SSOT rules, Preview→Apply, View Modes
- [patch.md](../../patch.md) - UX rules (Where→When/What→Evidence, 2-click)

### Code References
- [lib/gantt/visTimelineMapper.ts](../../lib/gantt/visTimelineMapper.ts) - Current Ghost Bar implementation
- [components/gantt/VisTimelineGantt.tsx](../../components/gantt/VisTimelineGantt.tsx) - Timeline component

---

**Next Steps**:
1. Review Phase 1 detailed plan in `ghost-bars-phase1-implementation.md`
2. Start Week 1: What-If Simulation implementation
3. Set up project board with tasks from this roadmap
4. Begin Phase 1 deliverables

**Plan Status**: ✅ Ready for Implementation  
**Start Date**: Week 1 (immediate)  
**Completion Target**: Week 12 (Phase 3)
