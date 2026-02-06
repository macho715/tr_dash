---
doc_id: tr-dashboard-next-steps-detailed-plan
refs: [tr-dashboard-4-feature-plan.md, ../WORK_LOG_20260206.md, ../../AGENTS.md, ../../patch.md]
updated: 2026-02-06
version: 1.0
status: ready_for_selection
---

# TR Dashboard 다음 단계 상세 실행 계획

**기준일**: 2026-02-06  
**상태**: 사용자 옵션 선택 대기

---

## 📊 Option Matrix

| Option | 이름 | 우선순위 | 공수 | 위험도 | SSOT 영향 |
|--------|------|----------|------|--------|-----------|
| **1** | Part 3: What-if 검증 | P2 | 3h | Low | 없음 (검증만) |
| **2** | Part 4: 일정 표시 개선 | P2 | 4h | Low | 없음 (UI만) |
| **3** | Part 2: History 입력/삭제 | P1 | 4h | Medium | 있음 (append) |
| **4** | 테스트 자동화 | - | 6h | Low | 없음 |
| **5** | Actual 고도화 | - | 8h | Medium | 있음 (확장) |
| **6** | 커밋 | - | 0.5h | Low | 없음 |
| **7** | 테스트 결과 대기 | - | 1h | - | - |

---

## Option 1: Part 3 - What-if 시뮬레이션 연동 검증 ✅ 권장

### Executive Summary
- **목표**: 기존 What-if 시뮬레이션 기능의 동작 확인 및 이슈 수정
- **우선순위**: P2 (기능 검증)
- **예상 공수**: 3시간
- **위험도**: Low (기존 코드 검증, SSOT 변경 없음)
- **권장 이유**: SSOT 변경 없고, 빠르게 검증 가능

### Task Breakdown

#### Task 1.1: 현재 코드 구조 파악 (30분)
**Description**: What-if 관련 컴포넌트 및 로직 파악

**Files to Read:**
- `components/what-if/WhatIfPanel.tsx`
- `lib/reflow/reflowSchedule.ts`
- `components/dashboard/gantt-chart.tsx` (ghost bar 로직)
- `app/page.tsx` (what-if state management)

**Checklist:**
- [ ] WhatIfPanel UI 구조 확인
- [ ] reflowSchedule 함수 시그니처 확인
- [ ] Ghost bar 렌더링 로직 확인
- [ ] State 관리 방식 확인

**LOC**: 0 (읽기만)  
**Duration**: 30분  
**Dependencies**: 없음

#### Task 1.2: What-if UI 동작 확인 (1시간)
**Description**: 브라우저에서 What-if 패널 실제 동작 테스트

**Manual Test Steps:**
```
1. 로컬 서버 실행 (포트 3001)
2. Activity 선택
3. What-if 패널 표시 확인
4. Planned start 날짜 변경 (+3일)
5. "Preview" 버튼 클릭
6. 기대 결과:
   - reflowSchedule 실행
   - Ghost bar 표시 (기존 위치 + 새 위치)
   - Metrics 표시 (영향받는 activity 수 등)
   - Collision 경고 (있을 경우)
7. "Apply" 버튼 클릭 (선택)
8. 기대 결과:
   - SSOT 업데이트
   - History event 생성
```

**Checklist:**
- [ ] What-if 패널 표시됨
- [ ] Activity 선택 가능
- [ ] 날짜 변경 가능
- [ ] Preview 버튼 동작
- [ ] Ghost bar 표시
- [ ] Metrics 계산 정확
- [ ] Apply 버튼 동작 (선택)

**Duration**: 1시간  
**Dependencies**: Task 1.1

#### Task 1.3: 이슈 수정 (1시간)
**Description**: 발견된 이슈에 따라 수정 (조건부)

**Common Issues & Fixes:**
| 이슈 | 원인 추정 | 수정 방법 | LOC |
|------|-----------|-----------|-----|
| Ghost bar 미표시 | vis-timeline DataSet 미연동 | `visDataRef` 업데이트 로직 추가 | +10 |
| Reflow 미실행 | WhatIfPanel에서 reflowSchedule 호출 누락 | `handlePreview` 함수 수정 | +5 |
| Metrics 미표시 | 계산 로직 에러 | reflowSchedule 반환값 확인 및 수정 | +10 |
| Apply 실패 | SSOT 업데이트 로직 누락 | `handleApply` 함수 구현 | +30 |

**Files to Modify (조건부):**
- `components/what-if/WhatIfPanel.tsx` (+15 LOC)
- `components/dashboard/gantt-chart.tsx` (+10 LOC)
- `lib/reflow/reflowSchedule.ts` (+10 LOC)

**Duration**: 1시간 (이슈 발견 시)  
**Dependencies**: Task 1.2

#### Task 1.4: 검증 문서 작성 (30분)
**Description**: What-if 검증 결과 문서화

**Files to Create:**
- `docs/plan/what-if-verification-report.md`

**Content:**
- 검증 항목 체크리스트
- 발견된 이슈 목록
- 수정 내역
- Before/After 스크린샷 (선택)

**LOC**: +50 (문서)  
**Duration**: 30분  
**Dependencies**: Task 1.3

### Implementation Steps (Preview → Apply)

1. **Preview (읽기 전용):**
   - 현재 코드 구조 파악
   - 브라우저 수동 테스트
   - 이슈 목록 작성

2. **Apply (수정 허용):**
   - 발견된 이슈 수정
   - 검증 문서 작성

### Acceptance Checklist
- [ ] What-if 패널에서 activity 선택 및 날짜 변경 가능
- [ ] "Preview" 클릭 시 ghost bar가 Gantt에 표시됨
- [ ] Metrics (영향받는 activity 수, conflicts, ETA 변경)가 정확히 계산됨
- [ ] "Apply" 클릭 시 SSOT 업데이트 및 history 기록 (선택)
- [ ] "Cancel" 클릭 시 ghost bar 제거 및 원상 복구
- [ ] Collision 발생 시 경고 메시지 표시
- [ ] 검증 리포트 작성 완료

### SSOT Guardrails
- **Before**: N/A (검증 단계에서는 SSOT 변경 없음)
- **During**: Preview만 수행, Apply는 선택 사항
- **After**: Apply 선택 시 `validate_optionc.py` 실행

### Risk Assessment
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| What-if 기능 미구현 | Low | High | Task 1.1에서 즉시 확인, 미구현 시 새 구현 계획 수립 |
| Ghost bar 버그 | Medium | Medium | vis-timeline 문서 참조, DataSet 업데이트 방식 변경 |
| Reflow 성능 문제 | Low | Low | 큰 데이터셋 시 타임아웃 설정 |

---

## Option 2: Part 4 - 일정 변경 표시 개선 🎨 UI 개선

### Executive Summary
- **목표**: Gantt chart의 Ghost bar 가독성 개선 (범례, Tooltip)
- **우선순위**: P2 (UX 개선)
- **예상 공수**: 4시간
- **위험도**: Low (UI만 변경, SSOT 영향 없음)

### Task Breakdown

#### Task 2.1: GanttLegend 컴포넌트 생성 (1.5시간)
**Description**: Gantt chart 범례 컴포넌트 신규 생성

**Files to Create:**
- `components/dashboard/GanttLegend.tsx` (+80 LOC)

**Component Structure:**
```tsx
export function GanttLegend() {
  return (
    <div className="flex flex-wrap gap-4 text-xs p-3 bg-slate-800/50 rounded-lg border border-slate-700">
      {/* Planned bar */}
      <LegendItem color="bg-blue-500" label="Planned" />
      
      {/* Actual bar */}
      <LegendItem color="bg-green-500" label="Actual" />
      
      {/* Collision bar */}
      <LegendItem color="bg-red-500" label="Collision" />
      
      {/* Ghost bar (Preview) */}
      <LegendItem 
        color="border-2 border-dashed border-gray-400 bg-transparent" 
        label="Preview (What-if/Weather)" 
      />
      
      {/* Compare mode bar */}
      <LegendItem color="bg-yellow-500 opacity-50" label="Compare Mode" />
    </div>
  )
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`h-4 w-8 ${color}`} />
      <span className="text-slate-300">{label}</span>
    </div>
  )
}
```

**Integration:**
- `components/dashboard/timeline-controls.tsx`에 통합 (+5 LOC)

**LOC**: +85  
**Duration**: 1.5시간  
**Dependencies**: 없음

#### Task 2.2: Ghost Bar Tooltip 개선 (1.5시간)
**Description**: Ghost bar hover 시 상세 정보 표시

**Files to Modify:**
- `components/dashboard/gantt-chart.tsx` (+30 LOC)

**Before:**
```typescript
const tooltip = `Activity: ${activity.title}\nPlanned: ${activity.planned_start} - ${activity.planned_finish}`
```

**After:**
```typescript
function buildEnhancedTooltip(activity: ScheduleActivity, ghostBar?: GhostBar, actualBar?: ActualBar): string {
  const lines = [
    `Activity: ${activity.title}`,
    '━━━━━━━━━━━━━━━━━━━━━━',
    '',
    '📅 Original Plan:',
    `  ${formatDate(activity.planned_start)} → ${formatDate(activity.planned_finish)}`,
    `  Duration: ${calculateDuration(activity.planned_start, activity.planned_finish)} days`,
  ]
  
  if (ghostBar) {
    const delta = calculateDelta(activity.planned_start, ghostBar.start)
    lines.push(
      '',
      '🔮 What-if Preview:',
      `  ${formatDate(ghostBar.start)} → ${formatDate(ghostBar.end)}`,
      `  Δ ${delta > 0 ? '+' : ''}${delta} days`,
      '',
      '⚠️ Impact:',
      `  - Affected activities: ${ghostBar.impactCount}`,
      `  - New conflicts: ${ghostBar.conflictCount}`,
    )
  }
  
  if (actualBar) {
    const delta = calculateDelta(activity.planned_start, actualBar.start)
    lines.push(
      '',
      '✅ Actual Progress:',
      `  ${formatDate(actualBar.start)} → ${actualBar.end ? formatDate(actualBar.end) : 'In progress'}`,
      `  Δ ${delta > 0 ? '+' : ''}${delta} days`,
    )
  }
  
  return lines.join('\n')
}
```

**LOC**: +30  
**Duration**: 1.5시간  
**Dependencies**: Task 2.1

#### Task 2.3: (선택) Compare View 기본 구조 (1시간)
**Description**: Before/After 비교 뷰 컴포넌트 생성 (선택 사항)

**Files to Create (선택):**
- `components/dashboard/CompareView.tsx` (+120 LOC)

**Features:**
- Toggle button in timeline-controls
- Split view layout (50% / 50%)
- Highlight changed activities
- Delta badges

**LOC**: +125 (선택)  
**Duration**: 1시간 (선택)  
**Dependencies**: Task 2.2

### Implementation Steps

1. GanttLegend 컴포넌트 생성
2. timeline-controls에 통합
3. Ghost bar tooltip 로직 개선
4. (선택) Compare view 구현
5. 브라우저 테스트

### Acceptance Checklist
- [ ] Gantt chart 하단에 범례 표시 (Planned/Actual/Collision/Preview/Compare)
- [ ] 범례 아이템이 실제 bar 스타일과 일치
- [ ] Ghost bar hover 시 상세 tooltip 표시 (Original → Preview, Delta, Impact)
- [ ] Tooltip이 가독성 있게 포맷팅됨
- [ ] (선택) Compare view 토글 버튼 동작
- [ ] (선택) Split view에서 Before/After 비교 가능

### SSOT Guardrails
- **N/A**: UI만 변경, SSOT 영향 없음

### Risk Assessment
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Tooltip 너무 길어 가독성 저하 | Medium | Low | 최대 높이 제한, 스크롤 추가 |
| 범례가 화면 공간 차지 | Low | Low | Collapsible 또는 Drawer 형태로 변경 |

---

## Option 3: Part 2 - History 입력/삭제 기능 🔐 SSOT 변경

### Executive Summary
- **목표**: Manual history event 추가 및 Soft delete 구현
- **우선순위**: P1 (기능 추가)
- **예상 공수**: 4시간
- **위험도**: Medium (SSOT append, 권한 관리 필요)

### Task Breakdown

#### Task 3.1: History Event 스키마 확장 (30분)
**Description**: HistoryEvent 타입에 soft delete 필드 추가

**Files to Modify:**
- `src/types/ssot.ts` (+5 LOC)

**Schema Change:**
```typescript
interface HistoryEvent {
  event_id: string
  ts: string
  actor: string
  event_type: string
  entity_ref: { entity_type: string; entity_id: string }
  details: Record<string, any>
  deleted?: boolean           // 🆕 Soft delete 플래그
  deleted_at?: string         // 🆕 삭제 시각
  deleted_by?: string         // 🆕 삭제자
}
```

**LOC**: +5  
**Duration**: 30분  
**Dependencies**: 없음

#### Task 3.2: API Endpoints 생성 (1.5시간)
**Description**: History 추가/삭제 API 엔드포인트

**Files to Create:**
- `app/api/history/route.ts` (+60 LOC)
- `app/api/history/[id]/route.ts` (+50 LOC)

**Endpoints:**
```typescript
// POST /api/history - Manual history event 생성
export async function POST(request: NextRequest) {
  const { eventType, entityRef, details, actor } = await request.json()
  
  // Validation
  if (!eventType || !entityRef || !actor) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }
  
  const historyEvent = buildHistoryEvent({ eventType, entityRef, details, actor })
  
  // Append to SSOT
  const ssot = await readSsot()
  ssot.history_events = [...(ssot.history_events ?? []), historyEvent]
  await writeSsot(ssot)
  
  return NextResponse.json({ historyEvent })
}

// PATCH /api/history/[id] - Soft delete/restore
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { deleted, actor } = await request.json()
  const eventId = params.id
  
  const ssot = await readSsot()
  const event = ssot.history_events?.find(e => e.event_id === eventId)
  
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 })
  }
  
  // Soft delete/restore
  event.deleted = deleted
  if (deleted) {
    event.deleted_at = new Date().toISOString()
    event.deleted_by = actor
  } else {
    delete event.deleted_at
    delete event.deleted_by
  }
  
  await writeSsot(ssot)
  return NextResponse.json({ event })
}
```

**LOC**: +110  
**Duration**: 1.5시간  
**Dependencies**: Task 3.1

#### Task 3.3: SSOT 로직 구현 (1시간)
**Description**: History 업데이트 로직 모듈화

**Files to Create:**
- `lib/ssot/update-history.ts` (+100 LOC)

**Functions:**
```typescript
export async function addManualHistoryEvent(input: {
  eventType: string
  entityRef: { entity_type: string; entity_id: string }
  details: Record<string, any>
  actor: string
}): Promise<HistoryEvent>

export async function softDeleteHistoryEvent(
  eventId: string,
  actor: string
): Promise<HistoryEvent>

export async function restoreHistoryEvent(
  eventId: string
): Promise<HistoryEvent>
```

**LOC**: +100  
**Duration**: 1시간  
**Dependencies**: Task 3.2

#### Task 3.4: HistoryTab UI 수정 (1시간)
**Description**: History 추가/삭제 버튼 UI 통합

**Files to Modify:**
- `components/history/HistoryTab.tsx` (+50 LOC)

**Features:**
- "Add History Event" 버튼 (Live mode only)
- AddHistoryModal 컴포넌트:
  - Event type 선택 dropdown
  - Entity reference 선택 (Activity/Trip/TR)
  - Details textarea
- Delete 버튼 (각 이벤트 옆):
  - Confirmation modal
- Deleted 이벤트 스타일:
  - opacity 0.5
  - "Deleted" 배지
  - "Restore" 버튼

**Files to Create:**
- `components/history/AddHistoryModal.tsx` (+80 LOC)

**LOC**: +130  
**Duration**: 1시간  
**Dependencies**: Task 3.3

### Implementation Steps (Preview → Apply)

1. **Preview:**
   - 스키마 확장 (optional fields)
   - API 로직 구현
   - SSOT 로직 구현

2. **Apply:**
   - SSOT 업데이트 (append-only)
   - History event 기록

### Acceptance Checklist
- [ ] Live mode에서 "Add History Event" 버튼 표시
- [ ] Modal에서 event type, entity, details 입력 가능
- [ ] Manual history event가 SSOT에 추가됨
- [ ] History event를 soft delete 가능 (deleted=true)
- [ ] Deleted 이벤트는 희미하게 표시 + "Deleted" 배지
- [ ] "Restore" 버튼으로 삭제 취소 가능
- [ ] History/Approval mode에서는 버튼 숨김
- [ ] `validate_optionc.py` PASS

### SSOT Guardrails
- **Before**: SSOT 백업 생성
- **During**: history_events 배열만 수정 (append 또는 flag 변경)
- **After**: `validate_optionc.py CONTRACT` 실행 (PASS 필수)

### Risk Assessment
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Append-only 위반 | Low | High | Soft delete 강제, hard delete 금지 |
| 권한 체크 누락 | Medium | Medium | viewMode.canEdit 엄격 체크 |
| Event type 표준화 누락 | Medium | Low | Enum 또는 predefined list 사용 |
| Actor 인증 부재 | High | Medium | 현재 "user" 하드코딩, 추후 인증 통합 필요 |

---

## Option 4: 테스트 자동화 🧪 품질 강화

### Executive Summary
- **목표**: Unit/Integration/E2E 테스트 작성
- **우선순위**: - (품질 개선)
- **예상 공수**: 6시간
- **위험도**: Low (SSOT 변경 없음)

### Task Breakdown

#### Task 4.1: Unit Tests (2시간)
**Description**: 핵심 로직 유닛 테스트

**Files to Create:**
- `__tests__/unit/update-actual.test.ts` (+100 LOC)
- `__tests__/unit/update-history.test.ts` (+80 LOC)
- `__tests__/unit/reflow-schedule.test.ts` (+120 LOC)

**Test Cases:**
```typescript
// update-actual.test.ts
describe('updateActualDates', () => {
  it('should update actual start and end in SSOT', async () => {})
  it('should transition state from ready to in_progress', async () => {})
  it('should transition state from in_progress to completed', async () => {})
  it('should append history event', async () => {})
  it('should throw error if activity not found', async () => {})
})

// reflow-schedule.test.ts
describe('reflowSchedule', () => {
  it('should detect dependency cycle', () => {})
  it('should calculate topological sort', () => {})
  it('should apply time window constraints', () => {})
  it('should detect collisions', () => {})
})
```

**LOC**: +300  
**Duration**: 2시간  
**Dependencies**: 없음

#### Task 4.2: Integration Tests (2시간)
**Description**: API 엔드포인트 통합 테스트

**Files to Create:**
- `__tests__/api/activities-actual.test.ts` (+80 LOC)
- `__tests__/api/history.test.ts` (+100 LOC)

**Test Cases:**
```typescript
// activities-actual.test.ts
describe('PATCH /api/activities/[id]/actual', () => {
  it('should return 400 if activityId missing', async () => {})
  it('should return 404 if activity not found', async () => {})
  it('should update SSOT and return updated activity', async () => {})
  it('should append history event', async () => {})
  it('should handle state transition', async () => {})
})
```

**LOC**: +180  
**Duration**: 2시간  
**Dependencies**: Task 4.1

#### Task 4.3: E2E Tests (2시간)
**Description**: Playwright 기반 E2E 테스트

**Files to Create:**
- `e2e/actual-input.spec.ts` (+120 LOC)
- `e2e/history-management.spec.ts` (+100 LOC)
- `e2e/what-if-simulation.spec.ts` (+100 LOC)

**Test Cases:**
```typescript
// actual-input.spec.ts
test('should input actual dates and show actual bar in Gantt', async ({ page }) => {
  await page.goto('http://localhost:3001')
  await page.click('[data-activity-id="LO-A-010"]')
  await page.fill('[data-testid="actual-start-input"]', '2026-02-01T08:00')
  await page.click('button:has-text("Save")')
  await expect(page.locator('.vis-item.actual-bar')).toBeVisible()
})
```

**LOC**: +320  
**Duration**: 2시간  
**Dependencies**: Task 4.2

### Implementation Steps

1. Unit tests 작성 및 실행
2. Integration tests 작성 및 실행
3. E2E tests 작성 및 실행
4. CI 파이프라인 통합 (선택)

### Acceptance Checklist
- [ ] Unit tests 커버리지 ≥ 70%
- [ ] Integration tests 모든 API 엔드포인트 커버
- [ ] E2E tests 주요 사용자 플로우 커버
- [ ] 모든 테스트 PASS
- [ ] (선택) GitHub Actions CI 통합

### SSOT Guardrails
- **N/A**: 테스트만, SSOT 변경 없음

### Risk Assessment
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| 테스트 환경 설정 복잡 | Medium | Low | Jest/Playwright 설정 문서 참조 |
| E2E 테스트 불안정 | High | Low | Retry 전략, Wait for selector |
| CI 통합 실패 | Medium | Low | 로컬에서 먼저 검증 |

---

## Option 5: Actual 고도화 🚀 기능 확장

### Executive Summary
- **목표**: Actual 입력 기능 고도화 (Bulk, Evidence, Undo)
- **우선순위**: - (확장 기능)
- **예상 공수**: 8시간
- **위험도**: Medium (SSOT 확장, 복잡도 증가)

### Task Breakdown

#### Task 5.1: Bulk Actual Input (3시간)
**Description**: 여러 activity의 actual 날짜를 한 번에 입력

**Files to Create:**
- `components/detail/sections/BulkActualInputModal.tsx` (+150 LOC)
- `app/api/activities/bulk-actual/route.ts` (+80 LOC)
- `lib/ssot/update-actual-bulk.ts` (+100 LOC)

**Features:**
- Activity 다중 선택 (checkbox)
- 공통 날짜 입력 (예: 모두 2026-02-01 시작)
- 개별 날짜 미세 조정
- Preview: 변경될 activity 목록 표시
- Apply: 일괄 SSOT 업데이트

**LOC**: +330  
**Duration**: 3시간  
**Dependencies**: 없음

#### Task 5.2: Evidence 연동 (3시간)
**Description**: Actual 입력 시 증빙 자료 첨부 요구

**Files to Modify:**
- `ActualInputSection.tsx` (+50 LOC)
- `lib/ssot/update-actual.ts` (+30 LOC)

**Files to Create:**
- `components/evidence/EvidenceUploadWidget.tsx` (+100 LOC)

**Features:**
- Actual End 입력 시 Evidence 업로드 요구
- 사진/서명 파일 첨부
- Evidence → activity.evidence 배열에 추가
- Gate: Evidence 없으면 State transition 차단

**Schema Change:**
```typescript
// Activity에 evidence 배열 추가 (이미 존재할 수 있음)
interface Activity {
  // ...
  evidence?: Evidence[]
}

interface Evidence {
  evidence_id: string
  type: "photo" | "signature" | "document"
  url: string
  uploaded_at: string
  uploaded_by: string
}
```

**LOC**: +180  
**Duration**: 3시간  
**Dependencies**: Task 5.1

#### Task 5.3: Undo/Redo 지원 (2시간)
**Description**: Actual 입력 후 실행 취소 기능

**Files to Create:**
- `lib/undo/actual-undo-stack.ts` (+80 LOC)

**Files to Modify:**
- `components/detail/ActualInputSection.tsx` (+30 LOC)
- `lib/ssot/update-actual.ts` (+20 LOC)

**Features:**
- Actual 변경 이력 스택 유지
- Undo 버튼: 이전 상태로 복원
- Redo 버튼: Undo 취소
- History event에 "undo" 표시

**LOC**: +130  
**Duration**: 2시간  
**Dependencies**: Task 5.2

### Implementation Steps

1. Bulk Actual Input UI 및 API 구현
2. Evidence 업로드 위젯 추가
3. Undo/Redo 스택 구현
4. 통합 테스트

### Acceptance Checklist
- [ ] 여러 activity 선택 후 bulk actual 입력 가능
- [ ] Actual End 입력 시 Evidence 업로드 요구
- [ ] Evidence 없으면 State transition 차단
- [ ] Undo 버튼으로 이전 actual 값 복원
- [ ] Redo 버튼으로 Undo 취소
- [ ] History event에 "undo" 표시
- [ ] `validate_optionc.py` PASS

### SSOT Guardrails
- **Before**: SSOT 백업 생성
- **During**: Bulk 업데이트 시 transaction 개념 적용 (전체 성공 또는 롤백)
- **After**: `validate_optionc.py CONTRACT` 실행

### Risk Assessment
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Bulk 업데이트 시 일부 실패 | Medium | High | Transaction 패턴, 롤백 로직 |
| Evidence 파일 저장소 필요 | High | Medium | 로컬 파일시스템 또는 S3 연동 |
| Undo/Redo 스택 메모리 문제 | Low | Low | 최대 스택 크기 제한 (예: 10개) |

---

## Option 6: 커밋 📦 현재 작업 저장

### Executive Summary
- **목표**: Phase 14-15 (Gantt Reset + Actual Input) 커밋
- **예상 공수**: 30분
- **위험도**: Low

### Commit Steps

#### Step 1: Git Status 확인
```bash
git status
```

#### Step 2: 변경 파일 확인
```bash
git diff
```

#### Step 3: Stage 파일
```bash
git add components/detail/sections/ActualInputSection.tsx
git add components/detail/DetailPanel.tsx
git add app/api/activities/[id]/actual/route.ts
git add lib/ssot/update-actual.ts
git add app/page.tsx
git add lib/ssot/utils/schedule-mapper.ts
git add lib/contexts/date-context.tsx
git add components/dashboard/gantt-chart.tsx
git add app/layout.tsx
git add components/dashboard/timeline-controls.tsx
```

#### Step 4: Commit Message (Behavioral)
```bash
git commit -m "$(cat <<'EOF'
feat(actual): implement E2E actual dates input flow (P0)

Phase 15: Actual 날짜 입력 관리
- Add ActualInputSection UI component (Live mode only)
- Create API endpoint PATCH /api/activities/[id]/actual
- Implement SSOT update logic in lib/ssot/update-actual.ts
- Handle state transitions (ready→in_progress, in_progress→completed)
- Auto-generate history events (actual_changed)
- Sync activities/ssot state in page.tsx
- Enhance v0.8.0 actual mapping in schedule-mapper.ts

Refs: docs/plan/tr-dashboard-4-feature-plan.md, docs/WORK_LOG_20260206.md
Contract: v0.8.0 (option_c.json SSOT)
EOF
)"
```

#### Step 5: Commit Message (Structural - Gantt Reset)
```bash
git commit -m "$(cat <<'EOF'
refactor(gantt): enhance reset handler and add keyboard shortcut

Phase 14: Gantt Reset 완전 개선
- Expand handleResetGantt to clear all states
- Add DateContext.resetToInitialDate method
- Sync Global Control Bar date cursor
- Add toast notification for user feedback
- Implement keyboard shortcut (Ctrl/Cmd+Shift+R)
- Update timeline-controls tooltip

Refs: docs/WORK_LOG_20260206.md
EOF
)"
```

#### Step 6: 문서 커밋 (Documentation)
```bash
git add docs/WORK_LOG_20260206.md
git add docs/plan/tr-dashboard-4-feature-plan.md
git add docs/plan/tr-dashboard-next-steps-detailed-plan.md

git commit -m "$(cat <<'EOF'
docs: add Phase 14-15 work log and detailed next steps plan

- Add WORK_LOG_20260206.md (Gantt Reset + Actual Input)
- Update tr-dashboard-4-feature-plan.md (Part 1 completed, Part 2-4 pending)
- Add tr-dashboard-next-steps-detailed-plan.md (7 options with detailed plans)

Refs: docs/plan/tr-dashboard-4-feature-plan.md
EOF
)"
```

### Commit Checklist
- [ ] `git status` 확인: 모든 변경 파일 stage됨
- [ ] `git diff --cached` 확인: commit 내용 검토
- [ ] Commit message 작성: 명확한 제목 + 상세 본문
- [ ] Behavioral/Structural 분리: 각각 별도 커밋
- [ ] Documentation commit: 문서는 별도 커밋
- [ ] Refs 포함: 관련 문서 링크
- [ ] Contract 명시: v0.8.0 (option_c.json SSOT)

### Post-Commit Actions
```bash
# Verify commits
git log -3 --oneline

# (선택) Push to remote
# git push origin main
```

---

## Option 7: 테스트 결과 대기 ⏳ 문서화 작업

### Executive Summary
- **목표**: 사용자 수동 테스트 결과 대기 중 문서화 작업
- **예상 공수**: 1시간
- **위험도**: Low

### 대기 중 수행 가능 작업

#### 1. 사용자 가이드 작성 (30분)
**Files to Create:**
- `docs/USER_GUIDE_ACTUAL_INPUT.md` (+100 LOC)

**Content:**
- Actual 입력 기능 소개
- 스크린샷 (사용자 제공 후 추가)
- 단계별 사용법
- FAQ
- Troubleshooting

#### 2. API 문서 작성 (20분)
**Files to Create:**
- `docs/API_REFERENCE.md` (+80 LOC)

**Content:**
- `PATCH /api/activities/[id]/actual`
- Request/Response 스키마
- Error codes
- Examples

#### 3. 개발자 노트 작성 (10분)
**Files to Update:**
- `README.md` (+20 LOC)

**Content:**
- Phase 14-15 완료 체크박스 업데이트
- Actual 입력 기능 추가 안내
- Next steps 업데이트

### Test Result Collection Format

사용자가 테스트 결과를 제공할 때 다음 형식 권장:

```markdown
## Live Mode 검증 결과

### 1️⃣ 사전 확인
- [x] View = Live 확인

### 2️⃣ UI 노출
- [x] Activity 클릭 → DetailPanel 표시
- [x] "Record Actual Dates" 섹션 노출

### 3️⃣ Actual Start 입력
- [x] Actual Start 입력 → Save 성공
- [x] Plan vs Actual 표에 값 반영
- [x] Gantt Actual 바 표시 (초록)
- [?] Map 상태 색상 변경 (파랑) - 확인 필요

### 4️⃣ Actual End 입력
- [x] Actual End 입력 → Save 성공
- [x] 상태 → "Completed"
- [x] History 탭에 이벤트 추가
- [x] Map 색상 → 초록

### 5️⃣ Validation
- [x] End < Start → 에러 메시지 확인

### 이슈 발견
1. [이슈 제목] - [상세 설명]
2. ...

### 스크린샷
[첨부 또는 링크]
```

---

## 🎯 권장 실행 순서

### 최적 경로 (리스크 최소화)

```
1. Option 6: 커밋 (30분)
   ↓
2. Option 7: 테스트 결과 대기 + 문서화 (1시간)
   ↓
3. [사용자 테스트 결과 수신]
   ↓
4. Option 1: What-if 검증 (3시간)
   ↓
5. Option 2: 일정 표시 개선 (4시간)
   ↓
6. Option 3: History 입력/삭제 (4시간)
   ↓
7. Option 4: 테스트 자동화 (6시간)
   ↓
8. (선택) Option 5: Actual 고도화 (8시간)
```

### 병렬 실행 가능 (2명 이상)

- **개발자 A**: Option 1 + 2 (What-if 검증 + 일정 표시 개선) - 7시간
- **개발자 B**: Option 3 (History 입력/삭제) - 4시간
- **개발자 C**: Option 4 (테스트 자동화) - 6시간

---

## 📞 다음 액션

사용자가 다음 중 하나를 선택해주세요:

1. **"Part 3로 가자"** → Option 1 실행
2. **"Part 4로 가자"** → Option 2 실행
3. **"Part 2로 가자"** → Option 3 실행
4. **"테스트 자동화"** → Option 4 실행
5. **"Actual 고도화"** → Option 5 실행
6. **"커밋하자"** → Option 6 실행
7. **"테스트 결과 알려줄게"** → Option 7 대기 + 문서화

또는 추가 질문/변경 요청 환영합니다! 🚀

---

**계획 버전**: 1.0  
**작성일**: 2026-02-06  
**다음 검토**: 옵션 선택 후
