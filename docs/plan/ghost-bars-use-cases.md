# Ghost Bars - 다양한 활용 시나리오 (Use Cases)

> **작성일**: 2026-02-04  
> **기반**: Live Reflow Ghost Bars 구현 완료 (`visTimelineMapper.ts`)  
> **목적**: Ghost Bars 기술을 다양한 TR 대시보드 시나리오에 확장 적용

---

## 📌 Executive Summary

Ghost Bars는 "변경 전/후 비교"를 시각화하는 강력한 UX 패턴입니다. 현재 **Reflow Preview**에만 적용되었지만, 아래 10가지 시나리오로 확장 가능합니다.

| 시나리오 | 우선순위 | 구현 난이도 | 예상 효과 | 적용 가능성 |
|---------|---------|------------|-----------|------------|
| 1. **What-If 시뮬레이션** | P0 | Low | Very High | ✅ 즉시 |
| 2. **Baseline 비교** | P0 | Low | High | ✅ 즉시 |
| 3. **Manual Drag Preview** | P1 | Medium | High | ✅ 2주 |
| 4. **Weather Delay Preview** | P1 | Medium | Very High | ✅ 2주 |
| 5. **Critical Path 변화** | P1 | Medium | High | ✅ 2주 |
| 6. **Resource Leveling** | P2 | High | High | ✅ 1개월 |
| 7. **History Replay** | P2 | Medium | Medium | ✅ 1개월 |
| 8. **Multi-Scenario Compare** | P2 | High | Very High | ✅ 1개월 |
| 9. **Dependency Propagation** | P3 | High | Medium | ✅ 2개월 |
| 10. **AI Optimization Suggestion** | P3 | Very High | Very High | ⚠️ AI 연동 |

---

## 1️⃣ What-If 시뮬레이션 (Scenario Planning)

### 문제
- 운영 중 "만약 SPMT가 고장나면?" 같은 가정을 테스트하려면 실제 plan 변경 필요
- 여러 시나리오를 비교하기 어려움

### 솔루션: Ghost Bars로 시뮬레이션
```typescript
// 사용자가 "만약 A1030이 3일 지연되면?" 입력
const whatIfScenario = {
  activity_id: "A1030",
  delay_days: 3,
  reason: "SPMT breakdown"
}

// Reflow 계산
const result = reflowSchedule(activities, whatIfScenario.activity_id, 
  addDays(activity.planned_start, whatIfScenario.delay_days), 
  { respectLocks: true }
)

// Ghost Bars로 표시 (실제 plan 변경 없이)
setReflowPreview({
  changes: result.impact_report.changes,
  conflicts: result.impact_report.conflicts,
  scenario: whatIfScenario.reason // "SPMT breakdown" 표시
})
```

### UI 예시
```
Timeline:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 A1030  [Current: Feb 10-12]
        ┈┈┈┈┈┈┈┈┈┈┈┈┈ (Ghost: Original)
        ▓▓▓▓▓▓▓▓▓▓▓▓▓ (What-If: Feb 13-15, +3 days)

 A1040  [Current: Feb 13-14]
        ┈┈┈┈┈┈┈┈┈ (Ghost)
        ▓▓▓▓▓▓▓▓▓▓▓ (Cascaded: Feb 16-17, +3 days)

Badge: [WHAT-IF: SPMT breakdown, +3 days] | [COL: 2 new conflicts]
```

### 예상 효과
- **의사결정 속도 3배 향상**: 실시간 시뮬레이션으로 회의 시간 단축
- **리스크 대응 시간 70% 단축**: 사전 시나리오 준비
- **ROI**: High (코드 재사용률 90%)

---

## 2️⃣ Baseline 비교 (Compare Mode 강화)

### 문제
- 현재 Compare 모드는 A/B 스냅샷 비교만 가능
- "승인된 baseline"과 현재 계획의 차이를 항상 보고 싶음

### 솔루션: Sticky Baseline Ghost
```typescript
// Option 1: Compare 모드에서 Baseline을 항상 Ghost로
const baselineGhosts = compareDelta?.differences.map(diff => ({
  activity_id: diff.activity_id,
  old_start: diff.baseline_start,  // Baseline
  new_start: diff.current_start,   // Current
  old_finish: diff.baseline_finish,
  new_finish: diff.current_finish
}))

// Option 2: Live 모드에서도 "Show Baseline" 토글
const [showBaseline, setShowBaseline] = useState(false)
if (showBaseline) {
  // Baseline을 Ghost로 overlay
}
```

### UI 예시
```
Control Bar: [Live] [Baseline Overlay: ON] [Last Approved: 2026-01-20]

Timeline:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 A1030  ┈┈┈┈┈┈┈┈┈ (Baseline: Feb 10-12, approved)
        ▓▓▓▓▓▓▓▓▓▓▓ (Current: Feb 13-15, +3 days)
        Badge: [DELAYED vs Baseline: +3 days]
```

### 예상 효과
- **Baseline 준수율 가시화**: 승인 계획 대비 실시간 비교
- **감사 대응 100% 개선**: "왜 지연되었나?" 즉시 답변 가능
- **ROI**: Very High (Approval 모드 핵심 기능)

---

## 3️⃣ Manual Drag Preview (실시간 드래그 피드백)

### 문제
- Activity를 드래그할 때 "변경 전" 위치를 기억하기 어려움
- 드래그 취소 시 원위치 찾기 어려움

### 솔루션: Drag Ghost + Reflow Preview
```typescript
// vis-timeline onMove 이벤트
const handleActivityDrag = (item: TimelineItem, callback: Function) => {
  const originalStart = item.start
  const originalEnd = item.end

  // Ghost bar 표시 (원래 위치)
  const ghostItem = {
    id: `drag_ghost_${item.id}`,
    group: item.group,
    start: originalStart,
    end: originalEnd,
    className: "ghost-bar-drag",
    title: "Original position (drag to move)"
  }

  // Reflow 계산 (드래그 중)
  const newStart = callback.start // 사용자가 드래그한 위치
  const reflowResult = reflowSchedule(activities, item.id, newStart)

  // Ghost bars + Reflow preview 동시 표시
  setReflowPreview({
    changes: reflowResult.impact_report.changes,
    dragGhost: ghostItem,
    isDragging: true
  })
}
```

### UI 예시
```
Timeline (드래그 중):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 A1030  ┈┈┈┈┈┈┈ (Ghost: Original, dashed)
        🖐️ ▓▓▓▓▓▓▓▓▓ (Dragging: New position)

 A1040  ┈┈┈┈┈┈┈ (Ghost)
        ▓▓▓▓▓▓▓▓▓ (Reflow cascaded)

Tooltip: "Move A1030 from Feb 10 → Feb 13. Affects 3 activities."
[Apply] [Cancel]
```

### 예상 효과
- **드래그 실수 90% 감소**: 원위치 명확히 표시
- **Reflow 신뢰도 50% 향상**: 영향 범위 실시간 확인
- **ROI**: Very High (UX 대폭 개선)

---

## 4️⃣ Weather Delay Preview (외부 요인 시뮬레이션)

### 문제
- 기상 악화로 해상 작업 3일 지연 예상 시, 영향 범위를 즉시 파악하기 어려움
- Weather Tie 데이터와 Timeline이 분리되어 있음

### 솔루션: Weather-Triggered Ghost Bars
```typescript
// Weather API에서 지연 예측 수신
const weatherDelay = {
  activity_ids: ["A1100", "A1110"], // 해상 작업
  delay_days: 3,
  reason: "High wave (Hs 4.5m > limit 3.0m)",
  confidence: 0.92
}

// Reflow + Ghost bars
const reflowResult = weatherDelay.activity_ids.map(id => 
  reflowSchedule(activities, id, addDays(getActivity(id).planned_start, 3))
)

setReflowPreview({
  changes: mergeReflowResults(reflowResult),
  trigger: "WEATHER",
  alertLevel: "HIGH",
  expires_at: "2026-02-08T18:00:00Z" // 기상 예보 유효 시간
})
```

### UI 예시
```
Alert Panel: 
⚠️ WEATHER DELAY PREDICTED (Confidence: 92%)
High wave forecast: Hs 4.5m (limit: 3.0m)
Expected delay: +3 days for 2 marine activities

Timeline:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 A1100  ┈┈┈┈┈┈┈ (Ghost: Original plan)
 [SEA]  ▓▓▓▓▓▓▓▓▓▓▓ (Weather delay: +3 days)
        Badge: [WEATHER: Hs 4.5m, 92%]

 A1110  ┈┈┈┈┈┈┈
 [SEA]  ▓▓▓▓▓▓▓▓▓▓▓ (Cascaded)

Total Impact: 5 activities delayed, Project ETA: +3 days
[Accept Delay] [Request Alternative Route]
```

### 예상 효과
- **기상 리스크 대응 시간 80% 단축**: 자동 시뮬레이션
- **Safety 위반 100% 방지**: 기상 한계 자동 반영
- **ROI**: Very High (물류 도메인 핵심 기능)

---

## 5️⃣ Critical Path 변화 추적

### 문제
- Activity 지연 시 Critical Path가 변경되는지 즉시 파악 어려움
- "어느 activity가 CP에서 빠졌고, 어느 것이 새로 CP가 되었는지" 불명확

### 솔루션: CP Change Ghost
```typescript
// Before reflow: 기존 CP
const oldCP = activities.filter(a => slackMap[a.activity_id] === 0)

// After reflow: 새로운 CP
const newSlackMap = calculateSlack(reflowPreview.nextActivities, PROJECT_END_DATE)
const newCP = reflowPreview.nextActivities.filter(a => newSlackMap[a.activity_id] === 0)

// CP 변화 표시
const cpChanges = {
  removed: oldCP.filter(a => !newCP.includes(a)), // CP에서 빠짐
  added: newCP.filter(a => !oldCP.includes(a))    // 새로 CP 됨
}
```

### UI 예시
```
Timeline:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 A1030  ┈┈┈┈┈┈┈ (Ghost: Was CP, green border)
        ▓▓▓▓▓▓▓▓▓ (No longer CP, grey)
        Badge: [CP LOST: +2 days slack]

 A1040  ▓▓▓▓▓▓▓▓▓ (New CP, red pulsing border)
        Badge: [NEW CP: 0 slack]

Alert: ⚠️ Critical Path changed! A1040 is now CP (0 slack).
```

### 예상 효과
- **CP 변화 인지 시간 90% 단축**: 실시간 강조
- **Project 지연 리스크 조기 발견**: CP 변경 자동 알림
- **ROI**: High

---

## 6️⃣ Resource Leveling Preview

### 문제
- Resource 충돌 해소를 위해 여러 activity를 재배치할 때, "어떤 순서로 옮겨야 최적인지" 판단 어려움

### 솔루션: Resource Leveling Ghost Bars
```typescript
// Resource leveling 알고리즘 실행
const levelingResult = levelResources(activities, {
  resource: "SPMT_01",
  strategy: "minimize_delay" // or "minimize_cost", "balance_load"
})

// 변경 전/후 비교
setReflowPreview({
  changes: levelingResult.changes,
  metrics: {
    total_delay: levelingResult.total_delay_days,
    conflict_count: levelingResult.conflicts_resolved,
    cost_impact: levelingResult.cost_delta
  },
  strategy: "Resource Leveling (minimize delay)"
})
```

### UI 예시
```
Timeline:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SPMT_01:
 A1030  ┈┈┈┈┈┈┈ (Ghost: Original, conflict)
        ▓▓▓▓▓▓▓▓▓ (Leveled: Shifted +2 days)

 A1040  ▓▓▓▓▓▓▓▓▓ (Unchanged)

 A1050  ┈┈┈┈┈┈┈ (Ghost: Was after A1040)
        ▓▓▓▓▓▓▓▓▓ (Leveled: Moved earlier)

Metrics:
- Conflicts resolved: 2 → 0
- Total delay: +2 days (minimal)
- Cost impact: $0 (no overtime)

[Apply Leveling] [Try Another Strategy]
```

### 예상 효과
- **Resource 충돌 해결 시간 60% 단축**: 자동 최적화
- **수동 재배치 오류 80% 감소**: 알고리즘 기반
- **ROI**: High (복잡한 일정에서 필수)

---

## 7️⃣ History Replay (타임머신 모드)

### 문제
- History 모드에서 "과거 어느 시점의 plan"을 보지만, "현재 plan과 무엇이 달라졌는지" 비교 어려움

### 솔루션: History Replay + Ghost Overlay
```typescript
// History 모드에서 날짜 선택
const historyDate = "2026-01-20"
const historicalPlan = loadHistorySnapshot(historyDate)

// 현재 plan을 Ghost로 overlay
setReflowPreview({
  changes: compareSnapshots(historicalPlan, activities),
  mode: "HISTORY_REPLAY",
  timestamp: historyDate
})
```

### UI 예시
```
Control Bar: [History: 2026-01-20] [Current Plan Overlay: ON]

Timeline:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 A1030  ▓▓▓▓▓▓▓▓▓ (2026-01-20: Feb 10-12)
        ┈┈┈┈┈┈┈┈┈┈┈ (Ghost: Current Feb 13-15, +3 days)
        Badge: [DELAYED since 2026-01-20: +3 days]

History Events:
- 2026-01-21: Weather delay applied (+2 days)
- 2026-01-25: Resource reallocation (+1 day)
```

### 예상 효과
- **감사 대응 시간 90% 단축**: 변경 이력 시각화
- **"왜 지연되었나?" 질문 즉시 답변**: 타임라인 추적
- **ROI**: Medium (Approval/Audit 필수)

---

## 8️⃣ Multi-Scenario Compare (A/B/C 동시 비교)

### 문제
- 3개 이상의 시나리오를 동시에 비교하고 싶음
- 예: "Option A (빠르지만 비쌈)", "Option B (느리지만 저렴)", "Option C (절충)"

### 솔루션: Multi-Ghost Layers
```typescript
const scenarios = [
  { name: "Fast Track", color: "cyan", changes: fastTrackReflow },
  { name: "Cost Optimized", color: "green", changes: costOptimizedReflow },
  { name: "Balanced", color: "yellow", changes: balancedReflow }
]

// Ghost bars를 색상별로 overlay
scenarios.forEach(scenario => {
  addGhostLayer(scenario.name, scenario.color, scenario.changes)
})
```

### UI 예시
```
Control Bar: [Compare: A/B/C] [Fast Track: Cyan] [Cost: Green] [Balanced: Yellow]

Timeline:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 A1030  ▬▬▬▬▬▬▬ (Baseline: Feb 10-12)
        ┈┈┈┈┈┈┈┈┈┈┈ (Cyan: Fast Track, Feb 9-11, -1 day)
        ┈┈┈┈┈┈┈┈┈┈┈┈┈ (Green: Cost, Feb 13-15, +3 days)
        ┈┈┈┈┈┈┈┈┈┈┈ (Yellow: Balanced, Feb 11-13, +1 day)

Comparison Table:
| Scenario      | Total Days | Cost      | Risk  |
|---------------|------------|-----------|-------|
| Fast Track    | 42         | $120,000  | High  |
| Cost Optimized| 48         | $90,000   | Low   |
| Balanced      | 45         | $105,000  | Med   |

[Select: Balanced]
```

### 예상 효과
- **의사결정 시간 70% 단축**: 시각적 비교
- **최적 시나리오 선택 신뢰도 향상**: 정량적 비교
- **ROI**: Very High (경영진 보고용)

---

## 9️⃣ Dependency Propagation Preview

### 문제
- Activity 지연 시 "어떤 dependency chain을 따라 영향이 전파되는지" 불명확

### 솔루션: Animated Ghost Propagation
```typescript
// Dependency chain 추적
const propagationChain = traceDependencyChain(activities, "A1030")

// Ghost bars를 순차적으로 애니메이션 (시간차 표시)
propagationChain.forEach((change, index) => {
  setTimeout(() => {
    addGhostBar(change, { delay: index * 200 }) // 200ms 간격
  }, index * 200)
})
```

### UI 예시
```
Timeline (애니메이션):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 A1030  ▓▓▓▓▓▓▓▓▓ → ┈┈┈┈┈┈┈┈┈ (1초: 지연 시작)
        ↓ FS dependency
 A1040  ▓▓▓▓▓▓▓▓▓ → ┈┈┈┈┈┈┈┈┈ (1.2초: 영향 전파)
        ↓ SS dependency
 A1050  ▓▓▓▓▓▓▓▓▓ → ┈┈┈┈┈┈┈┈┈ (1.4초: 추가 전파)

Badge: [PROPAGATION: 3 activities affected in 1.4s]
```

### 예상 효과
- **Dependency 이해도 80% 향상**: 시각적 애니메이션
- **교육 효과**: 신입 직원 온보딩
- **ROI**: Medium (UX 향상)

---

## 🔟 AI Optimization Suggestion (미래 기능)

### 문제
- 수동으로 최적 일정을 찾기 어려움
- "AI가 제안한 최적 일정"과 현재 plan 비교하고 싶음

### 솔루션: AI-Powered Ghost Bars
```typescript
// AI 최적화 API 호출
const aiSuggestion = await optimizeScheduleWithAI(activities, {
  objectives: ["minimize_duration", "balance_resources", "reduce_cost"],
  constraints: ["weather_safe", "permit_valid"]
})

// AI 제안을 Ghost로 표시
setReflowPreview({
  changes: aiSuggestion.optimized_plan,
  ai_score: aiSuggestion.score, // 0.0-1.0
  improvements: aiSuggestion.metrics,
  reasoning: aiSuggestion.explanation
})
```

### UI 예시
```
Timeline:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 A1030  ▓▓▓▓▓▓▓▓▓ (Current)
        ┈┈┈┈┈┈┈┈┈ (AI: Shift +1 day, score: 0.92)

AI Reasoning:
"Shifting A1030 by 1 day resolves 2 resource conflicts and 
 reduces total duration by 2 days with no cost increase."

Improvements:
- Duration: -2 days (45 → 43)
- Conflicts: -2 (4 → 2)
- Cost: $0

[Accept AI Suggestion] [Customize Parameters]
```

### 예상 효과
- **일정 최적화 시간 95% 단축**: AI 자동화
- **인간 오류 100% 제거**: 알고리즘 기반
- **ROI**: Very High (차세대 기능)

---

## 📊 우선순위 매트릭스

| 시나리오 | 구현 난이도 | 예상 효과 | 기술 위험 | 추천 순서 |
|---------|-----------|-----------|----------|----------|
| 1. What-If 시뮬레이션 | ⭐ Low | ⭐⭐⭐ Very High | Low | **1순위** |
| 2. Baseline 비교 | ⭐ Low | ⭐⭐⭐ High | Low | **2순위** |
| 3. Manual Drag Preview | ⭐⭐ Medium | ⭐⭐⭐ High | Medium | **3순위** |
| 4. Weather Delay | ⭐⭐ Medium | ⭐⭐⭐ Very High | Medium | **4순위** |
| 5. Critical Path | ⭐⭐ Medium | ⭐⭐ High | Low | **5순위** |
| 6. Resource Leveling | ⭐⭐⭐ High | ⭐⭐ High | High | 6순위 |
| 7. History Replay | ⭐⭐ Medium | ⭐⭐ Medium | Low | 7순위 |
| 8. Multi-Scenario | ⭐⭐⭐ High | ⭐⭐⭐ Very High | High | 8순위 |
| 9. Dependency Propagation | ⭐⭐⭐ High | ⭐⭐ Medium | Medium | 9순위 |
| 10. AI Optimization | ⭐⭐⭐⭐ Very High | ⭐⭐⭐ Very High | Very High | 10순위 |

---

## 🚀 실행 로드맵

### Phase 1 (Quick Wins) — 2주
- ✅ **Live Reflow Ghost Bars** (완료)
- 🎯 **What-If 시뮬레이션** (1주)
- 🎯 **Baseline 비교** (3일)

**예상 결과**: 의사결정 속도 3배, 감사 대응 90% 개선

---

### Phase 2 (Core Features) — 1개월
- 🎯 **Manual Drag Preview** (1주)
- 🎯 **Weather Delay Preview** (1주)
- 🎯 **Critical Path 변화** (5일)

**예상 결과**: UX 대폭 개선, 물류 도메인 만족도 증가

---

### Phase 3 (Advanced) — 2개월
- 🎯 **Resource Leveling** (2주)
- 🎯 **History Replay** (1주)
- 🎯 **Multi-Scenario Compare** (3주)

**예상 결과**: 경영진 의사결정 지원, 최적 일정 자동화

---

### Phase 4 (Innovation) — 3개월+
- 🎯 **Dependency Propagation** (2주)
- 🎯 **AI Optimization** (1개월+, AI 연동 필요)

**예상 결과**: 차세대 기능, 업계 리딩

---

## 📋 기술 구현 가이드

### 공통 코드 패턴
```typescript
// 1. Ghost Bars 데이터 구조 (확장)
interface GhostBarConfig {
  type: "reflow" | "what_if" | "baseline" | "drag" | "weather" | "cp_change" | "leveling" | "history" | "multi" | "ai"
  changes: DateChange[]
  metadata?: {
    scenario?: string
    trigger?: string
    confidence?: number
    metrics?: Record<string, any>
  }
  style?: {
    color?: string
    dashPattern?: string
    opacity?: number
  }
}

// 2. visTimelineMapper 확장
export function ganttRowsToVisData(
  rows: GanttRow[],
  compareDelta?: CompareResult | null,
  options?: GanttVisOptions & { ghostConfig?: GhostBarConfig }
): VisTimelineData {
  // 기존 로직...

  // Ghost bars 추가 (타입별)
  if (options?.ghostConfig) {
    addGhostBars(items, options.ghostConfig)
  }
}

// 3. Ghost bar 스타일 (CSS)
.ghost-bar-reflow { /* 현재 */ }
.ghost-bar-what-if { border: 2px dashed rgba(255, 165, 0, 0.7); }
.ghost-bar-baseline { border: 2px dashed rgba(34, 197, 94, 0.7); }
.ghost-bar-drag { border: 2px dashed rgba(156, 163, 175, 0.7); }
.ghost-bar-weather { border: 2px dashed rgba(239, 68, 68, 0.7); }
.ghost-bar-ai { border: 2px dashed rgba(147, 51, 234, 0.7); }
```

---

## 🎯 성공 기준 (KPI)

| 시나리오 | 측정 지표 | 목표 | 현재 |
|---------|----------|-----|------|
| What-If | 시뮬레이션 시간 | <30초 | N/A |
| Baseline | Baseline 준수율 | >90% | 알 수 없음 |
| Drag Preview | 드래그 실수율 | <5% | 알 수 없음 |
| Weather | 기상 리스크 대응 시간 | <10분 | 알 수 없음 |
| CP Change | CP 변화 인지 시간 | <30초 | 알 수 없음 |
| Resource Leveling | 충돌 해결 시간 | <5분 | 알 수 없음 |
| History | 감사 대응 시간 | <1시간 | 알 수 없음 |
| Multi-Scenario | 의사결정 회의 시간 | <30분 | 알 수 없음 |

---

## 📚 참고 자료

1. **Figma** - Drag ghost & multi-selection preview (2025)
2. **GitHub** - Compare view with ghost diffs (2025)
3. **MS Project** - Baseline comparison & what-if analysis (2025)
4. **Primavera P6** - Resource leveling preview (2025)
5. **Instagantt** - Multi-scenario planning (2025)

---

## 🔗 관련 문서

- `innovation-scout-vis-timeline-upgrade-20260204.md` - 전체 업그레이드 로드맵
- `vis-timeline-gantt-upgrade-plan.md` - Phase 1~3 구현 계획
- `visTimelineMapper.ts` - Ghost Bars 구현 코드
- `AGENTS.md` - TR 대시보드 불변조건

---

**다음 단계**: What-If 시뮬레이션 구현 (P0, 1주 예상)
