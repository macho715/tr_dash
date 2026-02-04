# Ghost Bars Phase 1 구현 계획

> **작성일**: 2026-02-04  
> **기능**: What-If 시뮬레이션 + Baseline 비교  
> **예상 기간**: 1주  
> **우선순위**: P0 (즉시 시작)

---

## 📋 Overview

| 기능 | 구현 난이도 | 예상 시간 | 예상 효과 |
|-----|-----------|----------|-----------|
| 1️⃣ What-If 시뮬레이션 | ⭐ Low | 3-4일 | ⭐⭐⭐ Very High |
| 2️⃣ Baseline 비교 | ⭐ Low | 2-3일 | ⭐⭐⭐ High |
| **Total** | - | **5-7일** | - |

---

## 1️⃣ What-If 시뮬레이션 구현

### 기능 요구사항
- [ ] Activity 선택 후 "What-If" 시나리오 입력 UI
- [ ] 지연 일수, 이유 입력
- [ ] Reflow 계산 + Ghost Bars 표시
- [ ] 영향 받는 activities 하이라이트
- [ ] Metrics 표시 (영향 범위, 총 지연, 새로운 충돌)
- [ ] Apply/Cancel 버튼

### 파일 변경 목록

#### 1.1. UI 컴포넌트 생성
```typescript
// components/ops/WhatIfPanel.tsx (신규)
export interface WhatIfScenario {
  activity_id: string
  delay_days: number
  reason: string
  confidence?: number
}

export function WhatIfPanel({
  activities,
  onApplyScenario,
  onCancel
}: WhatIfPanelProps) {
  // What-If 시나리오 입력 폼
  // Reflow 계산 트리거
  // Metrics 표시
}
```

#### 1.2. State 관리 추가
```typescript
// app/page.tsx
const [whatIfScenario, setWhatIfScenario] = useState<WhatIfScenario | null>(null)

const handleWhatIfScenario = (scenario: WhatIfScenario) => {
  const activity = activities.find(a => a.activity_id === scenario.activity_id)
  if (!activity) return

  const newStart = addDays(activity.planned_start, scenario.delay_days)
  
  try {
    const result = reflowSchedule(activities, scenario.activity_id, newStart, {
      respectLocks: true,
      checkResourceConflicts: true,
    })
    
    setReflowPreview({
      changes: result.impact_report.changes,
      conflicts: result.impact_report.conflicts,
      nextActivities: result.activities,
      scenario: {
        type: "what_if",
        ...scenario
      }
    })
  } catch (error) {
    console.error("What-If simulation failed:", error)
  }
}
```

#### 1.3. Ghost Bars 타입 확장
```typescript
// lib/gantt/visTimelineMapper.ts
export interface GhostBarMetadata {
  type: "reflow" | "what_if" | "baseline" | "drag" | "weather"
  scenario?: {
    reason?: string
    confidence?: number
    delay_days?: number
  }
}

export interface GanttVisOptions {
  // ... 기존 필드
  reflowPreview?: {
    changes: DateChange[]
    metadata?: GhostBarMetadata
  } | null
}

// Ghost bar 생성 시 metadata 반영
if (options?.reflowPreview?.metadata?.type === "what_if") {
  items.push({
    id: `ghost_${change.activity_id}`,
    className: "ghost-bar-what-if",
    title: `What-If: ${metadata.scenario?.reason} (+${metadata.scenario?.delay_days} days)`
  })
}
```

#### 1.4. CSS 스타일 추가
```css
/* app/globals.css */
.ghost-bar-what-if {
  border: 2px dashed rgba(255, 165, 0, 0.7) !important;
  background: rgba(251, 146, 60, 0.18) !important;
  opacity: 0.9;
}

.what-if-highlight {
  box-shadow: 0 0 0 3px rgba(255, 165, 0, 0.5) !important;
  animation: pulse-orange 2s ease-in-out infinite;
}

@keyframes pulse-orange {
  0%, 100% { box-shadow: 0 0 0 3px rgba(255, 165, 0, 0.5); }
  50% { box-shadow: 0 0 0 6px rgba(255, 165, 0, 0.3); }
}
```

### UI 플로우

```
1. 사용자가 Gantt에서 Activity 클릭
   ↓
2. "What-If" 버튼 표시 (DetailPanel 또는 Context Menu)
   ↓
3. WhatIfPanel 열림:
   [Activity: A1030]
   [Delay: +3 days]
   [Reason: SPMT breakdown]
   [Confidence: 85%]
   [Simulate]
   ↓
4. Reflow 계산 → Ghost Bars 표시
   ↓
5. Metrics 표시:
   - Affected activities: 5
   - Total delay: +3 days
   - New conflicts: 2
   - Project ETA: 2026-03-28 → 2026-03-31
   ↓
6. [Apply] → Actual plan 변경
   [Cancel] → Ghost Bars 제거
```

---

## 2️⃣ Baseline 비교 구현

### 기능 요구사항
- [ ] Baseline 스냅샷 저장/로드
- [ ] "Show Baseline" 토글 (Live/Compare 모드)
- [ ] Baseline vs Current ghost overlay
- [ ] Activity별 지연/앞당김 배지
- [ ] Baseline 승인 일시 표시

### 파일 변경 목록

#### 2.1. Baseline 데이터 구조
```typescript
// lib/ssot/schedule.ts
export interface Baseline {
  baseline_id: string
  name: string
  approved_at: string
  approved_by?: string
  activities: ScheduleActivity[]
  locked: boolean
}

// SSOT에 baselines 추가
export interface ScheduleSSOT {
  // ... 기존 필드
  baselines: {
    current_baseline_id: string | null
    items: Record<string, Baseline>
  }
}
```

#### 2.2. Baseline 관리 유틸
```typescript
// lib/ssot/baseline-manager.ts
export function createBaseline(
  activities: ScheduleActivity[],
  name: string,
  approved_by?: string
): Baseline {
  return {
    baseline_id: `baseline_${Date.now()}`,
    name,
    approved_at: new Date().toISOString(),
    approved_by,
    activities: JSON.parse(JSON.stringify(activities)), // Deep copy
    locked: true
  }
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
        new_finish: currentActivity.planned_finish
      })
    }
  })
  
  return changes
}
```

#### 2.3. UI 토글 추가
```typescript
// components/control-bar/GlobalControlBar.tsx
const [showBaseline, setShowBaseline] = useState(false)
const currentBaseline = baselines.items[baselines.current_baseline_id || ""]

return (
  <div className="control-bar">
    {/* 기존 컨트롤... */}
    
    {currentBaseline && (
      <div className="baseline-control">
        <label>
          <input
            type="checkbox"
            checked={showBaseline}
            onChange={(e) => setShowBaseline(e.target.checked)}
          />
          Show Baseline
        </label>
        <span className="baseline-info">
          {currentBaseline.name} (Approved: {formatDate(currentBaseline.approved_at)})
        </span>
      </div>
    )}
  </div>
)
```

#### 2.4. Ghost Bars 표시
```typescript
// app/page.tsx
const baselineChanges = useMemo(() => {
  if (!showBaseline || !currentBaseline) return null
  return compareWithBaseline(currentBaseline, activities)
}, [showBaseline, currentBaseline, activities])

// GanttSection에 전달
<GanttSection
  // ... 기존 props
  baselinePreview={baselineChanges}
/>
```

#### 2.5. CSS 스타일
```css
/* app/globals.css */
.ghost-bar-baseline {
  border: 2px dashed rgba(34, 197, 94, 0.7) !important;
  background: rgba(34, 197, 94, 0.12) !important;
  opacity: 0.85;
}

.baseline-delayed {
  border-left: 4px solid rgba(239, 68, 68, 0.8) !important;
}

.baseline-advanced {
  border-left: 4px solid rgba(34, 197, 94, 0.8) !important;
}
```

### UI 플로우

```
1. 프로젝트 시작 시 Baseline 생성
   "Save as Baseline" → 승인자 입력 → 저장
   ↓
2. Control Bar에 "Show Baseline" 토글 표시
   ↓
3. 토글 ON:
   - Baseline activities를 Ghost bars로 표시
   - Current activities는 실선
   - 지연/앞당김 배지 표시
   ↓
4. Activity 클릭 시:
   - DetailPanel에 Baseline 비교 정보
   - "Baseline: Feb 10-12"
   - "Current: Feb 13-15 (+3 days)"
   - "Reason: Weather delay"
```

---

## 🧪 테스트 계획

### Unit Tests

#### What-If 시뮬레이션
```typescript
// __tests__/what-if-simulation.test.ts
describe("What-If Simulation", () => {
  it("should calculate reflow for delay scenario", () => {
    const scenario = {
      activity_id: "A1030",
      delay_days: 3,
      reason: "SPMT breakdown"
    }
    
    const result = simulateWhatIf(activities, scenario)
    
    expect(result.changes).toHaveLength(5) // 5 activities affected
    expect(result.metrics.total_delay_days).toBe(3)
    expect(result.metrics.new_conflicts).toBe(2)
  })
  
  it("should handle cascade through dependencies", () => {
    // Dependency chain: A1030 → A1040 → A1050
    const scenario = { activity_id: "A1030", delay_days: 2, reason: "Test" }
    const result = simulateWhatIf(activities, scenario)
    
    expect(result.changes.find(c => c.activity_id === "A1040")).toBeDefined()
    expect(result.changes.find(c => c.activity_id === "A1050")).toBeDefined()
  })
})
```

#### Baseline 비교
```typescript
// __tests__/baseline-comparison.test.ts
describe("Baseline Comparison", () => {
  it("should detect activities delayed from baseline", () => {
    const baseline = createBaseline(baselineActivities, "Approved Plan", "PM")
    const changes = compareWithBaseline(baseline, currentActivities)
    
    const delayed = changes.filter(c => 
      parseDate(c.new_start) > parseDate(c.old_start)
    )
    
    expect(delayed).toHaveLength(3)
  })
  
  it("should create baseline snapshot", () => {
    const baseline = createBaseline(activities, "Initial Plan")
    
    expect(baseline.baseline_id).toBeDefined()
    expect(baseline.approved_at).toBeDefined()
    expect(baseline.locked).toBe(true)
    expect(baseline.activities).toEqual(activities)
  })
})
```

### Integration Tests

```typescript
// __tests__/integration/ghost-bars-phase1.test.ts
describe("Ghost Bars Phase 1 Integration", () => {
  it("should display What-If ghost bars on simulation", async () => {
    render(<Dashboard />)
    
    // Activity 클릭
    fireEvent.click(screen.getByText("A1030"))
    
    // What-If 버튼 클릭
    fireEvent.click(screen.getByText("What-If"))
    
    // 시나리오 입력
    fireEvent.change(screen.getByLabelText("Delay (days)"), { target: { value: "3" } })
    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "SPMT breakdown" } })
    fireEvent.click(screen.getByText("Simulate"))
    
    // Ghost bars 확인
    await waitFor(() => {
      expect(document.querySelector(".ghost-bar-what-if")).toBeInTheDocument()
    })
    
    // Metrics 확인
    expect(screen.getByText(/Affected activities: 5/)).toBeInTheDocument()
  })
  
  it("should show baseline comparison when toggled", () => {
    const { container } = render(<Dashboard baselines={mockBaselines} />)
    
    // Baseline 토글
    fireEvent.click(screen.getByLabelText("Show Baseline"))
    
    // Ghost bars 확인
    expect(container.querySelectorAll(".ghost-bar-baseline")).toHaveLength(10)
  })
})
```

---

## 📊 구현 순서

### Day 1-2: What-If 기초 구조
- [ ] `WhatIfPanel.tsx` 컴포넌트 생성
- [ ] `app/page.tsx`에 state 추가
- [ ] `simulateWhatIf()` 유틸 함수
- [ ] CSS 스타일 추가
- [ ] Unit tests

### Day 3: What-If UI 통합
- [ ] Gantt click → WhatIfPanel 열기
- [ ] Reflow 계산 연동
- [ ] Ghost bars 표시
- [ ] Metrics 표시
- [ ] Integration tests

### Day 4: Baseline 데이터 구조
- [ ] `Baseline` 타입 정의
- [ ] `baseline-manager.ts` 유틸
- [ ] SSOT 스키마 업데이트
- [ ] Unit tests

### Day 5: Baseline UI
- [ ] Control Bar 토글 추가
- [ ] `compareWithBaseline()` 연동
- [ ] Ghost bars 표시
- [ ] 지연/앞당김 배지
- [ ] Integration tests

### Day 6-7: 테스트 & 문서화
- [ ] E2E 테스트
- [ ] 성능 테스트
- [ ] 사용자 가이드 작성
- [ ] 코드 리뷰 & 수정

---

## 🎯 성공 기준

### What-If 시뮬레이션
- [ ] Activity 선택 후 3초 내 시뮬레이션 완료
- [ ] Ghost bars가 시각적으로 구분 가능 (주황 점선)
- [ ] Metrics 정확도 100% (reflow 엔진 기반)
- [ ] Apply/Cancel 정상 동작
- [ ] 50+ activities에서도 2초 내 응답

### Baseline 비교
- [ ] Baseline 생성/저장 성공률 100%
- [ ] Ghost bars 표시 정확도 100%
- [ ] 토글 반응 속도 <500ms
- [ ] 지연/앞당김 계산 정확도 100%

---

## 📋 체크리스트

### Before Start
- [ ] `innovation-scout-vis-timeline-upgrade-20260204.md` 리뷰
- [ ] `ghost-bars-use-cases.md` 리뷰
- [ ] 기존 `reflowSchedule()` 로직 이해
- [ ] `visTimelineMapper.ts` Ghost bars 구현 확인

### During Implementation
- [ ] TypeScript strict mode 준수
- [ ] Lint/Typecheck 통과
- [ ] 각 기능별 Unit test 작성
- [ ] SSOT 불변조건 준수 (AGENTS.md)
- [ ] 코드 리뷰 (AI or 팀원)

### After Implementation
- [ ] E2E 테스트 통과
- [ ] 사용자 테스트 (실제 데이터)
- [ ] 문서 업데이트 (README, 가이드)
- [ ] `ghost-bars-use-cases.md` 상태 업데이트

---

## 🚀 다음 단계 (Phase 2)

Phase 1 완료 후:
- 3️⃣ Manual Drag Preview
- 4️⃣ Weather Delay Preview
- 5️⃣ Critical Path 변화

---

**시작 준비 완료!** Day 1부터 구현을 시작하겠습니다.
