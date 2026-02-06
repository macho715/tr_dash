---
doc_id: schedule-display-improvement-report
refs: [../WORK_LOG_20260206.md, tr-dashboard-4-feature-plan.md, tr-dashboard-next-steps-detailed-plan.md, what-if-verification-report.md]
updated: 2026-02-06
version: 1.0
status: completed
---

# Part 4: 일정 변경 표시 방법 개선 구현 리포트

**구현일**: 2026-02-06  
**담당**: AI Assistant  
**상태**: ✅ 완료

---

## 📋 Executive Summary

| 항목 | 상태 | 비고 |
|------|------|------|
| **GanttLegend 컴포넌트** | ✅ 완료 | 8가지 bar 유형 표시 |
| **Timeline Controls 통합** | ✅ 완료 | Drawer 형태로 통합 |
| **Ghost Bar Tooltip 개선** | ✅ 완료 | Before/After/Delta 상세 정보 |
| **Tooltip Builder 유틸리티** | ✅ 완료 | 재사용 가능한 함수 |
| **브라우저 테스트** | ⏳ 필요 | 수동 검증 필요 (사용자) |

**결과**: Gantt chart의 bar 가독성이 크게 개선되었습니다. 범례와 상세 tooltip으로 사용자가 각 bar의 의미를 쉽게 이해할 수 있습니다.

---

## 🎨 구현 내용

### Task 2.1: GanttLegend 컴포넌트 생성 ✅

#### 파일: `components/dashboard/GanttLegend.tsx` (신규, 200 LOC)

**주요 기능:**
1. **8가지 Bar 유형 표시**:
   - ✅ Planned (파랑): 원래 일정
   - ✅ Actual (초록): 실제 진행
   - ✅ Collision (빨강): 리소스 충돌
   - ✅ Preview (점선): What-if/Weather 시뮬레이션
   - ✅ Compare (노랑 반투명): 일정 비교
   - ✅ Weather Delay (주황): 기상 영향
   - ✅ Hold (보라 반투명): 작업 중단
   - ✅ Milestone (청록 점): 주요 체크포인트

2. **두 가지 표시 모드**:
   - **Compact Mode**: 4개 주요 항목만 (Planned/Actual/Collision/Preview)
   - **Expanded Mode**: 8개 전체 항목 + 설명

3. **GanttLegendDrawer**:
   - 기본: 접힌 상태 ("Legend" 버튼)
   - 클릭: 확장된 범례 표시
   - 닫기: X 버튼으로 다시 접기

#### 코드 구조:

```tsx
// Basic Legend Item
interface LegendItemProps {
  color: string
  label: string
  description?: string
}

function LegendItem({ color, label, description }: LegendItemProps) {
  return (
    <div className="flex items-center gap-2 group">
      <div className={`h-4 w-8 rounded ${color}`} />
      <div className="flex flex-col">
        <span className="text-slate-300 text-xs font-medium">{label}</span>
        {description && (
          <span className="text-slate-500 text-[10px] opacity-0 group-hover:opacity-100">
            {description}
          </span>
        )}
      </div>
    </div>
  )
}

// Main Legend Component
export function GanttLegend({ className = "", compact = false }) {
  if (compact) {
    // Compact view: 4 main items only
  }
  
  return (
    <div className="gantt-legend ...">
      <LegendItem color="bg-blue-500" label="Planned" description="Original schedule" />
      <LegendItem color="bg-green-500" label="Actual" description="Real progress" />
      {/* ... 6 more items ... */}
    </div>
  )
}

// Drawer Wrapper (Collapsible)
export function GanttLegendDrawer() {
  const [isOpen, setIsOpen] = useState(false)
  
  return (
    <div>
      {!isOpen && <button onClick={() => setIsOpen(true)}>Legend</button>}
      {isOpen && (
        <div>
          <button onClick={() => setIsOpen(false)}>X</button>
          <GanttLegend />
        </div>
      )}
    </div>
  )
}
```

#### 스타일링:
- **배경**: `bg-slate-800/50` (반투명 다크)
- **테두리**: `border border-slate-700/50`
- **텍스트**: `text-slate-300` (라벨), `text-slate-500` (설명)
- **Hover**: 설명이 나타남 (`opacity-0 group-hover:opacity-100`)

---

### Task 2.2: Timeline Controls 통합 ✅

#### 파일: `components/dashboard/timeline-controls.tsx` (수정, +3 LOC)

**변경 사항:**
1. **Import 추가**:
   ```tsx
   import { GanttLegendDrawer } from "./GanttLegend"
   ```

2. **범례 배치**:
   - 위치: Timeline controls 우측 상단
   - "Jump to" 날짜 입력 왼쪽
   - 기존 UI 흐름을 방해하지 않음

```tsx
<div className="ml-auto flex flex-wrap items-center gap-2">
  {/* Gantt Legend Drawer */}
  <GanttLegendDrawer />
  
  <input value={jumpDate} ... />
  <button>Go</button>
</div>
```

#### Before/After:
**Before**:
```
[Filters] ... [Jump to: [____] Go]
```

**After**:
```
[Filters] ... [Legend] [Jump to: [____] Go]
```

---

### Task 2.3: Ghost Bar Tooltip 개선 ✅

#### 파일: `lib/gantt/visTimelineMapper.ts` (수정, +35 LOC)

**향상된 What-If Tooltip**:

```
╔═══════════════════════════════════════╗
║  🔮 WHAT-IF SIMULATION                 ║
╚═══════════════════════════════════════╝

📋 Activity: LO-A-010

━━━ 📅 Original Plan ━━━
  Start:  2026-01-15
  Finish: 2026-01-20

━━━ 🔮 Preview (What-If) ━━━
  Start:  2026-01-18
  Finish: 2026-01-23

━━━ 📊 Changes (Δ) ━━━
  Δ +3 days

━━━ ℹ️  Scenario ━━━
  Reason: SPMT breakdown simulation
  Confidence: 85%

━━━ ⚠️  Impact ━━━
  Affected: 5 activities
  🔴 Conflicts: 2

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 This is a preview only
   Click "Apply" to commit changes
```

#### Before (기존):
```
What-If: SPMT breakdown simulation (+3 days, 85% confidence)
```

#### After (개선):
- ✅ Before/After 날짜 명시
- ✅ Delta 계산 표시
- ✅ 영향받는 activity 수
- ✅ 충돌 수 (있을 경우)
- ✅ 시나리오 상세 정보
- ✅ 사용자 가이드 ("This is a preview only")

---

### Task 2.4: Tooltip Builder 유틸리티 ✅

#### 파일: `lib/gantt/tooltip-builder.ts` (신규, 190 LOC)

**재사용 가능한 Tooltip 함수**:

```typescript
// Main function: Enhanced tooltip with full details
export function buildEnhancedGhostBarTooltip(
  data: GhostBarTooltipData
): string {
  // Calculate deltas
  const deltaDays = diffUTCDays(data.oldStart, data.newStart)
  const durationBefore = diffUTCDays(data.oldStart, data.oldFinish)
  const durationAfter = diffUTCDays(data.newStart, data.newFinish)
  
  // Build multi-line tooltip with:
  // - Header (type-specific emoji + label)
  // - Activity info
  // - Original Plan section
  // - Preview section
  // - Delta section
  // - Metadata (What-If scenario, Impact)
  // - Footer help text
}

// Compact version for limited space
export function buildCompactGhostBarTooltip(
  data: GhostBarTooltipData
): string {
  // Single line: "🔮 What-If | Activity | Date → Date (Δ +3 days)"
}

// Helper to convert DateChange to TooltipData
export function dateChangeToTooltipData(
  change: DateChange,
  type: "what_if" | "reflow" | "weather" | "compare",
  metadata?: { ... }
): GhostBarTooltipData
```

**지원 Ghost Bar 유형**:
- ✅ What-If Simulation (`what_if`)
- ✅ Reflow Preview (`reflow`)
- ✅ Weather Delay (`weather`)
- ✅ Schedule Comparison (`compare`)

**메타데이터 지원**:
- `reason`: 시나리오 이유
- `delay_days`: 지연 일수
- `confidence`: 신뢰도
- `affected_count`: 영향받는 activity 수
- `conflict_count`: 새 충돌 수

---

## 📊 구현 세부사항

### 색상 팔레트 (Tailwind CSS)

| Bar 유형 | 색상 클래스 | RGB | 용도 |
|----------|------------|-----|------|
| Planned | `bg-blue-500` | `#3B82F6` | 기본 계획 |
| Actual | `bg-green-500` | `#22C55E` | 실제 진행 |
| Collision | `bg-red-500` | `#EF4444` | 충돌/문제 |
| Preview | `border-dashed border-gray-400` | `#9CA3AF` | 가상 (점선) |
| Compare | `bg-yellow-500 opacity-50` | `#EAB308` (50%) | 비교 모드 |
| Weather | `bg-orange-500` | `#F97316` | 기상 영향 |
| Hold | `bg-purple-500/30 border-purple-500/50` | `#A855F7` (30%) | 작업 중단 |
| Milestone | `bg-cyan-500 shadow-cyan` | `#06B6D4` | 마일스톤 |

### 반응형 디자인

#### Desktop (≥1024px):
```
┌─────────────────────────────────────────────────────────┐
│ [Filters] ... [Legend ▼] [Jump to: [____] Go]          │
└─────────────────────────────────────────────────────────┘
```

#### Tablet/Mobile (<1024px):
```
┌────────────────────────────┐
│ [Filters]                  │
│ [Legend ▼]                 │
│ [Jump to: [____] Go]       │
└────────────────────────────┘
```

범례는 `flex-wrap`으로 자동 줄바꿈 지원.

---

## ✅ Acceptance Criteria 검증

| Criteria | 코드 검증 | 브라우저 테스트 | 상태 |
|----------|-----------|------------------|------|
| Gantt chart에 범례 표시 (8가지 bar 유형) | ✅ 구현됨 | ⏳ 필요 | **Pass (코드)** |
| 범례 아이템이 실제 bar 스타일과 일치 | ✅ 구현됨 | ⏳ 필요 | **Pass (코드)** |
| Ghost bar hover 시 상세 tooltip 표시 | ✅ 구현됨 | ⏳ 필요 | **Pass (코드)** |
| Tooltip에 Original→Preview, Delta, Impact 포함 | ✅ 구현됨 | ⏳ 필요 | **Pass (코드)** |
| Tooltip 가독성 (포맷팅, 이모지) | ✅ 구현됨 | ⏳ 필요 | **Pass (코드)** |
| 범례 Drawer 토글 동작 (열기/닫기) | ✅ 구현됨 | ⏳ 필요 | **Pass (코드)** |
| 여러 변경 유형 동시 표시 시 구분 명확 | ✅ 구현됨 | ⏳ 필요 | **Pass (코드)** |

---

## 🧪 수동 테스트 가이드 (사용자용)

### Test Scenario 1: 범례 표시 및 Drawer 동작

#### Steps:
```
1. 로컬 서버 실행: `pnpm dev`
2. 브라우저: `http://localhost:3001`
3. Gantt chart Timeline controls 영역 확인
4. "Legend" 버튼 클릭
5. 기대 결과:
   ✅ 범례 패널 확장 (8가지 bar 유형 표시)
   ✅ 각 bar 색상과 라벨 매칭
   ✅ Hover 시 설명 표시
6. X 버튼 클릭
7. 기대 결과:
   ✅ 범례 패널 닫힘
   ✅ "Legend" 버튼만 표시
```

### Test Scenario 2: Ghost Bar Tooltip (What-If)

#### Steps:
```
1. Activity 클릭 → What-if 패널 열기
2. Delay +3일 설정
3. Reason 입력: "SPMT breakdown"
4. "Simulate" 클릭
5. Gantt에서 ghost bar (점선) 위에 마우스 hover
6. 기대 결과:
   ✅ 상세 tooltip 표시 (Before/After/Delta/Scenario/Impact)
   ✅ 이모지와 구분선으로 가독성 향상
   ✅ "This is a preview only" 안내 문구
```

### Test Scenario 3: 여러 Ghost Bar 동시 표시

#### Steps:
```
1. What-if 시뮬레이션 실행 (ghost bar 생성)
2. Compare mode 전환 (또 다른 ghost bar)
3. Weather delay 시뮬레이션 (세 번째 ghost bar)
4. 기대 결과:
   ✅ 3가지 ghost bar가 모두 표시됨
   ✅ 각 bar의 색상/스타일이 다름 (범례 참조)
   ✅ Hover 시 각 bar의 tooltip이 다른 내용
   ✅ 범례를 참조하여 bar 유형 식별 가능
```

---

## 🎨 UI/UX 개선 효과

### Before (개선 전):
- ❌ Ghost bar의 의미를 알기 어려움
- ❌ Tooltip이 짧고 정보 부족
- ❌ 여러 ghost bar 동시 표시 시 혼란

### After (개선 후):
- ✅ 범례로 bar 유형 명확히 이해
- ✅ 상세 tooltip으로 Before/After/Delta 한눈에 파악
- ✅ 이모지와 구분선으로 가독성 향상
- ✅ "Preview only" 안내로 혼란 방지

---

## 📝 생성/수정 파일 목록

| 파일 | 변경 | LOC | 역할 |
|------|------|-----|------|
| `components/dashboard/GanttLegend.tsx` | 🆕 신규 | +200 | 범례 컴포넌트 |
| `components/dashboard/timeline-controls.tsx` | ✏️ 수정 | +3 | 범례 통합 |
| `lib/gantt/tooltip-builder.ts` | 🆕 신규 | +190 | Tooltip 유틸리티 |
| `lib/gantt/visTimelineMapper.ts` | ✏️ 수정 | +35 | What-If tooltip 개선 |

**Total**: +428 LOC (2개 신규, 2개 수정)

---

## 🚀 다음 단계

### Immediate (즉시)
1. **브라우저 테스트**: 3가지 Test Scenario 실행
2. **스크린샷 수집**: 범례 패널, Ghost bar tooltip (선택)
3. **이슈 보고**: 발견 시 (예상: 없음)

### Short-term (단기)
4. **Option 6: 커밋** (Part 4 구현 포함)
5. **Option 3: Part 2로 진행** (History 입력/삭제)
6. **Option 4: 테스트 자동화** (선택)

---

## 🎯 결론

Part 4 (일정 변경 표시 개선)가 **완료**되었습니다! 🎉

### 구현 완료 항목:
1. ✅ GanttLegend 컴포넌트 (8가지 bar 유형)
2. ✅ GanttLegendDrawer (접기/펼치기)
3. ✅ Timeline Controls 통합
4. ✅ Ghost Bar Tooltip 개선 (Before/After/Delta/Impact)
5. ✅ Tooltip Builder 유틸리티

### 남은 작업:
- ⏳ 수동 브라우저 테스트 (사용자 확인 필요)

### 권장 다음 단계:
1. **브라우저 테스트** → 범례/Tooltip 동작 확인
2. **커밋** → Part 3-4 구현 내용
3. **Part 2로 진행** → History 입력/삭제 기능

---

**구현 완료**: 2026-02-06  
**Total Time**: ~1.5시간 (예상 4시간 중 조기 완료)  
**다음 검토**: 사용자 브라우저 테스트 후
