# AGENTS.md — TR Movement Dashboard (SSOT: option_c.json)

**Last updated:** 2026-02-12 (Asia/Dubai)  
**최신 작업 반영:** 2026-02-12 — AI intent 확장: **explain_why**(Why 2-click 요약), **navigate_query**(Where/When/What 질의→Map/Detail 포커스). selectedActivityId·onNavigateToMap 연동. 이전: 2026-02-11 — AI LLM 타임아웃(9초)·fallback·컨텍스트 축소. 2모델 Dual-pass, Governance·What-if. FilterDrawer. Release Split. [CHANGELOG.md](CHANGELOG.md).

> 이 저장소에서 작업하는 모든 AI 코딩 에이전트는 아래 규칙을 "절대 우선"으로 준수한다.  
> **목표:** TR 하나 = 하나의 이동 스토리. 한 화면에서 Where → When/What → Evidence가 3초 내 읽혀야 한다.

---

## 0) 미션 / 스코프

- **제품 목표:** TR(Transformer) 이동을 SSOT 관점으로 재구성한 대시보드
- **운영 규모:** 1 Trip당 1 TR 운송, 총 7 Trip, SPMT 1기 운영
- **핵심 질문 3개를 모든 화면이 답해야 함:**
  1. **Where:** 지금 어디인가?
  2. **When/What:** 언제 무엇을 하며 무엇에 막히는가?
  3. **Evidence:** 무엇으로 증명되는가?

---

## 1) 불변조건 (Non-Negotiables)

### 1.1 SSOT 원칙

- Activity가 단일 진실원(SSOT)이다: Plan/Actual/State/Evidence/History는 Activity 객체에서만 "권위"를 갖는다.
- `option_c.json`은 Activity의 SSOT(정의/상태/Actual/증빙 링크 포함)로 유지한다.
- Trip/TR은 Activity를 ref(참조)만 한다. Trip/TR에 "현재 상태/현재 위치/진척률"을 저장하지 말고 UI에서 파생 계산한다.

### 1.2 Plan 변경 원칙

- 모든 Plan 변경은 `Preview → Apply` 2단계로 분리한다.
- Apply는 "승인(권한/플래그)" 없이는 금지한다(Approval(Read-only) 모드에서는 Apply 불가).

### 1.3 Freeze/Lock/Pin

- `actual.start` 또는 `actual.end`가 존재하면 해당 시각은 Freeze(리플로우로 이동 금지).
- `lock_level=HARD` 또는 `reflow_pins.strength=HARD`는 자동 조정 금지(충돌로 남기고 수동 해결).

### 1.4 모드 분리 (필수)

- **Live:** 운영 입력(Actual/상태/증빙) 가능(권한 기반). *(Execution)*
- **History:** As-of 재현(읽기 전용). 과거를 리플로우로 변경하지 않는다. *(Governance/Audit)*
- **Approval:** Read-only. 승인 스냅샷 + 필수 증빙 충족 여부만 확인(Export/Sign-off만). *(Governance)*
- **Compare:** 기준은 option_c(SSOT)만. A/B는 delta overlay로만 표시/저장. *(Planning/What-if)*

### 1.5 보안/배포 위생 (P0)

- `.env*` / `.env.vercel.*` / `env.vercel.*` 파일은 **레포 커밋 금지**(예제는 `.env.vercel.example` 같은 샘플만 허용).
- Vercel 환경변수는 **Vercel Dashboard 또는 Vercel CLI**를 통해서만 관리한다(예: `vercel env pull .env.local`).
- prod env/secret 파일이 git 추적 중이거나(또는 유출 의심) 비밀정보가 포함됐을 가능성이 있으면 **즉시 중단 + Ask first**(키 로테이션/히스토리 정리 포함).

---

## 2) 개발 워크플로우 (에이전트 표준 루틴)

### 1) 먼저 읽기 (SSOT/엔진/컴포넌트)

- `option_c.json`(또는 SSOT API 응답)과 스키마/enum을 확인한다.
- 일정 엔진(리플로우/충돌 탐지) 관련 코드 위치를 파악한다.

### 2) 변경 계획 (Plan)

- 변경 목적, 영향 파일, 영향 컴포넌트, 테스트 계획을 PR 설명에 요약한다.
- 파괴적 변경(스키마/enum/상태머신)은 반드시 "Ask first".

### 3) 구현 (Implement)

- 파생 값은 derived(calc)로 계산하되 SSOT로 승격하지 않는다(필요 시 캐시 가능, 권위는 SSOT 아님).

### 4) 검증 (Verify)

- **최소 1개 이상:** reflow 결정론 테스트(동일 입력→동일 출력).
- **최소 1개 이상:** cycle 탐지 테스트(발견 시 중단 + collision 생성).
- **최소 1개 이상:** evidence gate 테스트(READY→IN_PROGRESS / COMPLETED→VERIFIED).
- 배포/보안 관련 변경(.env, Vercel, 배포 설정)을 건드렸다면: **git 추적 여부 + secret 노출 여부**를 추가 확인한다.

---

## 3) Commands (정확 명령 우선, 불명확 시 자동 탐지)

> 레포마다 스크립트가 다를 수 있으므로, 항상 `package.json`/`Makefile`을 확인해 "존재하는 스크립트"만 실행한다.

### 3.1 스크립트 탐지 (우선 실행)

- **Node 스크립트 목록 확인:**
  - `node -e "console.log(require('./package.json').scripts)"`
- **패키지 매니저 선택:**
  - `pnpm-lock.yaml` 있으면 pnpm, 없으면 npm 사용.

### 3.2 자주 쓰는 표준 명령 (존재할 때만)

- **Install:** `pnpm install` 또는 `npm install`
- **Dev:** `pnpm dev` 또는 `npm run dev`
- **Build:** `pnpm build` 또는 `npm run build`
- **Typecheck:** `pnpm typecheck` 또는 `npm run typecheck`
- **Lint:** `pnpm lint` 또는 `npm run lint`
- **Test:** `pnpm test` 또는 `npm test`

### 3.3 보안/배포 관련 (도구가 있을 때만)

- **Vercel env pull (로컬 실행용):**
  - `vercel env pull .env.local`
- **prod env 파일 추적 제거 (필요 시):**
  - `git rm --cached .env.vercel.production`

---

## 4) 도메인 계약 (SSOT / 상태머신 / Reflow / Collision)

### 4.1 Activity.state (권장 enum)

- `DRAFT | PLANNED | COMMITTED | READY | IN_PROGRESS | PAUSED | BLOCKED | COMPLETED | VERIFIED | CANCELLED | ABORTED(선택)`

### 4.2 Reflow (결정론적)

- **입력:** dependencies(DAG), constraints(time windows), resources(calendar), lock/pin, date cursor.
- **절차 (요약):**
  1. DAG cycle 검사 → 발견 시 중단 + `collision.kind=dependency_cycle`
  2. Topological sort(결정적 tie-break: lock_level→priority→planned_start→activity_id)
  3. Forward pass: dep 제약 반영 → constraint snap → resource 교집합 슬롯 배치
  4. Collision 탐지/분류 → suggested_actions 생성(자동 적용은 정책에 따름)
  5. Preview 출력(plan diff + collisions + impact 요약) → 승인 시 Apply

### 4.3 Collision (2-click 원인 도달)

- Collision은 항상 다음을 포함해야 한다:
  - `kind`, `severity`, `root_cause_code`, `activity_ids`, `resource_ids`, `time_range`, `suggested_actions[]`
- CRITICAL(안전/규정/물리제약: PTW/CERT/중량/윈도우) 충돌은 자동 해결 금지.

### 4.4 Evidence/History/Approval 로그

- **History는 append-only**(삭제 금지, 정정은 별도 이벤트로).
- Evidence는 required_types/min_count 기반으로 "누락 자동 계산"을 유지한다.
- **Evidence 누락 시 다음 전이 차단:**
  - READY→IN_PROGRESS (before_start)
  - COMPLETED→VERIFIED (mandatory)
- **거버넌스 로그(History/Evidence/Approval)는 append-only 저장을 기본으로 설계**한다.
  - 데모/개발 편의로 localStorage를 쓰더라도, "권위"는 SSOT/append-only 로그에 있고 localStorage는 캐시/임시 저장으로 취급한다.

---

## 5) UI 레이아웃 불변조건 (Where/When/What/Evidence)

- **Global Control Bar:** Trip/TR 선택, Date Cursor, View Mode(Live/History/Approval/Compare), Risk Overlay 토글.
- **3열 레이아웃 (권장):**
  - **좌:** Map(Where)
  - **중:** Timeline/Gantt(When/What)
  - **우:** Detail(상태/리스크/Why)
  - **하단/탭:** History/Evidence(Evidence)
- **상호 하이라이트:**
  - Map 선택 → Timeline 해당 activity 자동 스크롤/하이라이트
  - Timeline 선택 → Map 지오펜스/구간 하이라이트
- **"Why 2-click":**
  - (1) 배지 클릭 → (2) Why 패널 → Evidence/History 링크로 점프
- **핵심 위젯(특히 Gantt/Map)은 무중단(fail-soft)이 기본이다:**
  - dynamic import/지연 로딩 가능
  - ErrorBoundary + fallback(간단 리스트/표) + skeleton 로딩 제공

### 5.1 데이터 소스 (Data sources)

- **타임라인/ops (Gantt, conflicts, slack, Apply, What-If):** `scheduleActivities` → 페이지 `activities` state. 빌드 시점에 `option_c*.json`에서 `ScheduleActivity[]`로 변환(`lib/data/schedule-data.ts`). 클라이언트에서 편집(Apply/Undo/What-If) 가능.
- **맵 / StoryHeader / Readiness:** `/api/ssot` 응답(OptionC entities). Where/Evidence/상태 표시용. 페이지에서 1회 fetch 후 MapPanelWrapper에 props로 전달(중복 fetch 방지).
- **정책:** 동일한 option_c*.json이 정적(schedule-data)과 API(/api/ssot) 두 경로로 사용됨. 타임라인은 “편집 가능한 스케줄 배열”, 맵/헤더는 “엔티티 기반 읽기”로 역할 분리. 향후 entities.activities 단일화 시 설계 변경 필요.

---

## 6) 안전/권한 (Safety & Permissions)

### Allowed without prompt

- 파일 읽기/검색, 단일 테스트/단일 린트/타입체크, Preview(reflow preview), 문서/주석 수정.

### Ask first (승인 필요)

- 패키지 추가/업그레이드, 대규모 리팩터링, 파일 삭제/이동, 스키마/enum 변경,
- Apply(reflow apply)로 SSOT plan을 실제 변경, auth/권한/배포 설정 변경.
- 키 로테이션/시크릿 폐기/히스토리 rewrite 등 "보안 사고 대응" 성격의 작업.

---

## 7) PR 체크리스트 (최소)

- [ ] SSOT 불변조건 위반 없음(Activity=SSOT, Trip/TR=ref, 파생=derived)
- [ ] Reflow 결정론 테스트 추가/유지(동일 입력→동일 출력)
- [ ] Cycle 탐지 실패 시 중단 동작 확인
- [ ] Evidence gate 전이 차단 확인
- [ ] Live/History/Approval 모드 권한 분리 유지
- [ ] Preview→Apply 분리 유지(Approval에서는 Apply 불가)
- [ ] env/secret 파일이 git에 추적되지 않음(배포/보안 변경 시 필수)

---

## 8) Do / Don't

### Do

- 파생(calc/collisions/slack)은 "읽기모델"로 계산하고, 근거(evidence/history) 링크를 항상 유지.
- 충돌 해결은 Wait/Priority/Swap 플레이북으로 제안하되, CRITICAL은 수동+승인으로.
- 변경 적용 전에는 "왜(Why) / 영향(Impact) / 증빙(Evidence)"이 2-click 내로 이어지게 유지한다.

### Don't

- Trip/TR에 현재 상태/현재 위치/진척률을 SSOT처럼 저장하지 말 것(반드시 Activity에서 계산).
- Actual이 있는 Activity의 start/end를 리플로우로 이동하지 말 것.
- Approval(Read-only)에서 plan 변경을 허용하지 말 것.
- env/secret 파일을 레포에 커밋하지 말 것(예제만 허용).

---

## Refs

- [patch.md](patch.md)
- [docs/LAYOUT.md](docs/LAYOUT.md)
- [option_c.json](option_c.json)
- [docs/ops/release-split.md](docs/ops/release-split.md), [docs/ops/release-history-20260211.md](docs/ops/release-history-20260211.md) — 배포 분리(General vs Mobile)
- [docs/WORK_LOG_20260202.md](docs/WORK_LOG_20260202.md), [docs/BUGFIX_APPLIED_20260202.md](docs/BUGFIX_APPLIED_20260202.md) — 최신 작업 반영
