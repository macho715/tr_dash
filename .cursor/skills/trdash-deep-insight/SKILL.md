---
name: trdash-deep-insight
description: TR_Dash 운영 대시보드 UX/IA를 Deep Insight 리포트 기반으로 개선한다. DECIDE→EXECUTE→AUDIT 구조, Decision Card(Go/No-Go), UTC/Local 2-clock 표기, Apply 승인(impact 요약→확인), Empty state(Load SSOT 제거), ViewMode(Live/History/Approval/Compare) 재해석이 필요할 때 사용.
---

# trdash-deep-insight

## 언제 사용하나
- "기능은 많은데, 교대 운영자가 무엇을 먼저 해야 하는지"가 불명확할 때
- UTC(선택일) vs Local(결정창) 혼재로 실수/불신이 생길 때
- Apply가 위험한데, 실행 요약/승인/롤백 계약이 약할 때
- History/Evidence가 빈 상태(Load SSOT 등)로 제품 신뢰를 깎을 때

## 출력물(항상 남겨라)
1) 변경 설계(요약) + PR 단위 백로그(P0/P1/P2)
2) acceptance criteria (UX/데이터/안전)
3) 측정 이벤트(최소: decision/apply/undo/conflict)

## 작업 규칙(핵심)
### A. IA 재정렬: DECIDE → EXECUTE → AUDIT
- DECIDE: Shift Brief + Go/No-Go + 48h 핵심 작업(1st viewport)
- EXECUTE: Schedule 변경/Preview/Conflict/Apply/Undo
- AUDIT: History/Evidence/Closeout/Export

### B. ViewMode는 "데이터 탭"이 아니라 "작업 모드"
- Live = Monitor/Execute
- Compare = Plan
- Approval + History = Governance/Audit
(기존 구조를 최대한 재사용하고, 가시성/권한/CTA만 재배치)

### C. P0 체크리스트(먼저 이것부터)
- UTC/Local 2-clock 라벨을 모든 주요 시간표기에 강제
- "Load SSOT…" 같은 빈 상태 제거: 원인 + 즉시 해결 CTA 제공
- Apply는 항상: 영향 요약(impacted N, conflicts M) → 2-step confirm → 결과 기록 → Undo 경로
- 핵심 라벨(혼용/중복) 정리

## 실행 절차(권장)
1) 현재 화면에서 "혼란 지점" 3개를 텍스트로 고정(타임존/empty/apply)
2) references/ssot-summary.md 기준으로 P0 백로그를 PR 1~3개로 쪼갠다
3) references/acceptance-criteria.md로 수용기준을 먼저 박고 구현한다
4) 구현 후 /verifier로 검증을 돌린다
5) 변경안이 DECIDE 우선순위를 깨면 /ux-auditor로 리젝트한다
