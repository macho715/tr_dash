# Acceptance Criteria (P0 중심)

## Timezone / 2-clock
- [ ] 모든 주요 시간표기(Selected Date, Decision window, as-of)에 UTC/Local 배지가 있다
- [ ] Selected Date는 "UTC day index"임이 라벨로 고정되어 있다

## Empty state
- [ ] "Load SSOT..." 같은 개발자 문구가 사용자 UI에서 노출되지 않는다
- [ ] 빈 상태는 (원인 + CTA + 성공 시 결과) 3요소를 갖는다

## Apply safety
- [ ] Apply 버튼은 영향 범위(impacted count)를 노출한다
- [ ] Apply 클릭 시 요약(impact/conflict/rollback)이 먼저 나온다
- [ ] 실제 반영은 2-step confirm 이후만 가능하다
- [ ] Undo 경로가 UI에 존재하고, 성공 시 감사 로그(이벤트)가 남는다
