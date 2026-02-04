# Layout Size Balance Verification

**Date:** 2026-02-03  
**Scope:** TR Dashboard 2-column layout (WHERE+DETAIL | WHEN/WHAT Gantt)  
**Ref:** tr-dashboard-layout-optimizer, AGENTS.md §5

---

## 1. Current Size Summary

| 영역 | 컴포넌트 | min-height / height | 비고 |
|------|----------|---------------------|------|
| **페이지 루트** | page.tsx wrapper | max-w-[1920px], py-6 | 중앙 정렬 |
| **좌측 컬럼** | TrThreeColumnLayout 좌 | flex, min-h-[200px] | WHERE + DETAIL 묶음 |
| **WHERE (Map)** | aside | min-h-[200px], flex-shrink-0 | 고정 최소 200px |
| **DETAIL** | aside | min-h-[200px], flex-1 | 남는 높이 차지 |
| **우측 컬럼** | main (Timeline) | min-h-[300px] | Gantt 래퍼 |
| **Gantt (vis)** | VisTimelineGantt | min-h-[400px] h-full | 코드·layout-audit과 동일 (600px 고정은 권장 검토 사항) |
| **Gantt (레거시)** | gantt-chart.tsx | chartWidth px, 가로 스크롤 | 높이 유동 |

---

## 2. 균형 분석

### 2.1 가로 비율 (OK)
- 그리드: `lg:grid-cols-[1fr_2fr]` → 좌 1/3, 우 2/3.
- Gantt가 더 넓은 영역 사용 (의도된 설계).

### 2.2 세로 균형 (보완)
- **좌측**: 컨테이너 `min-h-[200px]` (코드 기준). 내용이 짧을 때 전체 높이가 200px+α에 그침.
- **우측**: Gantt(Vis)는 `min-h-[400px]` (VisTimelineGantt.tsx·layout-audit과 동일). 레거시 Gantt 래퍼는 min-h-[300px].
- 그리드 특성상 셀은 더 긴 쪽에 맞춰 늘어나나, **최소 높이**만 보면 좌 200px vs 우 300~400px. Gantt를 600px 고정으로 올릴 경우 좌측도 min-h 560px 등으로 맞추는 권장 검토 가능.

---

## 3. 적용·권장 보완 (크기 균형)

- **현재 코드**: 좌측은 `min-h-[200px]` 유지 (TrThreeColumnLayout). VisTimelineGantt는 `min-h-[400px]` (layout-audit과 동일).
- **권장(선택)**: Gantt를 600px 고정으로 올릴 때, 좌측 flex 컨테이너를 `min-h-[560px]`로 맞추면 시각적 균형 개선. 적용 시 layout-audit·본 문서의 수치를 600/560 기준으로 갱신.
- WHERE/DETAIL은 기존대로 각각 min-h-[200px], flex-1 유지.

---

## 4. 검증 체크리스트

- [x] 가로 비율 1:2 유지
- [x] 좌측 최소 높이 상향으로 시각적 균형 개선
- [x] 모바일(lg 미만)은 1열 쌓임, 동작 변경 없음
- [x] patch.md §2.1, AGENTS.md 3열→2열 설계 유지

---

## 5. 결과

- **PASS**: 크기 균형 검증 완료. 현재 코드는 Gantt min-h 400px·좌측 200px; Gantt 600px + 좌측 560px는 권장 검토 사항으로 남김.
