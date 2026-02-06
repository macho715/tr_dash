---
doc_id: story-header-ui-improvement-implementation-plan
status: 📋 진행 중
created: 2026-02-04
updated: 2026-02-04
refs: [story-header-ssot-integration.md, story-header-ui-improvement-plan.md, ../AGENTS.md, ../patch.md]
---

# StoryHeader UI Improvement Implementation Plan

## 목표

StoryHeader UX 개선: TR 선택, Evidence 누락 강조, 상세 정보 접근을 2-click 이내로 제공

## 전제조건 (완료됨)

- ✅ SSOT 기반 실시간 업데이트 (v1.10)
- ✅ `selectedTrId` state 관리
- ✅ 파생 계산 함수 구현
- ✅ SSOT API route 수정 (entities.activities 객체 구조)

## Task Breakdown

### Phase 1: TR 선택 드롭다운 (2시간)

#### Task 1.1: StoryHeader 컴포넌트 수정
**파일**: `components/dashboard/StoryHeader.tsx`

**변경사항**:
```typescript
// Props 추가
interface StoryHeaderProps {
  // ... 기존 props
  trs?: { tr_id: string; name: string }[]
  onTrSelect?: (trId: string) => void
}

// Select 컴포넌트 추가
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// UI 구현
{trs.length > 0 && (
  <Select value={trId ?? ""} onValueChange={onTrSelect}>
    <SelectTrigger className="w-[180px]">
      <SelectValue placeholder="TR 선택..." />
    </SelectTrigger>
    <SelectContent>
      {trs.map((tr) => (
        <SelectItem key={tr.tr_id} value={tr.tr_id}>
          {tr.name}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
)}
```

**Acceptance Criteria**:
- [ ] TR 드롭다운이 렌더링됨
- [ ] TR 선택 시 `onTrSelect` 콜백 호출
- [ ] 현재 선택된 TR이 표시됨

#### Task 1.2: page.tsx 핸들러 구현
**파일**: `app/page.tsx`

**변경사항**:
```typescript
const handleTrSelect = (trId: string) => {
  setSelectedTrId(trId)
  
  // Activity 자동 선택
  const activityId = calculateCurrentActivityForTR(ssot, trId)
  if (activityId) {
    setSelectedActivityId(activityId)
    ganttRef.current?.scrollToActivity(activityId)
  }
}

// StoryHeader props
<StoryHeader
  // ... 기존 props
  trs={trs}
  onTrSelect={handleTrSelect}
/>
```

**Acceptance Criteria**:
- [ ] TR 선택 시 `selectedTrId` 업데이트
- [ ] 해당 TR의 현재 Activity로 자동 선택
- [ ] Gantt가 Activity로 스크롤
- [ ] StoryHeader가 자동 갱신됨

#### Task 1.3: 단위 테스트
**파일**: `components/dashboard/__tests__/StoryHeader.test.tsx` (신규)

```typescript
describe("StoryHeader TR Dropdown", () => {
  it("renders TR dropdown with all TRs", () => {
    const trs = [
      { tr_id: "TR1", name: "Transformer 1" },
      { tr_id: "TR2", name: "Transformer 2" },
    ]
    render(<StoryHeader trs={trs} trId="TR1" />)
    expect(screen.getByText("Transformer 1")).toBeInTheDocument()
  })

  it("calls onTrSelect when TR changed", async () => {
    const onTrSelect = vi.fn()
    render(<StoryHeader trs={trs} onTrSelect={onTrSelect} />)
    // Select TR2
    await userEvent.click(screen.getByRole("combobox"))
    await userEvent.click(screen.getByText("Transformer 2"))
    expect(onTrSelect).toHaveBeenCalledWith("TR2")
  })
})
```

**Acceptance Criteria**:
- [ ] 드롭다운 렌더링 테스트 통과
- [ ] TR 선택 시 콜백 호출 테스트 통과

---

### Phase 2: Evidence 배지 강조 (1시간)

#### Task 2.1: Evidence 배지 variant 계산
**파일**: `app/page.tsx`

**변경사항**:
```typescript
const evidenceBadgeVariant = useMemo(() => {
  if (!storyHeaderActivity || !ssot) return "secondary"
  
  const targetState = getEvidenceTargetState(storyHeaderActivity.state)
  const gateResult = checkEvidenceGate(
    storyHeaderActivity,
    targetState,
    storyHeaderActivity.state,
    ssot
  )
  
  if (gateResult.missing.length === 0) return "success"
  if (gateResult.missing.length <= 2) return "warning"
  return "destructive"
}, [storyHeaderActivity, ssot])
```

**Acceptance Criteria**:
- [ ] 누락 0개 → "success"
- [ ] 누락 1-2개 → "warning"
- [ ] 누락 3개 이상 → "destructive"

#### Task 2.2: StoryHeader 배지 표시
**파일**: `components/dashboard/StoryHeader.tsx`

**변경사항**:
```typescript
interface StoryHeaderProps {
  // ... 기존 props
  evidenceBadgeVariant?: "success" | "warning" | "destructive" | "secondary"
}

// Evidence 블록에 배지 추가
<div className="flex items-center gap-2">
  <span className="text-sm">Evidence:</span>
  {evidenceBadgeVariant !== "secondary" && (
    <Badge variant={evidenceBadgeVariant}>
      {evidenceBadgeVariant === "destructive" ? "!" : "⚠"}
    </Badge>
  )}
  <span className="text-xs text-muted-foreground">{evidence}</span>
</div>
```

**Acceptance Criteria**:
- [ ] 녹색 배지 표시 (누락 0개)
- [ ] 노란색 배지 표시 (누락 1-2개)
- [ ] 빨간색 배지 표시 (누락 3개 이상)

#### Task 2.3: 배지 색상 테스트
**파일**: `components/dashboard/__tests__/StoryHeader.test.tsx`

```typescript
it("shows green badge when no evidence missing", () => {
  render(<StoryHeader evidenceBadgeVariant="success" evidence="Missing: 0" />)
  const badge = screen.getByRole("status")
  expect(badge).toHaveClass("bg-green")
})

it("shows red badge when 3+ evidence missing", () => {
  render(<StoryHeader evidenceBadgeVariant="destructive" evidence="Missing: 3" />)
  const badge = screen.getByRole("status")
  expect(badge).toHaveClass("bg-destructive")
})
```

**Acceptance Criteria**:
- [ ] 색상별 배지 테스트 통과

---

### Phase 3: 블록 클릭 핸들러 (2시간)

#### Task 3.1: 클릭 핸들러 구현
**파일**: `app/page.tsx`

**변경사항**:
```typescript
// Where 클릭 → Map
const handleWhereClick = () => {
  const mapSection = document.getElementById("map")
  mapSection?.scrollIntoView({ behavior: "smooth", block: "start" })
}

// When/What 클릭 → Detail
const handleWhenWhatClick = () => {
  if (!selectedActivityId) return
  const detailSection = document.getElementById("detail")
  detailSection?.scrollIntoView({ behavior: "smooth", block: "start" })
  setFocusedActivityId(selectedActivityId)
}

// Evidence 클릭 → Evidence Tab
const handleEvidenceClick = () => {
  if (!selectedActivityId) return
  evidenceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
}
```

**Acceptance Criteria**:
- [ ] Where 클릭 시 Map 섹션으로 스크롤
- [ ] When/What 클릭 시 Detail 섹션으로 스크롤 + Activity 하이라이트
- [ ] Evidence 클릭 시 Evidence 섹션으로 스크롤

#### Task 3.2: StoryHeader 클릭 가능 블록
**파일**: `components/dashboard/StoryHeader.tsx`

**변경사항**:
```typescript
interface StoryHeaderProps {
  // ... 기존 props
  onWhereClick?: () => void
  onWhenWhatClick?: () => void
  onEvidenceClick?: () => void
}

// Button 컴포넌트로 변경
<Button
  variant="ghost"
  size="sm"
  onClick={onWhereClick}
  className="cursor-pointer hover:bg-accent"
>
  📍 {where ?? "Location —"}
</Button>
```

**Acceptance Criteria**:
- [ ] Where/When/What/Evidence 블록이 클릭 가능
- [ ] 호버 시 커서가 포인터로 변경
- [ ] 클릭 시 콜백 호출

#### Task 3.3: 통합 테스트
**파일**: `__tests__/integration/story-header-click-handlers.test.ts` (신규)

```typescript
describe("StoryHeader Click Handlers", () => {
  it("scrolls to Map when Where clicked", async () => {
    render(<Page />)
    const scrollIntoViewMock = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoViewMock
    
    await userEvent.click(screen.getByText(/Now @ Mina Zayed/))
    
    expect(scrollIntoViewMock).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: "smooth" })
    )
  })

  it("highlights Activity when When/What clicked", async () => {
    render(<Page />)
    
    await userEvent.click(screen.getByText(/Load-out TR1/))
    
    expect(screen.getByTestId("activity-A1030")).toHaveClass("highlighted")
  })
})
```

**Acceptance Criteria**:
- [ ] Where 클릭 테스트 통과
- [ ] When/What 클릭 테스트 통과
- [ ] Evidence 클릭 테스트 통과

---

### Phase 4: 통합 검증 (1시간)

#### Task 4.1: E2E 테스트
**파일**: `__tests__/integration/story-header-ui-flow.test.ts` (신규)

**테스트 시나리오**:
```typescript
describe("StoryHeader UI Improvement E2E", () => {
  it("completes full TR selection → Evidence check flow", async () => {
    render(<Page />)
    
    // 1. TR 드롭다운 선택
    await userEvent.click(screen.getByRole("combobox"))
    await userEvent.click(screen.getByText("Transformer 2"))
    
    // 2. StoryHeader 갱신 확인
    expect(screen.getByText(/Now @ Arabian Gulf/)).toBeInTheDocument()
    
    // 3. Evidence 배지 확인
    const badge = screen.getByRole("status")
    expect(badge).toHaveClass("bg-warning") // 2개 누락
    
    // 4. Evidence 클릭 → 섹션 이동
    await userEvent.click(screen.getByText(/Missing: 2/))
    expect(screen.getByTestId("evidence-section")).toBeVisible()
  })
})
```

**Acceptance Criteria**:
- [ ] 전체 플로우 테스트 통과
- [ ] 모든 상호작용이 2-click 이내
- [ ] SSOT 일관성 유지

#### Task 4.2: SSOT 검증
**명령어**:
```bash
python scripts/validate_optionc.py data/schedule/option_c_v0.8.0.json CONTRACT
```

**Acceptance Criteria**:
- [ ] CONTRACT PASS
- [ ] entities.activities 구조 검증
- [ ] 모든 Activity에 tr_ids 존재

#### Task 4.3: 성능 프로파일링
**도구**: React DevTools Profiler

**측정 항목**:
- StoryHeader 렌더링 시간
- TR 선택 시 re-render 횟수
- useMemo 효과 검증

**목표**:
- StoryHeader 렌더링 < 16ms (60fps)
- TR 선택 시 re-render < 3회

#### Task 4.4: 접근성 검증
**도구**: axe-core, WAVE

**체크리스트**:
- [ ] 키보드 탐색 가능 (Tab, Enter)
- [ ] 스크린 리더 호환 (aria-label)
- [ ] 색상 대비 4.5:1 이상
- [ ] Focus indicator 표시

---

## 구현 순서

1. **Phase 1 (TR 드롭다운)** → SSOT 검증 → 커밋
2. **Phase 2 (Evidence 배지)** → 시각적 검증 → 커밋
3. **Phase 3 (클릭 핸들러)** → 통합 테스트 → 커밋
4. **Phase 4 (E2E 검증)** → 성능/접근성 → 최종 커밋

## 리스크 관리

### 리스크 1: TR 선택과 Activity 불일치 (High)

**문제**: TR 선택 변경 시 `selectedActivityId`가 업데이트되지 않으면 불일치 발생

**완화**:
```typescript
const handleTrSelect = (trId: string) => {
  setSelectedTrId(trId)
  // CRITICAL: Activity 자동 갱신
  const activityId = calculateCurrentActivityForTR(ssot, trId)
  if (activityId) setSelectedActivityId(activityId)
}
```

**검증**:
- [ ] TR 변경 시 Activity 자동 선택 확인
- [ ] StoryHeader 데이터 일관성 확인

### 리스크 2: useMemo 최적화 누락 (Medium)

**문제**: 불필요한 re-render로 성능 저하

**완화**:
- `evidenceBadgeVariant`, `storyHeaderData` 모두 useMemo 적용
- React DevTools Profiler로 측정

**검증**:
- [ ] TR 선택 시 불필요한 re-render 없음
- [ ] Profiler에서 렌더링 시간 < 16ms

### 리스크 3: SSOT 구조 변경 (Low)

**문제**: entities.activities가 null이거나 빈 객체일 경우

**완화**:
```typescript
if (!ssot?.entities?.activities) return null
```

**검증**:
- [ ] SSOT 로드 실패 시 fallback UI 표시
- [ ] 빈 SSOT에서도 크래시 없음

---

## 완료 조건 (DoD)

### 기능 완료
- [ ] TR 드롭다운 동작 (Phase 1)
- [ ] Evidence 배지 색상 강조 (Phase 2)
- [ ] 블록 클릭 시 스크롤/하이라이트 (Phase 3)

### 테스트 통과
- [ ] 단위 테스트 (StoryHeader)
- [ ] 통합 테스트 (page.tsx)
- [ ] E2E 테스트 (전체 플로우)

### 품질 검증
- [ ] `validate_optionc.py CONTRACT` PASS
- [ ] TypeScript 에러 0개
- [ ] Linter 경고 0개
- [ ] 접근성 체크 통과

### 문서화
- [ ] CHANGELOG.md 업데이트
- [ ] 구현 문서 작성 완료
- [ ] 다음 단계 제안

---

## 다음 단계 제안

### 단기 (즉시)
1. **Activity 선택 해제 개선**
   - Activity deselect 시 TR도 해제할지 결정
   - 현재: Activity만 해제 / 제안: TR도 해제

2. **Evidence 필터링**
   - Evidence 클릭 시 누락 항목만 필터링
   - 빠른 증빙 추가 지원

### 중기 (1-2일)
1. **SSOT 실시간 폴링**
   - 5초마다 SSOT 갱신
   - WebSocket 연동 검토

2. **StoryHeader 확장**
   - Blocker 상세 정보 표시
   - Risk Score 배지 추가

### 장기 (1주)
1. **Map 중심 이동**
   - Where 클릭 시 Map이 해당 Location으로 중심 이동
   - 애니메이션 효과

2. **Timeline 자동 스크롤**
   - When/What 클릭 시 Gantt가 Activity 중심으로

---

## 참고 문서

- [story-header-ssot-integration.md](story-header-ssot-integration.md) - SSOT 통합 (v1.10)
- [story-header-ui-improvement-plan.md](story-header-ui-improvement-plan.md) - 원본 계획
- [AGENTS.md](../AGENTS.md) - SSOT 원칙
- [patch.md](../patch.md) - 2-click 원칙

---

**Status**: 📋 **진행 중** (2026-02-04)  
**총 예상 공수**: 6시간 (Phase 1~4)  
**우선순위**: P1 (UX 핵심 개선)  
**담당**: TR Implementer
