# Migration plan (localStorage -> server)

P0) 현상 고정
- localStorage 키/구조 목록화
- 어떤 이벤트를 언제 기록해야 하는지 정의

P1) 서버 미러링
- UI 동작은 유지
- 이벤트 발생 시 audit_event에 insert
- 네트워크 실패 시 로컬 큐(선택)

P2) 서버 SSOT 전환
- History/Evidence 조회를 서버 기반으로 전환
- 로컬은 캐시/오프라인 fallback
