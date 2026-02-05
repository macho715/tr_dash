 아래는 현재 **HVDC TR Transport Dashboard**(실시간 물류·일정·리스크·증빙을 한 화면에서 다루는 대시보드)의 **정보 구조/상호작용/가독성/접근성/운영 워크플로우**를 기준으로, “배포 가능한 품질”까지 끌어올리는 개선안입니다.
근거는 **(1) 배포본 UI 텍스트**와 **(2) 레포 README에 명시된 기능·컴포넌트 구조**를 기반으로 정리했습니다. ([TR Dashboard][1])

---

## 1) Problem Statement + Objectives + Risks + Assumptions

### Problem Statement

현재 대시보드는 **KPI/Alerts/Voyages/Schedule/Gantt + Reflow(재계산) + Compare + History/Evidence + Export**까지 기능 범위가 넓어, 한 화면에 많은 맥락이 동시에 노출됩니다. ([GitHub][2])
결과적으로 운영자가 “지금 결정을 내려야 하는 것(Go/No-Go, 변경 승인, 다음 액션)”을 **빠르게 파악→근거 확인→조치 실행→기록(증빙)** 하는 핵심 루프가 길어질 가능성이 큽니다. ([TR Dashboard][1])

### Objectives (KPI 중심)

대시보드 개선의 목표는 “예쁜 UI”가 아니라 **결정 시간·오류·회복**을 줄이는 것입니다.

* **Time-to-Decision**: “오늘(Selected Date) 기준 Go/No-Go 및 다음 액션 결정”까지 걸리는 시간 단축
* **Task Success Rate**: “Trip/TR 선택 → 일정 확인 → 변경(Preview) → Apply/Approval → Evidence 기록” 성공률 향상
* **Error Rate**: 잘못된 날짜/Trip/TR/모드에서 변경 적용, 증빙 누락, 비교 기준 혼동을 감소
* **Recovery Success**: 충돌/제약 위반/잠금 위반 등 실패 시, 사용자가 스스로 복구(Undo/Redo/취소/롤백) 가능한 비율 향상 ([GitHub][2])

(운영 품질 지표)

* **A11y Blockers(건)**: 키보드/포커스/타깃 크기/드래그 대체 등 AA 차단 이슈 0건 목표 ([W3C][3])
* **p95 Interaction Latency(ms)**: Gantt(139 activities)·Schedule Table 스크롤/필터링/선택 반응성 개선 ([GitHub][2])

### Risks

* **인지 부하**: 상단(가이드+Overview+Run+탭+KPI+Alerts)이 길어 “핵심 결정 카드”가 묻힘 ([TR Dashboard][1])
* **라벨 불일치/언어 혼재**: README에서는 WHERE/WHEN/WHAT/EVIDENCE 가이드 제거 후 라벨 변경을 언급하지만, 배포본에는 WHERE/WHEN/WHAT/EVIDENCE 가이드 텍스트가 보임 → UI 신뢰 저하 ([GitHub][2])
* **UTC 기준 날짜의 오해**: Gantt는 UTC day index로 정렬/계산하는데, 화면에서 UTC가 충분히 노출되지 않으면 “하루 밀림” 오해 가능 ([GitHub][2])
* **변경 적용의 안전장치 부족**: Reflow/Apply는 강력한 조치이므로 “실행 전 요약→승인→결과→롤백” 계약이 UI에 명확히 드러나야 함 ([GitHub][2])

### Assumptions

* 사용자들은 현장/운영/기획이 혼재되어 있으며, **짧은 시간에 상태 판단 + 근거 확보**가 중요
* 네트워크/데이터 갱신이 항상 안정적이지 않음(README에도 API 실패 시 fallback 언급) ([GitHub][2])
* 데스크탑 중심이지만, 최소한 **키보드·스크린리더·터치 타깃** 요구는 충족해야 함 ([W3C][3])

---

## 2) Personas (2–3) + Validation Qs

### Persona A — Shift Lead(운영 리더)

* 목표: 오늘/48h 내 **리스크와 크리티컬 태스크**를 보고 Go/No-Go 및 우선순위 지시
* 검증 질문:

  * “오늘 날짜 기준 핵심 의사결정 카드(Go/No-Go, Next decision window)를 30초 내 찾는가?”
  * “결정 근거(Weather/Tide/Permit/Resource/Evidence)를 2클릭 이내로 확인하는가?”

### Persona B — Scheduler(일정 담당)

* 목표: 지연/변경 발생 시 **Reflow→Preview→Conflict 확인→Apply(또는 Compare/Approval)** 까지 안전하게 수행
* 검증 질문:

  * “변경 영향(몇 개 작업/어느 Voyage/마일스톤 영향)을 Apply 전에 명확히 이해하는가?”
  * “충돌이 있으면 ‘왜 막혔는지’와 ‘해결 옵션’을 UI가 제공하는가?”

### Persona C — QA/Compliance(증빙·감사)

* 목표: 변경/결정의 **History/Evidence가 누락 없이 남고**, Export가 일관됨
* 검증 질문:

  * “어떤 결정이 어떤 근거로 내려졌는지(링크/텍스트/타임스탬프) 재현 가능한가?”
  * “Export(MD/JSON)가 비교/승인 상태를 포함하는가?” ([GitHub][2])

---

## 3) Journey Map(s) + Emotional beats

### Journey 1: Daily Shift Brief → Go/No-Go

1. 대시보드 오픈 → Selected Date 확인
2. Alerts triage에서 Weather/Marine 중심 이슈 확인
3. Go/No-Go 카드 확인(Decision/코드/업데이트 시각)
4. 해당 Voyage/TR의 다음 마일스톤(Load-out/Sail-away 등)과 근거 데이터(Weather/Tide) 연결 확인
5. 결정 기록(Evidence) 남김

**Emotional beats**

* 초반: “정보가 너무 많아 어디부터 봐야 하지?” (불안) ([TR Dashboard][1])
* 중반: “근거가 한 군데에 모여 있나?” (확신/불신)
* 후반: “결정·근거·기록이 일관되게 남았나?” (안도)

### Journey 2: 일정 변경(Reflow) → Preview → Apply/Approval

* 사용자는 Gantt에서 활동 선택 → 날짜 변경 → reflowSchedule → Preview에서 영향/충돌 확인 → Apply 또는 Compare/Approval로 진행 ([GitHub][2])

**Emotional beats**

* Apply 직전: “이거 적용하면 어디까지 밀리지?” (리스크 민감)
* 충돌 발생 시: “내가 뭘 해야 풀리지?” (회복 가능성)

---

## 4) Flows + Recovery paths + Metrics

아래는 “핵심 플로우”를 명시하고, 각 플로우마다 회복 경로(실패/충돌/오입력)와 측정 이벤트를 붙입니다.

### Flow A: 상태 파악(Overview) → 결정(Go/No-Go)

* **Happy path**

  1. Selected Date 설정 → 자동으로 “오늘의 Active Voyage window”가 선택됨
  2. Alerts 요약(Severity top 3) → Go/No-Go 카드 → 근거(Weather/Tide/Permit) 탭
* **Recovery**

  * Selected Date가 항차 범위 밖이면, “가장 가까운 Voyage 시작일로 Jump” 버튼 제공 ([TR Dashboard][1])
* **Metrics**

  * `decision_card_viewed`, `go_nogo_opened`, `evidence_opened`, `decision_logged`

### Flow B: Trip/TR 선택 → 지도/테이블/Gantt 동기화

* **Happy path**

  1. GlobalControlBar에서 Trip/TR 선택
  2. Map highlight + Schedule table filter + Gantt scrollToActivity 동기화
* **Recovery**

  * 선택 해제/초기화: “Clear selection” + “Reset to Today”
* **Metrics**

  * `select_trip`, `select_tr`, `sync_success`, `jump_to_schedule`

### Flow C: 날짜 변경 → Reflow Preview → Apply/Approval → Undo/Redo

* **Happy path**

  1. Gantt 활동에서 날짜 변경 → Preview 패널에서 영향/충돌 확인 → Apply
  2. Approval 모드라면 “승인 요청”으로 전환(Apply 대신) ([GitHub][2])
* **Recovery**

  * 충돌(locks/constraints/cycle) 시: “원인/해결 옵션(예: unlock 요청, constraint 완화, 대체 날짜)” 제공 ([GitHub][2])
  * Undo/Redo 및 Reset 제공(이미 단축키 힌트가 있으므로 UI에도 노출) ([TR Dashboard][1])
* **Metrics**

  * `open_date_dialog`, `run_reflow`, `preview_viewed`, `apply_clicked`, `apply_succeeded|failed`, `undo`, `redo`

---

## 5) IA + Label strategy

### 목표 IA

현재 섹션(Overview/KPI/Alerts/Voyages/Schedule/Gantt)이 존재하므로, **“결정→근거→조치→기록”** 기준으로 상위 IA를 재정렬합니다. ([TR Dashboard][1])

* **Shift Brief** (결정 중심)

  * Go/No-Go, Today pulse, next decision window, top risks
* **Plan** (일정 중심)

  * Schedule table, Gantt, Reflow/Preview/Compare
* **Execute** (현장 실행 중심)

  * Voyage cards, Map, Detail
* **Evidence** (감사/증빙)

  * History/Evidence, Approval log, Export

### Label 전략(혼재 제거)

* 한/영 혼재는 유지하더라도 “규칙”을 고정:

  * 사용자 행동 버튼은 한 가지 언어로 통일(예: 한국어)
  * 데이터 라벨(Load-out/Sail-away 등)은 업계 용어(영문) 유지 가능
* README에서 “WHERE/WHEN/WHAT/EVIDENCE 가이드 문구 제거”를 언급하므로, 배포본 상단 가이드도 **최소화/접기**로 정리 권장 ([GitHub][2])

---

## 6) UI Direction + Component Specs + Accessibility Notes

아래는 **레포에 이미 정의된 컴포넌트 구조**를 그대로 활용하면서, “핵심 루프”를 강화하는 설계안입니다. (파일 경로는 README에 명시된 것을 기준) ([GitHub][2])

### UI Direction

* **Progressive disclosure**: “결정에 필요한 것”을 상단에 고정, 디테일은 하단/패널로 단계적 노출
* **Single selection model**: Trip/TR/Activity 선택 상태가 Map·Schedule·Gantt·Detail에 동일하게 반영
* **Agentic(실행형) UX 계약**: Reflow/Apply/Approval은 반드시 “실행 전 요약→승인/취소→결과→Undo/Redo”를 1세트로 제공 ([GitHub][2])

### Component-level 개선안 (현 구조 기준)

#### A) `components/control-bar/GlobalControlBar.tsx`

현재 상단에 Trip/TR/Selected Date/모드(Live History Approval Compare)/Risk 필터가 존재합니다. ([TR Dashboard][1])
개선:

* **Context Chip Row** 추가

  * `Trip: V1`, `TR: Unit 1`, `Date: 2026-01-26 (UTC)`, `Mode: Live`, `Risk: Weather+Permit`
* **Date 표시 정규화**: “Selected Date: Jan 26, 2026” → “Selected Date (UTC): 2026-01-26” (ISO 고정)

  * Gantt 기준이 UTC임을 상단에서 항상 보이게(오해 방지) ([GitHub][2])
* **Risk 필터**: None/All과 카테고리(Weather/Resource/Permit)를 한 그룹에서 혼합하면 오해가 큼

  * “All/None”는 별도 토글, 카테고리는 멀티 셀렉트 칩으로 분리

#### B) `components/dashboard/StoryHeader.tsx` + `header.tsx`

현재 상단에 가이드(WHERE/WHEN/WHAT/EVIDENCE)와 Operation Overview가 연속 노출됩니다. ([TR Dashboard][1])
개선:

* **Shift Brief Card(상단 고정)**:

  * Go/No-Go(결론) + 근거 요약(Weather codes, tide risk) + “Last updated”
* 가이드 문구는 **초기 1회만** 노출하거나 “?” 도움말로 접기
* “Confirmed / Completion date / Next decision window”를 한 줄로 정리(스캔 최적화) ([TR Dashboard][1])

#### C) `components/dashboard/section-nav.tsx`

개선:

* 섹션 탭을 “개념 그룹(Shift Brief / Plan / Execute / Evidence)”로 재배열
* 각 탭에 **카운트(Alerts 1, Voyages 7, Schedule 139)** 유지하되 “우선순위” 기반으로 정렬 ([TR Dashboard][1])

#### D) `components/dashboard/alerts.tsx`

현재 “Alerts Triage”가 존재합니다. ([TR Dashboard][1])
개선:

* Alert 카드에 다음 필드를 표준화:

  * Severity, Owner(또는 Team), Affected Voyage/TR, Due time, Recommended action, Evidence links
* “Sea Transit Go/No-Go”는 Alerts의 최상위(Decision) 카드로 승격

  * Decision(결론)과 Evidence(근거) 링크를 같은 카드에 배치 ([TR Dashboard][1])

#### E) `components/map/MapPanel*` + `components/detail/DetailPanel*`

개선:

* Map 클릭이 어려운 환경(키보드/스크린리더)을 위해

  * **Map 옆에 동일 데이터의 리스트( Voyages 목록 )** 제공 → 리스트 선택 시 지도 highlight
* Detail 패널은 “빈 상태”를 개선:

  * Selected Date 기준으로 “가장 임박한 활동 3개” 자동 추천(= 빠른 진입점) ([TR Dashboard][1])

#### F) `components/dashboard/schedule-table.tsx`

현재 상세 스케줄 테이블이 길게 표시됩니다. ([TR Dashboard][1])
개선:

* Sticky header + 좌측 Sticky column( Voyage/TR )
* “Selected date is outside all voyage windows…” 같은 상태 메시지에 **원클릭 액션** 제공:

  * “Jump to Voyage 1 window” / “Show only nearest voyage” ([TR Dashboard][1])

#### G) `components/dashboard/gantt-chart.tsx` + `timeline-controls.tsx`

README 기준으로 Gantt는 139개 활동을 렌더링하고, hover tooltip/클릭 dialog/scrollToActivity 등을 이미 보유합니다. ([GitHub][2])
개선:

* **가시 범위 최적화**: (1) 그룹 collapse/expand (level1/level2) (2) 검색 필터(“A1002”) (3) 상태 필터(Delay/Lock/Constraint)
* **“Selected Date(UTC)” 수직선 + “Today(LT)” 수직선**을 동시에 표시(혼동 감소)
* **Compare overlay**는 기본적으로 “요약(diff count)”만 노출하고, 필요 시 ghost bar 확장

#### H) `components/dashboard/ReflowPreviewPanel.tsx`

Preview 패널은 “변경 전/후, 충돌, Apply/Cancel”을 이미 다룹니다. ([GitHub][2])
개선(가장 높은 ROI):

* Apply 버튼 누르기 전에 **Impact Summary**를 표준 템플릿으로 제공:

  * Changed activities: N, Affected voyages: V1,V2, Milestone impact: (Load-out +2d) …
  * Conflicts: locks/constraints/cycles counts
* Apply 시 **필수 입력(Reason)** + (선택) Evidence link
* Apply 결과 toast는 “Undo” CTA 포함(Undo/Redo를 “파워유저 기능”이 아니라 표준 회복 경로로 승격)

#### I) `components/history/*`, `components/evidence/*`, `components/approval/*`, `components/compare/*`

README에 History/Evidence(append-only, localStorage)·Approval·Compare·Export가 명시되어 있으므로, 이 4개는 “운영 감사성” 관점에서 UI 결합도가 높아야 합니다. ([GitHub][2])
개선:

* “Approval 모드”에서는 Apply를 막고 “Request approval”로 전환(단일 규칙)
* Evidence는 “Trip 단위”뿐 아니라 **Activity 단위로도 링크 가능**하게(DetailPanel에 inline)
* Export는 “현재 모드/필터/compare snapshot/approval 상태”를 포함하는지 명시(문서 신뢰성)

### Accessibility Notes (WCAG 2.2 AA 중심)

* **2.4.11 Focus Not Obscured (Minimum)**: Sticky control bar/모달/토스트가 포커스를 가리지 않게 레이아웃·z-index·scroll padding 관리 ([W3C][4])
* **2.5.7 Dragging Movements**: Gantt에서 드래그 기반 조정이 있다면 “단일 클릭/키보드 입력” 대체 제공 ([W3C][5])
* **2.5.8 Target Size (Minimum)**: 상단 필터 칩/아이콘 버튼 최소 타깃(24×24 CSS px) 확보 ([W3C][6])
* 도움말 위치/표현은 일관되게(Consistent Help), 반복 입력 최소화(Redundant Entry)도 WCAG 2.2에서 명시됨 ([W3C][3])

---

## 7) Prototype Pipeline + Simulation Report

### Prototype Pipeline (PR 단위로 쪼개기)

README에 구조/책임 분리가 명확히 잡혀 있으므로, “구조 변경”과 “행위 변경”을 분리한 PR 전략이 적합합니다. ([GitHub][2])

**PR-1 (UI Quick Wins / Low risk)**

* GlobalControlBar: Selected Date(UTC) 표기/포맷 정규화 + Risk 필터 그룹화
* Schedule table empty state에 Jump CTA
* Shift Brief Card(기존 Operation Overview 재배치/접기)

**PR-2 (Selection Sync)**

* Trip/TR/Activity selection을 공통 상태로 올리고(컨텍스트), Map/Schedule/Gantt/Detail 동기화

**PR-3 (Reflow UX 계약 강화)**

* Preview 패널: Impact Summary + Apply Reason + Undo CTA + 실패 메시지 표준화

**PR-4 (A11y/Keyboard)**

* 포커스 순서/스킵 링크/타깃 사이즈/키보드 대체 조작 보강

### Simulation Report (재현 로그 예시)

* **Scenario**: “Selected Date가 항차 범위 밖일 때, 가장 가까운 항차로 점프 후 Go/No-Go 확인”

  1. Selected Date=2026-01-26
  2. Schedule 섹션에서 “Selected date is outside…” 확인
  3. Jump CTA 클릭 → Voyage 1 window로 이동
  4. Go/No-Go 카드 확인 → Evidence 열기

  * **Verdict**: Pass 조건 = 4단계가 30초 내 가능, 오류 없이 컨텍스트가 동기화됨 ([TR Dashboard][1])

* **Scenario**: “Gantt에서 날짜 변경 → Preview → 충돌 확인 → Cancel”

  1. Activity 선택(A10xx)
  2. 날짜 변경 Dialog 오픈
  3. Reflow 실행 → Preview에서 conflicts 확인
  4. Cancel → 원상 유지 확인

  * **Verdict**: Pass 조건 = Apply가 자동 실행되지 않고, 변경 요약이 명확히 제공됨 ([GitHub][2])

---

## 8) Validation Plan + Decision Gates

### Validation Plan

* **Usability test(30–45분, 5명)**

  * 과제 1: “오늘의 Go/No-Go 결정과 근거 2개 찾기”
  * 과제 2: “TR Unit 3의 다음 마일스톤 확인 후 증빙 링크 추가”
  * 과제 3: “Activity 하나 날짜 변경 → Preview에서 영향 요약 읽고 Cancel”
* **A11y smoke**

  * 키보드만으로 상단 컨트롤/탭/모달/Apply/Cancel 도달
  * Focus not obscured 확인 ([W3C][4])
* **Performance smoke**

  * Gantt 139 activities 스크롤/필터 p95 측정 ([GitHub][2])

### Decision Gates

* **Go**: KPI 측정 이벤트가 모두 찍히고(A), A11y blocker 0, 핵심 Flow 회귀 0
* **Revise**: Time-to-Decision 목표 미달 또는 충돌 메시지 이해도 낮음
* **Stop**: Apply가 실수로 실행되는 경로 존재(승인/취소 부재), 포커스 차단, 근거/증빙 누락 유발

---

## 9) Differentiation + Risks + Mitigation

### Differentiation (이 대시보드의 강점 강화)

이미 강점이 분명합니다:

* SSOT(Option C JSON) 기반 일정 + 의존성 reflow 엔진 + Preview/Compare/Approval/History/Evidence/Export를 한 제품에 통합 ([GitHub][2])
  개선은 “기능 추가”보다 **운영자의 결정 루프를 더 짧게** 만드는 쪽이 ROI가 큽니다.

### 주요 리스크 & Mitigation

* **라벨/언어 불일치 → 신뢰 저하**

  * Mitigation: 용어집(Glossary)·표기 규칙 고정 + 배포본/README 정합성 회귀 테스트
* **UTC 기준 혼동**

  * Mitigation: GlobalControlBar에서 UTC 고정 표기 + Tooltip로 “Gantt day index” 설명 ([GitHub][2])
* **변경 적용 사고**

  * Mitigation: Preview/Apply UX 계약(요약→승인→Undo) 강제 + Approval 모드 규칙 일관화

---

## 10) Handoff + Traceability Bundle

### Handoff 산출물(권장)

1. **IA & Flow Spec** (위 4개 Flow + Recovery + Events)
2. **Component spec**

   * 대상: `GlobalControlBar`, `StoryHeader`, `section-nav`, `alerts`, `schedule-table`, `gantt-chart`, `ReflowPreviewPanel`, `HistoryEvidencePanel`, `CompareDiffPanel`, `ApprovalModeBanner` ([GitHub][2])
3. **A11y DoD 체크리스트** (Focus not obscured, target size, dragging alternative 등) ([W3C][3])
4. **Instrumentation schema** (event name / payload / privacy)
5. **Regression scenarios** (Playwright/E2E 권장)

### Traceability Bundle (예시 템플릿)

* Decision Log

  * Date / Context / Options / Decision / Rationale / Validation
* Simulation Log

  * Scenario / Steps / Output / Verdict / Next

### 코드/운영 측면 “즉시 처리” 체크(보너스)

* README에 Vitest 실패 케이스(특정 import 경로) 언급이 있으므로, CI 게이트를 위해 우선 수습 가치가 큼 ([GitHub][2])
* 또한 README의 Hard Rules(테마/조립 패턴 유지, 추측 금지 등)와 충돌하지 않는 범위에서만 구조 변경 수행 ([GitHub][2])

---

원하면, 위 개선안 중 **P0(가장 빨리 체감되는 3개: Shift Brief 재구성 / Selected Date(UTC) 명확화 / Reflow Preview 계약 강화)**만 뽑아서, **컴포넌트 단위 구현 체크리스트**(props/state/events)까지 더 구체화해 줄 수 있습니다.

[1]: https://trdash.vercel.app/ "HVDC TR Transport Dashboard - AGI Site"
[2]: https://github.com/macho715/tr_dash "GitHub - macho715/tr_dash"
[3]: https://www.w3.org/TR/WCAG22/?utm_source=chatgpt.com "Web Content Accessibility Guidelines (WCAG) 2.2"
[4]: https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html?utm_source=chatgpt.com "Understanding SC 2.4.11: Focus Not Obscured (Minimum) ..."
[5]: https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html?utm_source=chatgpt.com "Understanding Success Criterion 2.5.7: Dragging Movements"
[6]: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html?utm_source=chatgpt.com "Understanding SC 2.5.8: Target Size (Minimum) (Level AA)"
