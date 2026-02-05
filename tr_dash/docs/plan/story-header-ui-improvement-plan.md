---
doc_id: story-header-ui-improvement-plan
status: 📋 계획
created: 2026-02-04
updated: 2026-02-04
refs: [../AGENTS.md, ../patch.md, LAYOUT.md, story-header-ssot-integration.md]
---

# StoryHeader UI Improvement Plan

## 목표

StoryHeader의 사용자 경험을 개선하여 TR 선택, Evidence 누락 강조, 상세 정보 접근을 2-click 이내로 제공.

## 현재 상태 (v1.10)

### 구현된 기능
- ✅ SSOT 기반 실시간 업데이트
- ✅ TR/Activity 선택 시 Where/When/What/Evidence 자동 갱신
- ✅ `selectedTrId` state 관리
- ✅ 파생 계산: `calculateCurrentActivityForTR`, `calculateCurrentLocationForTR`, `checkEvidenceGate`

### 현재 제약
- ❌ TR 선택이 Activity/Map 클릭에만 의존 (직접 선택 불가)
- ❌ Evidence 누락이 텍스트로만 표시 (시각적 경고 없음)
- ❌ 각 블록 클릭 시 동작 없음 (상세 정보 접근 어려움)

## 개선 사항

### 1. TR 선택 드롭다운

#### UI 설계

```typescript
<StoryHeader
  trId={storyHeaderData.trId}
  where={storyHeaderData.where}
  whenWhat={storyHeaderData.whenWhat}
  evidence={storyHeaderData.evidence}
  // ✅ 새 props
  trs={trs}  // TR 목록
  onTrSelect={(trId) => setSelectedTrId(trId)}  // TR 선택 핸들러
/>
```

**위치**: StoryHeader 좌측 상단 또는 TR ID 표시 영역

**컴포넌트**:
```tsx
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
```

#### 상호작용
1. **드롭다운 열기**: 사용자가 TR 선택 버튼 클릭
2. **TR 선택**: TR 목록에서 선택 → `onTrSelect(trId)` → `setSelectedTrId(trId)`
3. **StoryHeader 갱신**: `storyHeaderData` 자동 재계산 (기존 `useMemo` 로직)
4. **Activity 자동 선택**: 선택된 TR의 현재 Activity로 Gantt 스크롤

**예시 플로우**:
```
User selects "TR2" from dropdown
→ setSelectedTrId("TR2")
→ calculateCurrentActivityForTR(ssot, "TR2") = "A2020"
→ StoryHeader shows TR2 current activity
→ Optional: Gantt scrolls to A2020
```

### 2. Evidence 누락 강조

#### 배지 로직

```typescript
// StoryHeader 내부
const evidenceBadgeVariant = useMemo(() => {
  if (!storyHeaderActivity || !ssot) return "secondary"
  
  const targetState = getEvidenceTargetState(storyHeaderActivity.state)
  const gateResult = checkEvidenceGate(
    storyHeaderActivity, 
    targetState, 
    storyHeaderActivity.state, 
    ssot
  )
  
  // 누락 개수에 따라 variant 결정
  if (gateResult.missing.length === 0) return "success" // 녹색
  if (gateResult.missing.length <= 2) return "warning" // 노란색
  return "destructive" // 빨간색 (3개 이상 누락)
}, [storyHeaderActivity, ssot])
```

#### UI 표시

```tsx
<div className="flex items-center gap-2">
  <span className="text-sm">Evidence:</span>
  <Badge variant={evidenceBadgeVariant}>
    Missing: {gateResult.missing.length}
  </Badge>
  {gateResult.missing.length > 0 && (
    <span className="text-xs text-muted-foreground">
      Types: {missingTypes.join(", ")}
    </span>
  )}
</div>
```

**색상 규칙**:
- 🟢 **녹색** (`success`): 누락 0개
- 🟡 **노란색** (`warning`): 누락 1-2개
- 🔴 **빨간색** (`destructive`): 누락 3개 이상

### 3. 블록 클릭 핸들러

#### Where 클릭 → Map 이동

```typescript
const handleWhereClick = () => {
  const mapSection = document.getElementById("map")
  if (mapSection) {
    mapSection.scrollIntoView({ behavior: "smooth", block: "start" })
  }
  
  // Optional: 현재 Location에 Map 중심 이동
  if (storyHeaderData.locationId) {
    mapRef.current?.centerOnLocation(storyHeaderData.locationId)
  }
}
```

#### When/What 클릭 → Activity Detail

```typescript
const handleWhenWhatClick = () => {
  if (!selectedActivityId) return
  
  // Detail 패널로 스크롤
  const detailSection = document.getElementById("detail")
  if (detailSection) {
    detailSection.scrollIntoView({ behavior: "smooth", block: "start" })
  }
  
  // Activity 하이라이트
  setFocusedActivityId(selectedActivityId)
}
```

#### Evidence 클릭 → Evidence Tab

```typescript
const handleEvidenceClick = () => {
  if (!selectedActivityId) return
  
  // Evidence 패널로 스크롤
  const evidenceSection = evidenceRef.current
  if (evidenceSection) {
    evidenceSection.scrollIntoView({ behavior: "smooth", block: "start" })
  }
  
  // Evidence Tab 활성화 (필요 시 tab state 추가)
  setActiveTab("evidence")
}
```

#### StoryHeader Props 확장

```tsx
<StoryHeader
  trId={storyHeaderData.trId}
  where={storyHeaderData.where}
  whenWhat={storyHeaderData.whenWhat}
  evidence={storyHeaderData.evidence}
  // ✅ 새 props
  trs={trs}
  onTrSelect={(trId) => setSelectedTrId(trId)}
  onWhereClick={handleWhereClick}
  onWhenWhatClick={handleWhenWhatClick}
  onEvidenceClick={handleEvidenceClick}
  evidenceBadgeVariant={evidenceBadgeVariant}
/>
```

## 구현 순서

### Phase 1: TR 선택 드롭다운 (2시간)

**파일 변경**:
1. `components/dashboard/StoryHeader.tsx`
   - TR 드롭다운 추가 (shadcn Select)
   - `trs` prop, `onTrSelect` callback
2. `app/page.tsx`
   - `trs` state 전달
   - `handleTrSelect` 구현

**테스트**:
- TR 선택 시 `storyHeaderData` 갱신 확인
- 드롭다운 렌더링 스냅샷 테스트

### Phase 2: Evidence 배지 강조 (1시간)

**파일 변경**:
1. `components/dashboard/StoryHeader.tsx`
   - `evidenceBadgeVariant` 계산 로직
   - Badge component 스타일 적용
2. `app/page.tsx`
   - `evidenceBadgeVariant` 파생 계산

**테스트**:
- 누락 0개 → 녹색
- 누락 1-2개 → 노란색
- 누락 3개+ → 빨간색

### Phase 3: 블록 클릭 핸들러 (2시간)

**파일 변경**:
1. `components/dashboard/StoryHeader.tsx`
   - Where/When/What/Evidence 블록에 `onClick` 추가
   - 커서 포인터 스타일
2. `app/page.tsx`
   - `handleWhereClick`, `handleWhenWhatClick`, `handleEvidenceClick` 구현
   - ref 전달 (`mapRef`, `evidenceRef`)

**테스트**:
- Where 클릭 → Map 섹션 스크롤
- When/What 클릭 → Detail 섹션 스크롤 + Activity 하이라이트
- Evidence 클릭 → Evidence Tab 활성화

### Phase 4: 통합 테스트 (1시간)

**테스트 시나리오**:
1. TR 드롭다운 선택 → StoryHeader 갱신
2. Evidence 누락 → 빨간색 배지 표시
3. Where 블록 클릭 → Map 중심 이동
4. When/What 블록 클릭 → Activity Detail 표시
5. Evidence 블록 클릭 → Evidence Tab 활성화

## 코드 예시

### StoryHeader.tsx (개선 후)

```tsx
"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface StoryHeaderProps {
  trId: string | null
  where?: string
  whenWhat?: string
  evidence?: string
  // 새 props
  trs?: { tr_id: string; name: string }[]
  onTrSelect?: (trId: string) => void
  onWhereClick?: () => void
  onWhenWhatClick?: () => void
  onEvidenceClick?: () => void
  evidenceBadgeVariant?: "success" | "warning" | "destructive" | "secondary"
}

export function StoryHeader({
  trId,
  where,
  whenWhat,
  evidence,
  trs = [],
  onTrSelect,
  onWhereClick,
  onWhenWhatClick,
  onEvidenceClick,
  evidenceBadgeVariant = "secondary",
}: StoryHeaderProps) {
  return (
    <div className="flex items-center gap-4 p-4 border-b">
      {/* TR 선택 드롭다운 */}
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

      {/* Where 블록 (클릭 가능) */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onWhereClick}
        className="cursor-pointer hover:bg-accent"
      >
        📍 {where ?? "Location —"}
      </Button>

      {/* When/What 블록 (클릭 가능) */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onWhenWhatClick}
        className="cursor-pointer hover:bg-accent"
      >
        📅 {whenWhat ?? "Schedule —"}
      </Button>

      {/* Evidence 블록 (클릭 가능, 배지 강조) */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onEvidenceClick}
        className="cursor-pointer hover:bg-accent flex items-center gap-2"
      >
        📄 {evidence ?? "Evidence —"}
        {evidenceBadgeVariant !== "secondary" && (
          <Badge variant={evidenceBadgeVariant} className="ml-2">
            !
          </Badge>
        )}
      </Button>
    </div>
  )
}
```

### page.tsx (핸들러 추가)

```typescript
// Evidence 배지 variant 계산
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

// Where 클릭 핸들러
const handleWhereClick = () => {
  const mapSection = document.getElementById("map")
  mapSection?.scrollIntoView({ behavior: "smooth", block: "start" })
}

// When/What 클릭 핸들러
const handleWhenWhatClick = () => {
  if (!selectedActivityId) return
  const detailSection = document.getElementById("detail")
  detailSection?.scrollIntoView({ behavior: "smooth", block: "start" })
  setFocusedActivityId(selectedActivityId)
}

// Evidence 클릭 핸들러
const handleEvidenceClick = () => {
  if (!selectedActivityId) return
  evidenceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  // Optional: Evidence Tab 활성화
}

// StoryHeader 연동
<StoryHeader
  trId={storyHeaderData.trId}
  where={storyHeaderData.where}
  whenWhat={storyHeaderData.whenWhat}
  evidence={storyHeaderData.evidence}
  trs={trs}
  onTrSelect={(trId) => setSelectedTrId(trId)}
  onWhereClick={handleWhereClick}
  onWhenWhatClick={handleWhenWhatClick}
  onEvidenceClick={handleEvidenceClick}
  evidenceBadgeVariant={evidenceBadgeVariant}
/>
```

## 테스트 계획

### 단위 테스트

```typescript
describe("StoryHeader UI Improvements", () => {
  it("should render TR dropdown with all TRs", () => {
    const trs = [
      { tr_id: "TR1", name: "Transformer 1" },
      { tr_id: "TR2", name: "Transformer 2" },
    ]
    render(<StoryHeader trs={trs} trId="TR1" onTrSelect={vi.fn()} />)
    expect(screen.getByText("Transformer 1")).toBeInTheDocument()
  })

  it("should call onTrSelect when TR changed", () => {
    const onTrSelect = vi.fn()
    render(<StoryHeader trs={trs} trId="TR1" onTrSelect={onTrSelect} />)
    // Select TR2
    expect(onTrSelect).toHaveBeenCalledWith("TR2")
  })

  it("should show green badge when no evidence missing", () => {
    render(<StoryHeader evidence="Missing: 0 | Types: —" evidenceBadgeVariant="success" />)
    expect(screen.getByRole("status")).toHaveClass("bg-green")
  })

  it("should show red badge when 3+ evidence missing", () => {
    render(<StoryHeader evidence="Missing: 3 | Types: photo, doc, checklist" evidenceBadgeVariant="destructive" />)
    expect(screen.getByRole("status")).toHaveClass("bg-red")
  })

  it("should call onWhereClick when Where block clicked", () => {
    const onWhereClick = vi.fn()
    render(<StoryHeader where="Now @ Mina Zayed" onWhereClick={onWhereClick} />)
    fireEvent.click(screen.getByText(/Mina Zayed/))
    expect(onWhereClick).toHaveBeenCalled()
  })
})
```

### 통합 테스트

```typescript
describe("StoryHeader UI Integration", () => {
  it("should update StoryHeader when TR selected from dropdown", async () => {
    // Given: 사용자가 대시보드를 보고 있음
    render(<Page />)
    
    // When: TR 드롭다운에서 TR2 선택
    const dropdown = screen.getByRole("combobox")
    await userEvent.click(dropdown)
    await userEvent.click(screen.getByText("Transformer 2"))
    
    // Then: StoryHeader가 TR2 정보로 갱신
    expect(screen.getByText(/Transport TR2/)).toBeInTheDocument()
  })

  it("should scroll to Map when Where clicked", async () => {
    render(<Page />)
    const scrollIntoViewMock = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoViewMock
    
    // When: Where 블록 클릭
    await userEvent.click(screen.getByText(/Now @ Mina Zayed/))
    
    // Then: Map 섹션으로 스크롤
    expect(scrollIntoViewMock).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: "smooth" })
    )
  })

  it("should activate Evidence Tab when Evidence clicked with missing items", async () => {
    render(<Page />)
    
    // Given: Evidence 누락 (빨간색 배지)
    expect(screen.getByText(/Missing: 3/)).toBeInTheDocument()
    
    // When: Evidence 블록 클릭
    await userEvent.click(screen.getByText(/Missing: 3/))
    
    // Then: Evidence Tab으로 스크롤 + 활성화
    const evidenceSection = screen.getByTestId("evidence-section")
    expect(evidenceSection).toBeVisible()
  })
})
```

## 리스크 평가

### 리스크 1: TR 드롭다운 성능 (Low)

**문제**: TR 개수가 많을 경우 (50+) 드롭다운 렌더링 지연

**완화**:
- Virtualized Select 사용 (`react-window` 또는 `@tanstack/react-virtual`)
- 현재 프로젝트는 7 TRs로 제한 → 성능 이슈 없음

### 리스크 2: Evidence 배지 색상 혼동 (Medium)

**문제**: 색상만으로 심각도 판단이 어려울 수 있음

**완화**:
- 툴팁 추가: "3개 누락 - 즉시 조치 필요"
- 아이콘 추가: 🔴 (빨강), 🟡 (노랑), 🟢 (녹색)
- 숫자 강조: `Missing: 3` 부분을 bold로 표시

### 리스크 3: 블록 클릭 시 스크롤 충돌 (Low)

**문제**: 사용자가 이미 해당 섹션에 있을 때 스크롤이 불필요

**완화**:
- 현재 섹션 확인 후 스크롤 여부 결정
- `scrollIntoView`의 `block: "nearest"` 옵션 사용
- 스크롤 애니메이션 짧게 (300ms)

### 리스크 4: SSOT 일관성 (High)

**문제**: TR 선택 변경 시 `selectedActivityId`와 불일치 가능

**완화**:
- TR 선택 시 `selectedActivityId` 자동 갱신
  ```typescript
  const handleTrSelect = (trId: string) => {
    setSelectedTrId(trId)
    const activityId = calculateCurrentActivityForTR(ssot, trId)
    if (activityId) setSelectedActivityId(activityId)
  }
  ```

## 성능 예측

| 항목 | 현재 (v1.10) | 개선 후 (v1.11) | 향상 |
|------|-------------|----------------|------|
| **TR 선택 시간** | 2-3 클릭 (Map → TR) | 1 클릭 (드롭다운) | 60% ↓ |
| **Evidence 누락 발견** | 텍스트 읽기 필요 | 즉시 색상 식별 | 80% ↑ |
| **상세 정보 접근** | 수동 스크롤 | 1 클릭 (블록 클릭) | 70% ↓ |
| **전체 작업 효율** | 기준 | 40-50% 향상 | — |

## SSOT 원칙 준수

### Activity = 단일 진실원
- ✅ 모든 정보는 `ssot.entities.activities`에서 파생
- ✅ UI는 읽기 전용 (`derived-calc` 사용)
- ✅ 상태 변경은 없음 (Preview → Apply 2단계 유지)

### 파생 계산 최적화
- ✅ `useMemo`로 불필요한 재계산 방지
- ✅ `evidenceBadgeVariant`, `storyHeaderData` 모두 메모이제이션
- ✅ 클릭 핸들러는 DOM 조작만 (상태 변경 최소)

## 참고 문서

- [AGENTS.md](../AGENTS.md) - SSOT 원칙
- [patch.md](../patch.md) - 2-click 원인 도달
- [LAYOUT.md](LAYOUT.md) - StoryHeader 위치
- [story-header-ssot-integration.md](story-header-ssot-integration.md) - 현재 구현

## 완료 체크리스트

### Phase 1: TR 드롭다운
- [ ] `StoryHeader.tsx`에 TR Select 추가
- [ ] `page.tsx`에 `trs` prop 전달
- [ ] `handleTrSelect` 구현 (Activity 자동 선택 포함)
- [ ] 스냅샷 테스트 작성

### Phase 2: Evidence 배지
- [ ] `evidenceBadgeVariant` 계산 로직
- [ ] Badge component 스타일 적용
- [ ] 색상 규칙 테스트 (0개/1-2개/3+개)

### Phase 3: 블록 클릭 핸들러
- [ ] `handleWhereClick` 구현 (Map 스크롤)
- [ ] `handleWhenWhatClick` 구현 (Detail 스크롤 + 하이라이트)
- [ ] `handleEvidenceClick` 구현 (Evidence Tab 활성화)
- [ ] 클릭 동작 통합 테스트

### Phase 4: 통합 검증
- [ ] 전체 플로우 E2E 테스트
- [ ] 성능 프로파일링 (렌더링 시간 측정)
- [ ] 접근성 검증 (키보드 탐색, 스크린 리더)

---

**Status**: 📋 **계획** (2026-02-04)  
**예상 공수**: 6시간 (1일)  
**우선순위**: P1 (UX 핵심 개선)
