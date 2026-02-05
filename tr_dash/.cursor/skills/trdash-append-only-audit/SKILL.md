---
name: trdash-append-only-audit
description: TR_Dash의 History/Evidence/Approval을 append-only 서버 로그로 설계/구현한다. localStorage 기반 기록을 다인 운영/감사 가능 구조로 승격하고, decision/apply/evidence/approval 이벤트를 불변으로 남길 때 사용.
disable-model-invocation: true
---

# trdash-append-only-audit

## 원칙
- UPDATE/DELETE 대신 append-only 이벤트 추가로 버저닝한다.
- 로그에 비밀값/PII를 직접 저장하지 않는다(링크/해시/참조로 대체).

## 최소 구현(권장)
1) references/schema.md의 audit_event 테이블부터 시작
2) UI는 기존 패널을 유지하고, "쓰기"만 서버로 미러링 → 점진 전환
3) Export에 actor/ts/reason 메타가 포함되도록 한다

## Done 정의
- [ ] decision_confirmed / apply_completed / evidence_added 가 서버에 남는다
- [ ] History 패널이 서버 데이터를 조회한다(또는 미러링이 동작한다)
- [ ] 감사로그가 append-only로 유지된다
