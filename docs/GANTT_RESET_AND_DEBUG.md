---
doc_id: gantt-reset-and-debug
created: 2026-02-05
updated: 2026-02-09
status: completed
phase: UI Enhancement + Debugging
refs: [WORK_LOG_20260209.md](WORK_LOG_20260209.md), [plan/gantt-reset-button-fix-plan.md](plan/gantt-reset-button-fix-plan.md)
---

# Gantt Chart Reset Button & Activity Visibility Debugging

**완료일**: 2026-02-05  
**목적**: Gantt 차트에 리셋 버튼 추가 및 Activity가 안 보이는 문제 디버깅

---

## 1. 구현 내용

### A. Gantt Reset 버튼 추가

#### 변경 파일
1. **`components/dashboard/timeline-controls.tsx`**
   - `RotateCcw` 아이콘 import 추가
   - `TimelineZoomCallbacks` 타입에 `onReset?: () => void` 추가
   - Reset 버튼 UI 추가 (주황색 hover effect)

2. **`components/dashboard/gantt-chart.tsx`**
   - `handleResetGantt()` 함수 구현
   - `zoomCallbacks`에 `onReset: handleResetGantt` 연결

#### Reset 동작
```typescript
const handleResetGantt = () => {
  // 1. View를 Day로 리셋
  onViewChange?.("Day")
  
  // 2. 필터 초기화
  setFilters({ criticalOnly: false, blockedOnly: false })
  
  // 3. Highlight flags 초기화
  onHighlightFlagsChange?.({ delay: false, lock: false, constraint: false })
  
  // 4. 모든 그룹 펼치기
  setCollapsedGroups(new Set())
  
  // 5. Event overlays 비활성화
  setEventOverlays({ showActual: false, showHold: false, showMilestone: false })
  
  // 6. Heatmap 비활성화
  setHeatmapEnabled(false)
  
  // 7. (2026-02-09 제거) fit() 호출 금지 — VisTimelineGantt의 useEffect(view, selectedDate)가 Day+14일 창을 설정한 뒤 fit()이 전체 프로젝트로 줌 아웃해 리셋을 무효화하므로 제거. 토스트만 동기 표시.
}
```

#### 2026-02-09 수정 (리셋이 안 되던 버그)

- **증상**: Reset 클릭 후 토스트는 뜨지만 뷰가 "Day + 14일"로 복원되지 않고 전체로 줌 아웃됨.
- **원인**: 위 7번의 `fit()`이 자식의 `setWindow(Day+14일)` 결과를 덮어씀.
- **조치**: `fit()` 호출 제거. 창은 `VisTimelineGantt`의 `useEffect([view, selectedDate])`만 사용. 상세: [WORK_LOG_20260209.md](WORK_LOG_20260209.md), [gantt-reset-button-fix-plan.md](plan/gantt-reset-button-fix-plan.md).

#### UI 위치
- Timeline controls bar 내 Zoom/Pan 버튼 옆
- 주황색 hover effect로 다른 버튼과 구분
- Tooltip: "Reset Gantt View"

---

## 2. Activity 안 보이는 문제 디버깅

### 현황 확인
✅ **데이터 구조 정상**
- `option_c_v0.8.0.json`: Contract v0.8.0 형식 (entities.activities 딕셔너리)
- 121개 activities 존재
- `tr_unit_id` 필드 정상 사용 중 (예: "TR-1", "TR-2", "MOBILIZATION")

✅ **코드 로직 정상**
- `lib/data/schedule-data.ts`: `normalizeToActivitiesArray()` 함수로 v0.8.0 형식 자동 변환
- `lib/gantt/grouping.ts`: `getTrLabel()` 함수로 `tr_unit_id` 처리

### 디버깅 코드 추가

#### 1. `components/dashboard/gantt-chart.tsx`
```typescript
const groupedVisData = useMemo(() => {
  console.log('[Gantt Debug] Building grouped vis data')
  console.log('[Gantt Debug] Filtered activities count:', filteredActivities.length)
  
  if (filteredActivities.length > 0) {
    const sample = filteredActivities[0]
    console.log('[Gantt Debug] Sample activity:', {
      id: sample.activity_id,
      title: sample.title,
      tr_unit_id: sample.tr_unit_id,
      planned_start: sample.planned_start,
      level1: sample.level1
    })
  }
  
  const result = buildGroupedVisData({ ... })
  
  console.log('[Gantt Debug] Result groups:', result?.groups.length ?? 0)
  console.log('[Gantt Debug] Result items:', result?.items.length ?? 0)
  
  return result
}, [...])
```

#### 2. `lib/gantt/grouping.ts`
```typescript
// TR 그룹 생성 시
console.log('[Grouping Debug] Processing activities:', activities.length)

// 첫 activity 샘플 로그
if (trMap.size === 0 && !trMap.has(tr)) {
  console.log('[Grouping Debug] First activity:', {
    id: activity.activity_id,
    tr_unit_id: activity.tr_unit_id,
    tr_label: tr,
    datePhase,
    level1: activity.level1
  })
}

// TR 그룹 수
console.log('[Grouping Debug] TR groups found:', trMap.size)
console.log('[Grouping Debug] TR labels:', Array.from(trMap.keys()))

// 최종 결과
console.log('[Grouping Debug] Final groups:', groups.length)
console.log('[Grouping Debug] Final items:', items.length)
```

---

## 3. 테스트 방법

### A. 브라우저 콘솔 확인
```bash
# 1. Dev server 실행
pnpm run dev

# 2. 브라우저에서 http://localhost:3000 열기

# 3. F12 → Console 탭
# 4. 다음 로그 확인:
# - [Gantt Debug] Filtered activities count: 121
# - [Grouping Debug] TR groups found: 8
# - [Gantt Debug] Result groups: X
# - [Gantt Debug] Result items: Y
```

### B. Reset 버튼 테스트
1. Gantt 차트에서 여러 변경 수행:
   - View를 Week로 변경
   - Filter 활성화 (Critical Only)
   - Highlight flags 활성화 (Delay)
   - Event overlays 활성화 (Show Actual)
   - Heatmap 활성화
   - 일부 그룹 접기
   - Zoom In/Out

2. Reset 버튼(⟲) 클릭

3. 모든 설정이 초기화되는지 확인:
   - ✅ View = Day
   - ✅ Filters 비활성화
   - ✅ Highlights 비활성화
   - ✅ Event overlays 비활성화
   - ✅ Heatmap 비활성화
   - ✅ 모든 그룹 펼침
   - ✅ Timeline fit (전체 보기)

---

## 4. TypeScript 타입 안전성

### 수정 사항
- `sample.label` → `sample.title` (ScheduleActivity 타입 준수)

### 타입 정의
```typescript
// timeline-controls.tsx
export type TimelineZoomCallbacks = {
  onZoomIn?: () => void
  onZoomOut?: () => void
  onToday?: () => void
  onFit?: () => void
  onPanLeft?: () => void
  onPanRight?: () => void
  onReset?: () => void  // ← 추가
}
```

---

## 5. 문제 해결 가이드

### Activity가 여전히 안 보인다면?

#### A. 브라우저 콘솔 로그 확인
```javascript
// 예상 출력:
[Gantt Debug] Filtered activities count: 121
[Grouping Debug] Processing activities: 121
[Grouping Debug] TR groups found: 8
[Grouping Debug] TR labels: ["MOBILIZATION", "TR Unit 1", "TR Unit 2", ...]
[Gantt Debug] Result groups: 16+
[Gantt Debug] Result items: 121+
```

#### B. 가능한 원인
1. **Filters 적용됨**: Critical Only / Blocked Only 체크
   → Reset 버튼으로 해제
   
2. **Groups 접혀있음**: TR 그룹이 접힌 상태
   → "Expand All" 버튼 또는 Reset 버튼
   
3. **Data loading 지연**: 새로고침 필요
   → Ctrl+Shift+R (강제 새로고침)
   
4. **Date range 밖**: Timeline 범위가 activity 밖
   → "Fit" 버튼 또는 Reset 버튼

#### C. 디버깅 체크리스트
- [ ] 브라우저 콘솔에 `[Gantt Debug]` 로그 표시되는가?
- [ ] `Filtered activities count` > 0인가?
- [ ] `TR groups found` > 0인가?
- [ ] `Result items` > 0인가?
- [ ] Network 탭에서 API 에러 없는가?
- [ ] React DevTools에서 `groupedVisData` 값 확인

---

## 6. 향후 개선 사항

### A. Reset 버튼 확장
- [ ] 날짜 커서를 프로젝트 시작일로 리셋
- [ ] 사용자 확인 dialog 추가 (옵션)
- [ ] Reset history (undo 기능)

### B. 디버깅 개선
- [ ] Production에서 디버그 로그 제거 (process.env.NODE_ENV)
- [ ] 로그 레벨 설정 (DEBUG, INFO, WARN, ERROR)
- [ ] 성능 모니터링 (grouping 시간 측정)

### C. Activity 가시성
- [ ] "Activity not found" 에러 메시지 개선
- [ ] Empty state UI (activities = 0일 때)
- [ ] Activity count badge (Timeline controls)

---

## 7. Refs

- [AGENTS.md](../AGENTS.md) - SSOT 원칙
- [LAYOUT.md](LAYOUT.md) - Gantt Chart 레이아웃
- [lib/gantt/grouping.ts](../lib/gantt/grouping.ts) - TR 그룹핑 로직
- [components/dashboard/gantt-chart.tsx](../components/dashboard/gantt-chart.tsx) - Gantt 메인 컴포넌트
- [components/dashboard/timeline-controls.tsx](../components/dashboard/timeline-controls.tsx) - Timeline 컨트롤

---

**작성**: AI Assistant (Cursor/Claude Sonnet 4.5)  
**완료일**: 2026-02-05  
**상태**: ✅ Completed
