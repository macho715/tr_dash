# SSOT Summary (첨부 Deep Insight 기반)

아래 4개는 반복적으로 P0/P1로 강조된 "절대 우선순위"다.

1) 시간대(UTC vs Local) 혼선 제거
- Selected Date는 UTC 기준일임을 명시
- Decision window는 Local(+UTC 병기)로 고정

2) Decision Center(Decision Card) 상단 고정
- Go/No-Go는 "결정: GO" 텍스트가 아니라
  Threshold/Validity/Owner/Evidence 충족률이 핵심

3) Apply 안전장치 계약
- Apply(N impacted) + impact 요약 모달 + 승인 + Undo 경로

4) History/Evidence/Approval은 "감사(Audit) 체계"
- localStorage는 다인 운영/감사에 취약 → append-only 서버 로그로 승격 로드맵 필요

근거: Deep Insight Report(v1) 및 2026-02-04 개선 리포트, Exec 백로그 요약.
