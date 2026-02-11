# TR1 Actual 반영 계획 (Plan vs Actual → SSOT)

**Author:** tr-planner  
**Date:** 2026-02-09  
**Source:** [tr 1 진행 완료 일정.md](../../tr%201%20진행%20완료%20일정.md) (ADNOC_TIMELINE.CSV vs Chat Summary vs agi tr final schedule.json)

---

## 1. 목적

TR Unit 1 구간의 **실제 일정(Actual)**을 SSOT에 반영한다.  
- **입력:** `tr 1 진행 완료 일정.md`에 정리된 ADNOC/채팅 기준 실제 시각  
- **출력:** `option_c_v0.8.0.json`(Contract v0.8.0) 내 `entities.activities[activity_id].actual` 및 해당 활동 `state` 갱신  
- **원칙:** AGENTS.md §1.1·§1.3 준수 — Activity가 SSOT, actual 존재 시 해당 시각 Freeze(리플로우 이동 금지).

---

## 2. 대상 파일

| 용도 | 경로 | 비고 |
|------|------|------|
| **SSOT (반영 대상)** | `data/schedule/option_c_v0.8.0.json` | `entities.activities` 내 actual / state 수정 |
| 참조(계획 대비 문서) | `tr 1 진행 완료 일정.md` | 계획(JSON) vs ADNOC vs Chat 요약 |
| 참조(플랫 일정) | `data/schedule/agi tr final schedule.json` | planned_start/planned_finish만 있음, actual 없음 |

- **option_c.json**(플랫 activities[])은 본 계획에서 직접 수정하지 않는다. Contract v0.8.0이 SSOT이며, 필요 시 동기화는 별도 작업.

---

## 3. 반영 대상 Activity 및 Actual 값

소스 문서 기준 **실제 시각**을 ISO 8601 **+04:00 (Gulf)** 로 기록한다.

### 3.1 핵심 5개 (문서 §3 테이블)

| activity_id | 활동 | 계획(문서 기준) | 실제 (ADNOC/채팅) | actual.start_ts | actual.end_ts | state |
|-------------|------|-----------------|--------------------|------------------|----------------|--------|
| A1060 | Load-out TR1 | 2026-01-30 | 2026-01-31 11:00 | `2026-01-31T11:00:00+04:00` | `2026-01-31T23:59:59+04:00` | completed |
| A1081 | Sail-away MZP→AGI | 2026-02-01 | 2026-01-31 20:36 | `2026-01-31T20:36:00+04:00` | `2026-01-31T20:36:00+04:00` | completed |
| A1091 | LCT Arrival AGI | 2026-02-02 | 2026-02-04 16:06 | `2026-02-04T16:06:00+04:00` | `2026-02-04T16:06:00+04:00` | completed |
| A1110 | Load-in TR1 | 2026-02-03 | 2026-02-04 (맥락) | `2026-02-04T00:00:00+04:00` | `2026-02-05T23:59:59+04:00` | completed |
| A1121 | LCT Sails back MZP | 2026-02-04 | 2026-02-08 14:38 | `2026-02-08T14:38:00+04:00` | `2026-02-08T14:38:00+04:00` | completed |

- **A1060:** "Load out started" 11:00 → start 11:00, end는 당일 종료로 설정.  
- **A1081:** "cast off" 20:36 → start/end 동일(이벤트 시점).  
- **A1091:** "1606 Berth 3" → start/end 동일.  
- **A1110:** 문서 "26/2/4–5 Berth 3" → 4일 시작~5일 종료로 구간 설정.  
- **A1121:** "1438 cast off" → start/end 동일. (현재 option_c_v0.8.0에 다른 값이 들어가 있으면 본 소스 기준으로 교정.)

### 3.2 보조 활동 (문서 §1·§2)

| activity_id | 활동 | 실제 (ADNOC/채팅) | actual.start_ts | actual.end_ts | state |
|-------------|------|--------------------|------------------|----------------|--------|
| A1070 | Seafastening | 31-Jan same day, done | `2026-01-31T00:00:00+04:00` | `2026-01-31T23:59:59+04:00` | completed |
| A1140 | TR1 Offload AGI | 08-Feb-26 11:00 | `2026-02-08T11:00:00+04:00` | `2026-02-08T11:00:00+04:00` | completed |
| A2029 | Bushra MZP 재도착 | 08-Feb-26 22:42 | `2026-02-08T22:42:00+04:00` | `2026-02-08T22:42:00+04:00` | completed |

---

## 4. 구현 태스크 (실행 순서)

- [x] **Task 1:** `data/schedule/option_c_v0.8.0.json` 백업 생성 (타임스탬프 포함 파일명). → `option_c_v0.8.0_backup_20260209_tr1actual.json`
- [x] **Task 2:** §3.1 핵심 5개 activity에 대해 `entities.activities[activity_id].actual.start_ts`, `actual.end_ts` 설정 및 `state` → `completed`.
- [x] **Task 3:** §3.2 보조 3개(A1070, A1140, A2029) 동일 방식으로 actual·state 반영.
- [x] **Task 4:** `scripts/validate_optionc.py`(또는 프로젝트 규약의 SSOT 검증 스크립트) 실행 → CONTRACT/스키마 통과 확인. → PASS (2026-02-09, tr-implementer)
- [ ] **Task 5:** (선택) `option_c.json` / `agi tr final schedule.json`와의 동기화 정책이 있다면 해당 runbook에 따라 후속 작업 이슈 기록.

---

## 5. 검증 및 DoD

| 항목 | 조건 |
|------|------|
| SSOT 검증 | `validate_optionc.py` 통과 (Contract v0.8.0). |
| 변경 범위 | `plan.*` 필드 변경 없음. `actual.start_ts`/`actual.end_ts` 및 `state`만 변경. |
| Freeze | actual이 설정된 활동은 리플로우 시 해당 시각 이동 금지(엔진/UI 동작 확인). |
| 문서 일치 | 반영 후 대시보드/History 모드에서 TR1 구간이 "tr 1 진행 완료 일정.md" 요약과 불일치 없음. |

**Definition of Done**

- 위 5개 Task 완료.
- SSOT 검증 스크립트 통과.
- (선택) tr-verifier 또는 수동으로 Live/History 뷰에서 TR1 actual 표시 확인.

---

## 6. 주의사항 및 리스크

- **Freeze:** actual이 채워진 활동은 AGENTS.md §1.3에 따라 리플로우에서 이동되지 않아야 한다. 기존 Reflow/Preview 로직이 이를 존중하는지 확인.
- **타임존:** 소스 문서 시각은 현지(UAE) 기준으로 해석하며, SSOT에는 `+04:00`로 통일.
- **A1121 기존 값:** 현재 option_c_v0.8.0.json에 A1121 actual이 다른 시각(18:42Z 등)으로 들어가 있을 수 있음. 본 계획은 **문서 기준 2026-02-08 14:38 +04:00** 로 통일한다.
- **증빙(Evidence):** 본 계획은 actual 반영만 다룸. Evidence 링크/required_types 반영은 별도 작업.

---

## 7. Refs

- [AGENTS.md](../../AGENTS.md) §1.1 SSOT, §1.3 Freeze/Lock
- [tr 1 진행 완료 일정.md](../../tr%201%20진행%20완료%20일정.md)
- Contract: option_c_v0.8.0 (entities.activities[].actual.start_ts / end_ts, state)
- 검증: `scripts/validate_optionc.py` (또는 `.cursor/skills/tr-dashboard-autopilot/scripts/` 내 동일 스크립트)

---

## 8. 대시보드 적용 및 검증 (tr-planner 갱신 2026-02-09)

### 8.1 적용 내용

| 구분 | 이전 | 이후 |
|------|------|------|
| **Map / Story 헤더 / 상세 패널** | `/api/ssot` → `option_c_v0.8.0.json` (첫 번째 후보) | 변경 없음. TR1 actual·completed 표시됨. |
| **Gantt / 타임라인** | `lib/data/schedule-data.ts`에서 **option_c.json** 우선 사용 → actual 미반영 | **option_c_v0.8.0.json** 우선 사용으로 변경 → Gantt에도 TR1 actual·completed 반영. |

- **변경 파일:** `lib/data/schedule-data.ts` — Contract v0.8.0(entities 있음)이 있으면 해당 파일을 우선 선택.

### 8.2 수동 검증 체크리스트

1. **dev 서버:** 기존 `next dev`가 떠 있으면 그대로 사용. 충돌 시 한 번 종료 후 `pnpm dev`(또는 `npm run dev`) 재실행. (주소: `http://localhost:3000` 또는 터미널 표시 포트.)
2. **브라우저:** 해당 주소 접속 → **Trip 1** → **TR1** 선택 → **새로고침(F5)**.
3. **확인 항목:**
   - **Gantt/타임라인:** TR1 구간(A1060, A1081, A1091, A1110, A1121 등)에 actual 구간/완료 표시.
   - **상세 패널(Detail):** 해당 activity 선택 시 actual 날짜 및 **completed** 상태.
   - **Story 헤더 / Map:** TR1 기준 현재 활동·위치가 actual 기준으로 표시.

### 8.3 정리

- SSOT 반영(§4 Task 1~4) + 대시보드 Gantt SSOT 정렬(§8.1)까지 완료 시, "대시보드에 적용되었는가"는 위 체크리스트로 검증 가능.

### 8.4 검증 실행 결과 (2026-02-09)

| 항목 | 결과 | 비고 |
|------|------|------|
| **validate_optionc.py** | **PASS** | `data/schedule/option_c_v0.8.0.json` — Activities: 121, Trips: 7, TRs: 7, Collisions: 0 |
| **TR1 actual·state** | **8건 일치** | `option_c_v0.8.0.json` 내 `"state": "completed"` 8개 (A1060, A1070, A1081, A1091, A1110, A1121, A1140, A2029) |
| **schedule-data.ts** | **v0.8.0 우선** | `hasEntitiesActivities(optionCv08)` 시 `option_c_v0.8.0.json` 사용 확인 |
| **수동(브라우저)** | 사용자 확인 | dev 서버 재기동 후 Trip 1 / TR1 선택 → 새로고침 → Gantt·Detail·Story·Map에서 actual·completed 확인 |
