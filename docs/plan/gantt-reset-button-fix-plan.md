# Gantt 리셋 버튼 수정 계획

**Author:** tr-planner  
**Date:** 2026-02-09  
**Issue:** 리셋 버튼 클릭 시 리셋이 제대로 되지 않음

---

## 1. 문제 요약

- **증상:** "Reset Gantt View (Ctrl/⌘+Shift+R)" 버튼 클릭 후 토스트는 뜨지만, 줌/뷰가 “초기 상태(Day 뷰 + 선택일 기준 14일)”로 돌아가지 않음.
- **영향:** vis-timeline 엔진 사용 시에만 리셋 버튼이 노출되며, 해당 경로에서만 발생.

---

## 2. 원인 분석

### 2.1 리셋 흐름

1. `handleResetGantt()` (gantt-chart.tsx):
   - `onViewChange?.("Day")` → view = "Day"
   - `setSelectedDate(initialDate)` → selectedDate = initialDate
   - 기타 필터/하이라이트/그룹 접기/오버레이 등 초기화
   - **100ms 후** `visTimelineRef.current?.fit()` 호출 후 토스트 표시

2. VisTimelineGantt (VisTimelineGantt.tsx):
   - `view`, `selectedDate` 변경 시 **useEffect** 실행:
     - Day 뷰 = 14일, Week 뷰 = 56일
     - `selectedDate` 기준으로 창 중앙 계산 후 `timeline.setWindow(start, end)` 호출
   - 이 effect로 “Day 뷰 + 선택일 중심 14일”이 올바르게 설정됨.

### 2.2 버그 원인

- **useEffect**가 먼저 실행되어 **초기 상태(Day 뷰, 14일 창)**가 적용됨.
- 그 **100ms 뒤**에 `fit()`이 호출됨.
- vis-timeline의 `fit()`은 **전체 아이템이 보이도록** 창을 조정하므로, 프로젝트 전체 구간으로 줌 아웃됨.
- 그 결과, 방금 적용된 “Day 뷰 14일”이 **fit()에 의해 덮어씌워져** 리셋이 무효화됨.

**결론:** 리셋 직후 `fit()` 호출이 “초기 뷰로 복원”과 맞지 않아, 리셋이 제대로 되지 않음.

---

## 3. 수정 방안

- **변경:** `handleResetGantt` 내부에서 **`fit()` 호출 제거**.
- **이유:**  
  - 이미 `onViewChange("Day")` + `setSelectedDate(initialDate)`로 view/selectedDate가 바뀌며,  
  - VisTimelineGantt의 useEffect가 **Day 뷰 + initialDate 중심 14일**로 `setWindow`를 호출함.  
  - 따라서 별도 `fit()` 없이도 “초기 상태”로 복원됨.
- **토스트:** 리셋 완료 피드백은 유지하되, `setTimeout` 없이 동기적으로 표시.

---

## 4. 구현 (패치)

**파일:** `components/dashboard/gantt-chart.tsx`

- **기존 (12번 단계):**
  - `if (visTimelineRef.current) { setTimeout(() => { visTimelineRef.current?.fit(); toast.success(...) }, 100) }`
- **변경 후:**
  - `fit()` 제거. view/selectedDate 변경으로 자식 useEffect가 창을 설정하므로, 리셋 직후 토스트만 표시.
  - `toast.success("Gantt view reset to initial state", { duration: 2000 })` 를 **동기**로 호출 (useVisEngine일 때만 유지해도 됨; 비-vis 경로는 zoomCallbacks가 없어 리셋 버튼 자체가 없음).

---

## 5. 검증

- [ ] vis-timeline 뷰에서 리셋 버튼 클릭 → Day 뷰 + 선택일 기준 14일 창으로 복원되는지 확인.
- [ ] Ctrl/⌘+Shift+R 단축키로 리셋 → 동일 동작 확인.
- [ ] 토스트 "Gantt view reset to initial state" 정상 표시 확인.

*(구현: fit() 제거 반영됨. 브라우저 수동 검증 권장.)*

**구현 완료:** 2026-02-09 — `handleResetGantt`에서 fit() 제거 반영. 상세: [docs/WORK_LOG_20260209.md](../WORK_LOG_20260209.md).

---

## 6. Refs

- `components/dashboard/gantt-chart.tsx` — handleResetGantt, zoomCallbacks.onReset
- `components/gantt/VisTimelineGantt.tsx` — useEffect([view, selectedDate]) setWindow, fit()
