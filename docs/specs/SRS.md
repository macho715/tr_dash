---
doc_id: srs
refs: [../AGENTS.md, ../patch.md, IMPLEMENTATION_SUMMARY.md]
updated: 2026-02-03
---

# 요구사항정의서 (SRS) — TR Movement Dashboard

**SSOT**: [AGENTS.md](../AGENTS.md), [patch.md](../patch.md).  
**구현 요약**: [IMPLEMENTATION_SUMMARY.md](../IMPLEMENTATION_SUMMARY.md).

---

## 1. 기능 요구사항

### 1.1 미션/스코프 (AGENTS §0)

- 제품 목표: TR(Transformer) 이동을 SSOT 관점으로 재구성한 대시보드.
- 운영 규모: 1 Trip당 1 TR 운송, 총 7 Trip, SPMT 1기 운영.
- 핵심 질문 3개를 모든 화면이 답해야 함: **Where**(지금 어디인가?), **When/What**(언제 무엇을 하며 무엇에 막히는가?), **Evidence**(무엇으로 증명되는가?).

### 1.2 핵심 기능

- **Global Control Bar**: Trip/TR 선택, View 버튼(Detailed Voyage Schedule 스크롤), Date Cursor, View Mode(Live/History/Approval/Compare), Risk Overlay. API 실패 시 voyages fallback, TR 7개 전부 노출.
- **2열 레이아웃**: 좌 Map+Detail, 우 Timeline (tr-three-column-layout). StoryHeader: Location/Schedule/Verification, Map/Timeline.
- **Gantt 차트**: 7개 항차 시각적 일정, Selected Date UTC(YYYY-MM-DD) 정렬, 활동 바 클릭 시 날짜 변경 Dialog.
- **스케줄 재계산**: 의존성 기반 Reflow, Preview→Apply 2단계, 충돌 검사.
- **Preview 패널**: 변경 사항 미리보기 및 충돌, Apply 시 상태 반영.
- **Compare Mode**: Baseline vs Compare delta overlay, CompareDiffPanel에 Baseline snapshot / Compare as-of 표시.
- **History/Evidence**: append-only, localStorage, Evidence gate(READY→IN_PROGRESS, COMPLETED→VERIFIED).
- **Trip Report Export**: MD/JSON. Next Trip Readiness: Ready/Not Ready, 마일스톤/증빙/블로커 체크리스트.

### 1.3 SSOT/데이터

- Activity가 SSOT. Plan/Actual/State/Evidence/History는 Activity에서만 권위. `option_c.json` 유지. Trip/TR은 Activity ref만, 파생은 UI에서 계산.

---

## 2. 비기능 요구사항

- **인지 시간**: 한 화면에서 Where→When/What→Evidence가 3초 내 읽혀야 함 (patch.md).
- **Plan 변경**: Preview→Apply 분리, Approval 모드에서는 Apply 불가.
- **Freeze/Lock**: actual.start/end 존재 시 해당 시각 Freeze; lock_level=HARD 또는 reflow_pins.strength=HARD 시 자동 조정 금지.
- **모드 분리**: Live(입력 가능), History(읽기 전용 as-of), Approval(Read-only), Compare(option_c 기준 delta).

---

## 3. 유저 스토리 (요약)

- **운영자**: Trip/TR 선택 → Gantt에서 활동 확인 → 날짜 변경 → Preview 확인 → Apply.
- **승인자**: Approval 모드에서 스냅샷·증빙 확인 → Export/Sign-off.
- **분석자**: Compare 모드에서 Baseline vs Live delta 확인.

---

**Refs**: [AGENTS.md](../AGENTS.md), [patch.md](../patch.md), [IMPLEMENTATION_SUMMARY.md](../IMPLEMENTATION_SUMMARY.md)
