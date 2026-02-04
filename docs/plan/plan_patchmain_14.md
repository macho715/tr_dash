# TR Dashboard Plan — patchmain.md 14-item 수정 (Tidy First)

**생성일**: 2026-02-04  
**참조**: [patchmain.md](../../patchmain.md), AGENTS.md, option_c.json

---

## 0) 목적 및 범위

- **목적**: patchmain.md에 정리된 P0~P2 개선 14건을 Tidy First(구조 → 행위) 순서로 적용.
- **SSOT**: option_c.json 유지. Plan 변경은 Preview→Apply 분리 유지.
- **산출물**: structural 커밋 2~3개, behavioral 커밋 3~5개, 검증 체크리스트 통과.

---

## 1) 적용 순서 (Tidy First)

### Phase A — Structural (행위 불변)

| # | Task | 파일 | 수정 요약 | AC |
|---|------|------|-----------|-----|
| **1** | ops 초기화 단일화 | `app/page.tsx` | `useState(() => createDefaultOpsState(...))` **한 번만** 호출되도록 확인/정리. 중복 initializer 제거. | `pnpm build` 통과, Ops 1회만 생성 |
| **2** | 섹션 ID/스크롤스파이/네비 일원화 | `app/page.tsx` | 스크롤스파이용 `ids`와 `sections`(SectionNav) **동일 집합·순서**. 중복 id/엔트리 제거, count는 실제 데이터(voyages.length 등) 연결. | 네비 클릭 → 해당 섹션 스크롤, activeSection 안정 |
| **3** | 레이아웃 트리 정리 | `app/page.tsx` | Shell → Main Sections 단일 트리. DashboardHeader/OverviewSection 등 **중복 렌더 제거**, 섹션은 children으로 1회씩만. | 헤더 1회, 섹션 1회씩 노출 |
| **4** | sections useMemo deps 정합성 | `app/page.tsx` | `sections`가 참조하는 값(voyages.length, scheduleActivities.length, conflicts 등)을 deps에 반영. 카운트 의미 명확화. | voyage/로그 수 상태 변경 시 즉시 갱신 |
| **10** | Voyage 선택/하이라이트/접힘 단일 소스 | `components/dashboard/voyage-cards.tsx` + 상위 | `selectedVoyageId`, `expandedVoyageIds`를 페이지/컨텍스트에서 관리, 하위는 dumb view. 날짜 하이라이트는 유틸 통일. | 카드 접힘/선택이 스케줄·타임라인과 동기화 |
| **13** | 파이프라인 요약 순수 함수화 | `lib/ops/agi-schedule/` + 유틸 | pipeline 요약을 **입력→출력** 순수 함수로, 입력 비어도 안전한 결과. UI는 unknown/stale/ok/warn 상태 머신. | ops 비어도 화면 깨지지 않음, 애매하면 "unknown" |

### Phase B — Behavioral (행위 변경)

| # | Task | 파일 | 수정 요약 | AC |
|---|------|------|-----------|-----|
| **5** | Day Number 표시 정수화 | `components/dashboard/alerts.tsx` | Day Number를 `dayNumber.toFixed(2)` 사용하지 않음. 정수 또는 "Day 1" 형식. | "1.00" 형태 미표시 |
| **6** | KPI 배열 중복 제거 + Day 정수 | `components/dashboard/kpi-cards.tsx` | displayKpiData 중복 entry 제거. Day Number는 정수 표준(String(dayNumber) 등). | KPI 개수/구성 고정, Day 일관 |
| **7** | Day Number 계산 “달력 일수” 고정 | `lib/contexts/date-context.tsx` | dayNumber는 startOfDay 기준(SSOT timezone 고정). 필요 시 dayProgress 별도 KPI. | 동일 날짜 선택 시 Day Number 동일 |
| **8** | Gantt 기간 표시 UTC/로컬 통일 | `components/dashboard/gantt-chart.tsx` (및 vis 매퍼) | toISOString().slice(0,10) 대신 SSOT 날짜 유틸(예: formatDateYYYYMMDD, tz 명시). 프로젝트 start/end 동일 규칙. | Gantt 범위가 브라우저 tz에 따라 안 밀림 |
| **9** | Schedule “0 of 7 visible” 디폴트 개선 | `components/dashboard/schedule-table.tsx` (및 필터 소스) | 필터 기본값으로 **전체 표시** 또는 selectedDate가 최소 1개 voyage와 매칭되도록. 0건일 때 안내 문구 + Reset CTA. | 최초 진입 시 최소 1행 이상 또는 전체, 0건 시 명확 CTA |
| **11** | SectionNav 접근성 + ScrollSpy | `components/dashboard/section-nav.tsx` + page 스크롤 | aria-current="page", aria-label. 키보드 ↑↓ Enter. ScrollSpy offset(헤더 높이 등) 상수화. | 키보드만 섹션 이동, active 안정 |
| **12** | Sticky/반응형/LCP 시프트 억제 | sticky 사용 컴포넌트 (SectionNav, 헤더 등) | sticky 높이 고정 또는 placeholder. compact/fullscreen 시 컬럼·줄바꿈 규칙. | 스크롤 시 점프 없음, 모바일 겹침 없음 |
| **14** | Vitest 단위테스트 + CI | `lib/utils/date-highlights.ts`(또는 date-context), pipeline 유틸, `vitest.config.*` | date 경계(DST/UTC/월경계), pipeline null/empty/partial. CI에 `pnpm lint && pnpm test && pnpm build`. | PR 시 자동 검증, 핵심 유틸 회귀 방지 |

---

## 2) 파일 ↔ 항목 매핑

| patchmain # | 파일 (이 레포 기준) |
|-------------|----------------------|
| 1–4 | `app/page.tsx` |
| 5 | `components/dashboard/alerts.tsx` |
| 6 | `components/dashboard/kpi-cards.tsx` |
| 7 | `lib/contexts/date-context.tsx` |
| 8 | `components/dashboard/gantt-chart.tsx`, `components/gantt/VisTimelineGantt.tsx`, `lib/gantt/visTimelineMapper.ts` |
| 9 | `components/dashboard/schedule-table.tsx`, 초기 selectedDate/필터 로직 |
| 10 | `components/dashboard/voyage-cards.tsx`, `app/page.tsx` (state 끌어올리기) |
| 11 | `components/dashboard/section-nav.tsx`, `app/page.tsx` (scroll handler) |
| 12 | `components/dashboard/section-nav.tsx`, `components/dashboard/header.tsx` 등 sticky 영역 |
| 13 | `lib/ops/agi-schedule/pipeline-check.ts`, `lib/ops/agi-schedule/pipeline-runner.ts`, UI 표시 컴포넌트 |
| 14 | `lib/utils/*` (date/pipeline 관련), `vitest.config.ts`, GitHub Actions |

---

## 3) 커밋 규칙 (Tidy First)

### Structural 커밋 (먼저)

- `structural(dashboard): clean page composition & remove duplicates` (Task 1–3)
- `structural(dashboard): normalize section ids & nav contract` (Task 2, 4)
- `structural(utils): harden pipeline/date utilities signatures` (Task 13, 14 중 유틸/테스트 추가)

### Behavioral 커밋 (이후)

- `behavioral(dashboard): fix day number semantics (integer day index)` (Task 5, 6, 7)
- `behavioral(dashboard): schedule table default visibility (no 0/7 on load)` (Task 9)
- `behavioral(dashboard): gantt date display timezone consistency` (Task 8)
- `behavioral(dashboard): section nav a11y and sticky layout` (Task 11, 12)
- `behavioral(ci): add vitest + actions pipeline` (Task 14)

---

## 4) 검증 체크리스트

- **로컬**
  - `pnpm install`
  - `pnpm dev` — Timeline → Voyages → Schedule → Weather → Notice → Logs 플로우
  - `pnpm build` — 컴파일/타입 에러 0
- **UI**
  - Day Number 정수 표기
  - Schedule 최초 진입 시 최소 1행 이상 또는 전체 표시 (“0 of 7 visible” 방지)
  - 네비 클릭 시 해당 섹션으로 스크롤, activeSection 일치
- **테스트/CI**
  - Vitest 최소 2~3개 유틸 테스트 (date, pipeline)
  - Actions: `lint` + `test` + `build` 연결

---

## 5) SSOT/AGENTS.md 준수

- Activity = SSOT. Trip/TR은 참조만.
- Plan 변경: Preview → Apply 분리. Approval 모드에서 Apply 불가.
- Reflow/Freeze/Collision 규칙 변경 없음.
- 커맨드는 `scripts/detect_project_commands.py`로 탐지, 추정 금지.
- option_c.json 변경 시 `scripts/validate_optionc.py` 실행.

---

## 6) 참조

- [patchmain.md](../../patchmain.md) — 전체 14항목 상세(패치 예시, AC)
- [tr-dashboard-plan.md](./tr-dashboard-plan.md) — Gantt/vis-timeline 통합 계획
- [AGENTS.md](../../AGENTS.md) — SSOT, 모드, Reflow, Collision
