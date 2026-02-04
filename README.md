# HVDC TR Transport Dashboard

**Real-time logistics dashboard for HVDC TR Transport operations at Al Ghallan Island (AGI Site)**

[![Next.js](https://img.shields.io/badge/Next.js-16.0-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.1-38bdf8)](https://tailwindcss.com/)

**최종 업데이트**: 2026-02-04  
**최신 작업 반영**: [docs/plan/plan_patchmain_14.md](docs/plan/plan_patchmain_14.md) (patchmain 14-item), [docs/WORK_LOG_20260202.md](docs/WORK_LOG_20260202.md) (Phase 6 Bug #1~5,#7, Phase 7/8/10/11, 2026-02-04), [docs/BUGFIX_APPLIED_20260202.md](docs/BUGFIX_APPLIED_20260202.md), [docs/LAYOUT.md](docs/LAYOUT.md), [AGENTS.md](AGENTS.md)

---

## 📋 프로젝트 개요

HVDC TR Transport Dashboard는 **7개의 Transformer Unit**을 **LCT BUSHRA**로 운송하는 프로젝트의 실시간 물류 대시보드입니다.

**운영 규모**: 1 Trip당 1 TR 운송, 총 7 Trip, SPMT 1기 운영

### 주요 기능

- **실시간 KPI 모니터링**: 총 일수, 항차 수, SPMT 세트, TR Unit 추적
- **Gantt 차트**: 7개 항차의 시각적 일정 관리 (Jan 26 - Mar 22, 2026). **조건부 엔진**: `NEXT_PUBLIC_GANTT_ENGINE=vis` 시 vis-timeline(`VisTimelineGantt`), 미설정 시 커스텀 Gantt. Vis 사용 시 Day/Week 뷰, Selected Date 커서(UTC). **Phase 6**: Selected Date UTC(YYYY-MM-DD) 정렬 — Gantt 축과 일치. **UX**: 액티비티 클릭 시 해당 항목으로 스크롤 + Gantt 섹션 노출; 6종 액티비티 모두 막대(bar) 표시(동일일 최소 1일 길이); 액티비티 드래그로 일정 이동 가능.
- **스케줄 재계산 엔진**: 의존성 기반 자동 일정 조정
- **Preview 패널**: 변경 사항 미리보기 및 충돌 검사
- **Compare Mode**: baseline vs compare delta overlay, Gantt ghost bars. **Compare Diff 패널**: Phase 6에서 Baseline snapshot / Compare as-of 시점 UI 표시.
- **날짜 변경 UI**: Calendar + 직접 입력(YYYY-MM-DD). **Phase 6**: `dateToIsoUtc`, `toUtcNoon`으로 UTC 기준 정렬.
- **StoryHeader·2열 레이아웃**: 좌열 Map+Detail, 우열 Timeline (tr-three-column-layout). Phase 6에서 Location/Schedule/Verification, Map/Timeline 라벨 사용 (WHERE/WHEN/WHAT/EVIDENCE 가이드 문구 제거).
- **Global Control Bar**: Trip/TR 선택, **View 버튼**(클릭 시 Detailed Voyage Schedule 스크롤), Date Cursor, View Mode. **Phase 6**: API 실패 시 voyages fallback, TR 7개 전부 노출(7 of 7 visible).
- **항차 상세 정보**: Load-out, Sail-away, Load-in, Turning, Jack-down 일정
- **History/Evidence (append-only)**: History 입력, Evidence 링크 추가, localStorage 저장
- **Trip Report Export**: MD/JSON 보고서 다운로드
- **Next Trip Readiness**: Ready/Not Ready 배지, 마일스톤/증빙/블로커 체크리스트

---

## 🚀 빠른 시작

### 사전 요구사항

- **Node.js**: 20.x 이상 (LTS 권장) - `.nvmrc` 파일로 버전 고정
- **패키지 매니저**: pnpm (권장) / npm / yarn

### 설치

```bash
# Node.js 버전 확인 (nvm 사용 시)
nvm use  # .nvmrc 파일에서 버전 자동 로드

# 패키지 매니저 확인 (자동 감지)
node tools/detect_pm_and_scripts.mjs

# 의존성 설치
pnpm install
# 또는
npm install
```

### 환경 변수 설정 (선택사항)

`.env.local`에서 다음 변수를 설정할 수 있습니다:

| 변수 | 설명 |
|------|------|
| `NEXT_PUBLIC_GANTT_ENGINE=vis` | vis-timeline(VisTimelineGantt) 사용. 미설정 시 CSS/SVG 기반 커스텀 Gantt. |
| `PORT=3001` | 개발 서버 포트 (기본 3000). |

```bash
# config/env.example을 복사하여 .env.local 생성
cp config/env.example .env.local

# Gantt 엔진·포트 예시
# NEXT_PUBLIC_GANTT_ENGINE=vis
# PORT=3001
```

### 개발 서버 실행

```bash
pnpm run dev
# 또는
npm run dev
# 다른 포트 사용 시
pnpm run dev -- -p 3001
# 또는
PORT=3001 pnpm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 열기 (포트 변경 시 예: [http://localhost:3001](http://localhost:3001))

### 빌드

```bash
pnpm run build
pnpm run start
```

---

## 🏗️ 기술 스택

### Core

- **Next.js 16.0.10** (App Router)
- **React 19.2.0**
- **TypeScript 5.x**
- **Tailwind CSS 4.1.9** (OKLCH 색상 공간)

### UI 컴포넌트

- **Radix UI** (Dialog, Calendar, Button 등)
- **Lucide React** (아이콘)
- **react-day-picker 9.8.0** (날짜 선택)

### 스타일링

- **Deep Ocean Theme** (OKLCH 기반)
- **Glass morphism** 효과
- **그라데이션** 및 **글로우** 효과

---

## 📁 프로젝트 구조

```
tr_dashboard/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # 루트 레이아웃 (메타데이터, 폰트)
│   ├── page.tsx           # 홈 페이지 (조립자)
│   └── globals.css        # Deep Ocean Theme 스타일
├── components/
│   ├── layout/
│   │   └── DashboardLayout.tsx  # GlobalControlBar + ViewModeProvider
│   ├── control-bar/
│   │   └── GlobalControlBar.tsx # Trip/TR, View, Date Cursor, View Mode
│   ├── dashboard/         # 대시보드 섹션·위젯
│   │   ├── header.tsx, StoryHeader.tsx, section-nav.tsx, footer.tsx, back-to-top.tsx
│   │   ├── kpi-cards.tsx, alerts.tsx, voyage-cards.tsx, schedule-table.tsx
│   │   ├── gantt-chart.tsx, timeline-controls.tsx
│   │   ├── WhyPanel.tsx, ReflowPreviewPanel.tsx, ReadinessPanel.tsx
│   │   ├── layouts/ (dashboard-shell, tr-three-column-layout)
│   │   └── sections/ (overview, kpi, alerts, voyages, schedule, gantt)
│   ├── detail/            # DetailPanel, CollisionTray, CollisionCard, sections/
│   ├── history/           # HistoryEvidencePanel, HistoryTab, TripCloseoutForm
│   ├── evidence/          # EvidenceTab
│   ├── compare/            # CompareDiffPanel, CompareModeBanner
│   ├── map/               # MapPanelWrapper, MapPanel, MapContent
│   ├── gantt/             # 대안 Gantt (vis-timeline 연동)
│   │   ├── VisTimelineGantt.tsx
│   │   └── ResourceConflictsPanel.tsx
│   └── approval/          # ApprovalModeBanner
├── lib/
│   ├── ssot/              # Single Source of Truth
│   │   ├── schedule.ts    # 스케줄 타입 + dateToIsoUtc, toUtcNoon
│   │   └── utils/
│   │       └── schedule-mapper.ts  # option_c.json → ScheduleActivity
│   ├── data/              # schedule-data, go-nogo-data, tide-data, weather-data
│   ├── utils/             # schedule-reflow, slack-calc, detect-resource-conflicts, reflow-engine
│   ├── contexts/          # date-context
│   ├── gantt/             # visTimelineMapper, contract (vis-timeline)
│   ├── ops/               # agi (applyShift, adapters), agi-schedule (pipeline-runner)
│   ├── compare/           # compare-loader (Phase 10)
│   ├── baseline/          # baseline-compare, freeze-policy
│   ├── store/             # trip-store (History/Evidence append-only)
│   ├── reports/           # trip-report (MD/JSON Export)
│   └── (state-machine: src/lib/state-machine/)  # 상태 전이, Evidence gates
├── data/schedule/
│   └── option_c.json      # 마스터 스케줄 (139개 활동, SSOT)
├── config/
│   ├── prettierignore
│   └── env.example
├── docs/                  # LAYOUT.md, SYSTEM_ARCHITECTURE.md, WORK_LOG_*, INDEX.md
├── tools/
│   └── detect_pm_and_scripts.mjs
└── .cursor/               # rules/, skills/, agents/
```

---

## 🎯 주요 기능 상세

### 1. 스케줄 재계산 엔진 (`lib/utils/schedule-reflow.ts`)

의존성 그래프 기반 자동 일정 조정:

- **불변성 보장**: 깊은 복사로 원본 데이터 보호
- **사이클 탐지**: DFS 기반 의존성 사이클 검사
- **UTC 날짜 연산**: 타임존 안전한 날짜 계산
- **Lock/Constraint 처리**: 잠금 작업 및 제약 조건 존중
- **SUMMARY rollup**: 요약 활동 자동 계산

**사용 예시:**

```typescript
import { reflowSchedule } from "@/lib/utils/schedule-reflow"

const result = reflowSchedule(
  scheduleActivities,
  "ACT-001",
  "2026-02-15",
  {
    respectLocks: true,
    respectConstraints: true,
    detectCycles: true,
  }
)

// result.activities: 재계산된 활동 목록
// result.impact_report: 영향받은 작업 및 충돌 정보
```

### 2. Gantt 차트 (`components/dashboard/gantt-chart.tsx`)

- **동적 데이터 렌더링**: `currentActivities` 상태로 실시간 업데이트
- **데이터 변환**: `scheduleActivitiesToGanttRows()` 함수로 ScheduleActivity[] → GanttRow[] 변환
- **시각적 일정 표시**: 7개 항차의 타임라인
- **Phase 6 Bug #1**: Selected Date UTC 정렬 — `formatShortDateUtc`, `getDatePosition(toUtcNoon(date))` 사용. 날짜 축과 커서 일치.
- **인터랙티브 활동 바**: 호버 시 Tooltip, 클릭 시 날짜 변경 Dialog
- **마일스톤 표시**: 주요 이벤트 마커
- **레전드**: 활동 타입별 색상 구분

### 3. 날짜 변경 UI

- **Tooltip 버튼**: 활동 바 호버 → "날짜 변경" 버튼
- **Dialog**: Calendar + 직접 입력 (YYYY-MM-DD)
- **Phase 6 Bug #1**: Selected Date는 UTC(YYYY-MM-DD) 기준. `lib/ssot/schedule.ts`의 `dateToIsoUtc`, `toUtcNoon` 사용. Gantt 축과 정렬. DatePicker 라벨에 (YYYY-MM-DD), tooltip "Selected date: YYYY-MM-DD (UTC day index used for Gantt)" 표시.
- **재계산 실행**: Dialog에서 직접 `reflowSchedule` 호출

### 4. Preview 패널 (`components/dashboard/ReflowPreviewPanel.tsx`)

- **연결**: Why 패널 suggested_action 클릭 → `reflowSchedule` 호출 → ReflowPreviewPanel 표시
- **변경 사항 목록**: 영향받은 작업의 이전/이후 날짜
- **충돌 경고**: 의존성 사이클, 잠금 위반, 제약 조건 위반
- **적용/취소**: Apply 클릭 시 `setActivities` 상태 업데이트, Gantt 차트 자동 리렌더링

### 5. 데이터 변환 함수 (`lib/data/schedule-data.ts`)

**`scheduleActivitiesToGanttRows()` 함수:**

- **목적**: ScheduleActivity[] → GanttRow[] 변환 (Gantt 차트 렌더링용)
- **변환 로직**:
  - level1별 그룹화 → level1 SUMMARY는 Header row로 변환 (`isHeader: true`)
  - level2별 그룹화 → level2 SUMMARY는 일반 row로 변환
  - LEAF 활동만 Activity[]로 변환 (SUMMARY 제외)
  - AnchorType → ActivityType 매핑:
    - `LOADOUT` → `loadout`
    - `SAIL_AWAY` → `transport`
    - `BERTHING` / `LOADIN` → `loadin`
    - `TURNING` → `turning`
    - `JACKDOWN` → `jackdown`
    - 기본값 → `mobilization`
- **사용 위치**: `gantt-chart.tsx`에서 `currentActivities` 상태를 GanttRow[]로 변환

**사용 예시:**

```typescript
import { scheduleActivitiesToGanttRows } from "@/lib/data/schedule-data"

const ganttRows = scheduleActivitiesToGanttRows(currentActivities)
// ganttRows: GanttRow[] (렌더링용 데이터)
```

### 6. Activity 스크롤 기능 (`components/dashboard/gantt-chart.tsx`)

- **DOM 참조 관리**: `activityRefs` Map으로 각 Activity의 DOM 요소 참조 저장
- **스크롤 함수**: `scrollToActivity(activityId)` 함수로 부드러운 스크롤
- **Activity ID 매칭**: Activity label에 ID 포함 (`A1002: Activity Name` 형식)

---

## 🔧 개발 명령어

### 패키지 매니저 자동 감지

```bash
node tools/detect_pm_and_scripts.mjs
```

### 검증

```bash
# 타입 체크
pnpm run typecheck

# 린트 (ESLint)
pnpm run lint

# 코드 포맷팅 (Prettier - 수동 실행)
npx prettier --check .

# 빌드 테스트
pnpm run build
```

### 코드 품질 도구

프로젝트에는 다음 코드 품질 도구가 설정되어 있습니다:

- **ESLint**: `eslint.config.mjs` - Next.js 16 flat config (core-web-vitals + TypeScript)
- **Prettier**: `package.json` "prettier" - 코드 포맷팅 일관성
- **TypeScript**: `tsconfig.json` - 타입 체크

### Cursor 커스텀 명령어

- `/diagnose-env`: 환경 진단 (lockfile + scripts 확인)
- `/validate`: 검증 게이트 실행 (존재하는 스크립트만)
- `/guard-theme`: 테마 보존 확인

---

## 📐 아키텍처 원칙

### SSOT (Single Source of Truth)

- **타입 정의**: `lib/ssot/schedule.ts`
- **데이터 로더**: `lib/data/schedule-data.ts`
- **중복 금지**: 동일 enum/상수를 여러 파일에 정의하지 않음

### 계산 vs 렌더 분리

- **계산 로직**: `lib/utils/*` (순수 함수)
- **UI 렌더링**: `components/*` (계산 로직 금지)

### 컴포넌트 책임 분리

- **조립자**: `app/page.tsx` (섹션 컴포넌트 import만)
- **섹션 컴포넌트**: `components/dashboard/*` (렌더링 전용)
- **유틸 함수**: `lib/utils/*` (순수 함수)

---

## 🎨 테마 및 스타일

### Deep Ocean Theme

- **색상 공간**: OKLCH
- **주요 색상**: Cyan/Teal 그라데이션
- **배경**: 어두운 그라데이션 + 그리드 오버레이
- **글래스 효과**: `bg-glass` 유틸 클래스

### 커스텀 유틸 클래스

- `.bg-glass`: 반투명 배경 + 블러
- `.shadow-glow`: 글로우 효과
- `.shadow-cyan`: Cyan 그림자
- `.shadow-voyage`: 항차 카드 그림자

---

## 📊 데이터 흐름

### 스케줄 데이터 흐름

```
data/schedule/option_c.json (139개 활동)
    ↓
lib/ssot/utils/schedule-mapper.ts (TR Unit, Anchor 타입, 자원 태그 추출)
    ↓
lib/data/schedule-data.ts (scheduleActivities)
    ↓
scheduleActivitiesToGanttRows() (ScheduleActivity[] → GanttRow[] 변환)
    ↓
gantt-chart.tsx (currentActivities 상태 → 동적 렌더링)
    ↓
사용자 클릭 → Dialog → reflowSchedule()
    ↓
Preview 패널 (변경 사항 표시)
    ↓
적용 → setCurrentActivities() → Gantt 차트 자동 리렌더링
```

---

## 🔒 보안 및 규칙

### 절대 규칙 (Hard Rules)

1. **UI 스타일 보존**: `globals.css`의 Deep Ocean Theme 변경 금지
2. **구조 보존**: `app/layout.tsx`, `app/page.tsx` 조립 패턴 유지
3. **추측 금지**: 파일/스크립트 존재 확인 전 단정 금지
4. **NDA/PII 금지**: API Key, 토큰, 계정정보, PII 기록 금지

### 커밋 규칙

- **Structural commit**: 구조 변경만 (리네이밍, 추출, 이동)
- **Behavioral commit**: 기능 추가/수정
- **분리 원칙**: 구조와 행위 변경을 동일 커밋에 포함하지 않음

---

## 📚 참고 문서

- [AGENTS.md](AGENTS.md) - **에이전트 규칙·SSOT·워크플로우** (필수)
- [docs/LAYOUT.md](docs/LAYOUT.md) - **레이아웃·컴포넌트** (2열: Map+Detail | Timeline)
- [docs/SYSTEM_ARCHITECTURE.md](docs/SYSTEM_ARCHITECTURE.md) - **시스템 아키텍처** (레이어, 데이터 흐름)
- [docs/plan/plan_patchmain_14.md](docs/plan/plan_patchmain_14.md) - **patchmain 14-item (2026-02-04)**
- [docs/WORK_LOG_20260202.md](docs/WORK_LOG_20260202.md) - **Phase 4~11 작업 이력 (2026-02-04 반영)**
- [docs/BUGFIX_APPLIED_20260202.md](docs/BUGFIX_APPLIED_20260202.md) - **Phase 6 Bugfix 상세**
- [docs/INDEX.md](docs/INDEX.md) - 문서 인덱스
- [docs/VERCEL.md](docs/VERCEL.md) - Vercel 배포
- [.cursor/rules/](.cursor/rules/) - Cursor IDE 규칙

---

## 🧪 테스트

- **Vitest**: 167 tests (state-machine, reflow, collision, baseline, evidence 등). 1 suite 실패 시: `src/lib/__tests__/history-evidence.test.ts` — `@/lib/state-machine/evidence-gate` import 경로 수정 필요 (실제: `@/src/lib/state-machine/evidence-gate`).
- **pipeline-check**: `lib/ops/agi-schedule/__tests__/pipeline-check.test.ts` — patchmain #14 (AGI 스케줄 파이프라인 검증, null/empty 안전).
- **실행**: `pnpm test -- --run` 또는 `pnpm test:run`
- **계획**: [docs/test/Test_Plan.md](docs/test/Test_Plan.md)

---

## 🚧 향후 계획

- [x] ScheduleActivity → GanttRow 변환 유틸 완성 ✅
- [x] 실제 데이터 반영 로직 (Preview 적용 시) ✅
- [ ] Undo/Redo 기능
- [ ] localStorage 저장
- [ ] DeadlineLadder 연동 (문서 마감)
- [ ] ResourceTag 충돌 탐지 고도화

---

## 📝 라이선스

Private project - Samsung C&T × Mammoet. 자세한 내용은 [LICENSE](LICENSE) 참조.

---

## 👥 기여

프로젝트 규칙은 [AGENTS.md](AGENTS.md), [CONTRIBUTING.md](CONTRIBUTING.md) 및 `.cursor/rules/`를 참고하세요.

---

**Last Updated**: 2026-02-04

---

## ⚙️ 개발 환경 설정

### 필수 설정 파일

프로젝트에는 다음 설정 파일들이 포함되어 있습니다:

- **`eslint.config.mjs`**: ESLint flat config (Next.js 16 + TypeScript 규칙)
- **`package.json` "prettier"**: Prettier 코드 포맷팅 설정
- **`config/prettierignore`**: Prettier 제외 파일 목록
- **`.nvmrc`**: Node.js 버전 고정 (20)
- **`config/env.example`**: 환경 변수 템플릿
- **`tsconfig.json`**: TypeScript 컴파일러 설정
- **`next.config.mjs`**: Next.js 빌드 설정
- **`components.json`**: shadcn/ui 설정

### IDE 설정 권장사항

**VS Code / Cursor**:
- ESLint 확장 프로그램 설치
- Prettier 확장 프로그램 설치
- 저장 시 자동 포맷팅 활성화 (선택사항)

**설정 예시** (`.vscode/settings.json`):
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

---

## 📝 최근 업데이트

### 2026-02-04: patchmain 14-item 적용

- **Structural**: ops 초기화 단일화, 섹션 ID/스크롤스파이 일원화, pipeline 요약 순수 함수화·null 안전.
- **Behavioral**: Day Number 정수 표시, Gantt `dateToIsoUtc`/UTC 통일, Schedule "0 of 7 visible" 방지, SectionNav a11y(aria-current, 키보드), Vitest pipeline-check 추가.
- **AGI `/shift` 사용 시**: `pivot=YYYY-MM-DD` 필수. pivot 날짜 기준으로 스케줄 시프트 수행.

### 2026-02-03: 문서 동기화 + README 검토 반영

- README, LAYOUT.md, SYSTEM_ARCHITECTURE.md, WORK_LOG_20260202.md 최신화
- 프로젝트 구조 정리: `layout/`, `control-bar/`, `detail/`, `history/`, `evidence/`, `compare/`, `gantt/` 반영
- Preview 패널 경로 수정: `ReflowPreviewPanel` (dashboard)
- AGENTS.md 참조 추가
- **README 검토 반영**: 데이터 흐름 경로 `lib/ssot/utils/schedule-mapper.ts` 명시, 2열 레이아웃(좌 Map+Detail | 우 Timeline) 정확화, lib 구조 보완(contexts, gantt, ops, ssot/utils), 테스트 167·실패 스위트 안내, Phase 6 Bug #7 명시

### Phase 6: Bugfix (TR_Dashboard_Bugfix_Prompt_v1.1, 2026-02-02)

#### 적용 완료
- ✅ **Bug #4**: WHERE/WHEN/WHAT/EVIDENCE 가이드 문구 제거 (StoryHeader, tr-three-column-layout)
- ✅ **Bug #2**: Trip/TR 필터 + 7 TRs visible (trips/trs fallback, selectedVoyage 동기화, schedule-table fallback)
- ✅ **Bug #1**: Selected Date UTC 정렬 (dateToIsoUtc, toUtcNoon, gantt-chart, date-picker)
- ✅ **Bug #3**: View 버튼 → Detailed Voyage Schedule 스크롤
- ✅ **Bug #5**: Compare Diff Baseline/Compare as-of 표시
- ✅ **Bug #7**: Regression/Polish (build·lint 검증)
- ⏸️ **Bug #6**: Note 영속 + 비밀번호 삭제 (별도 Phase 이관)

#### 상세 문서
- [docs/BUGFIX_APPLIED_20260202.md](./docs/BUGFIX_APPLIED_20260202.md)

---

### Phase 5: SSOT Upgrade v1.0 (patchm1~m5, 2026-02-02)

#### PR#1: Upload 제거 + BulkAnchors 숨김
- ✅ **BulkAnchors**: 기본 숨김 (`showBulkAnchors={false}`), Ops Tools에서만 노출
- ✅ **Upload 제거**: EvidenceUploadModal 삭제, Evidence는 링크/URL 입력만

#### PR#2: SSOT 타입 확장
- ✅ **Trip**: closeout, baseline_id_at_start, milestones, status
- ✅ **TripCloseout, TripReport, ProjectReport**: patchm1 §3.6, §3.7
- ✅ **BlockerCode**: PTW_MISSING, CERT_MISSING, WX_NO_WINDOW 등

#### PR#3: History/Evidence 입력 + 저장 (append-only)
- ✅ **lib/store/trip-store.ts**: localStorage 기반 History/Evidence 저장
- ✅ **HistoryTab**: Add event (note, delay, decision, risk, milestone, issue)
- ✅ **EvidenceTab**: Add link (URL/경로) — 파일 업로드 대체

#### PR#4: Compare Diff 패널
- ✅ **CompareDiffPanel**: Baseline vs Current diff 테이블. **Phase 6 Bug #5**: 상단에 "Baseline snapshot: (created_at) (immutable)", "Compare as-of: Live (current state)" 표시.
- ✅ **computeActivityDiff**: shift/add/remove/change 분류
- ✅ **HistoryEvidencePanel**: Compare Diff 탭 추가

#### PR#5: Trip Report Source + Export
- ✅ **lib/reports/trip-report.ts**: generateTripReport, tripReportToMarkdown, tripReportToJson
- ✅ **TripCloseoutForm**: Export MD/JSON 다운로드

#### PR#6: Next Trip Readiness 패널
- ✅ **ReadinessPanel**: Ready/Not Ready 배지, milestones, missing evidence, blockers

---

### Phase 4: UI Foundation (2026-02-02)

#### 신규 컴포넌트 (28개 파일)
- ✅ **Global Control Bar**: Trip/TR 선택, **View 버튼**(Phase 6 Bug #3: 클릭 시 `id="schedule"` Detailed Voyage Schedule 스크롤), Date Cursor, View Mode(Live/History/Approval/Compare), Risk Overlay. Phase 6 Bug #2: API 실패/7개 미만 시 voyages fallback, selectedVoyage 동기화, TR 7 of 7 visible.
- ✅ **DashboardLayout**: ViewModeProvider, 3-column layout orchestration
- ✅ **MapPanel**: Leaflet 기반 지도 + TR 마커 + 상호 하이라이트
- ✅ **TimelinePanel**: Gantt 차트 통합, Activity 선택
- ✅ **DetailPanel**: Activity Inspector (Header, State, Plan vs Actual, Resources, Constraints, Collision Tray)
- ✅ **WhyPanel**: 2-click Collision UX (Root cause + suggested_actions)
- ✅ **ReflowPreviewPanel**: suggested_action → reflowSchedule → Preview UI
- ✅ **HistoryEvidencePanel**: History | Evidence | Compare Diff | Trip Closeout 탭
- ✅ **EvidenceTab/HistoryTab**: Evidence 링크 추가, History append-only 입력

#### State Machine & Evidence (Phase 3)
- ✅ **State Machine**: `src/lib/state-machine/` - Activity 상태 전이 (ALLOWED_TRANSITIONS, Evidence Gates)
- ✅ **Evidence Gate**: before_start, after_end 증빙 검증
- ✅ **테스트**: 124 tests passed (state-machine, evidence-gate, reflow, collision 등)

#### 스케줄 엔진 고도화
- ✅ **Forward Pass**: 의존성 기반 일정 재계산 + Constraint snapping + Resource 교집합
- ✅ **Backward Pass**: Slack 계산 (ES/EF/LS/LF) + Critical path 식별
- ✅ **Collision Detection**: 자원 충돌, 시간 충돌, 의존성 사이클 탐지
- ✅ **Reflow Manager**: Preview → Apply 2단계 워크플로우

#### API & 데이터 통합
- ✅ **SSOT API**: `/api/ssot` route - option_c.json 제공
- ✅ **Map Status Colors**: Activity 상태별 색상 매핑
- ✅ **View Mode Store**: Zustand 기반 Live/History/Approval/Compare 상태 관리

#### 문서 & 자동화
- ✅ **WORK_LOG_20260202.md**: Phase 4-11 상세 작업 이력
- ✅ **Phase 6 Bugfix**: StoryHeader·3열 WHERE/WHEN/WHAT/EVIDENCE 가이드 문구 제거 → Location/Schedule/Verification, Map/Timeline. Date UTC 정렬, View 버튼, Trip/TR fallback, Compare Diff Baseline/Compare as-of 표시. [BUGFIX_APPLIED_20260202.md](docs/BUGFIX_APPLIED_20260202.md)

### 이전 릴리즈 (2026-01-22)
- ✅ **Activity 스크롤 기능**: Activity 클릭 시 Gantt 차트로 자동 스크롤
- ✅ **페이지 구조 개선**: `SectionNav` (sticky 네비게이션), `BackToTop` 버튼
- ✅ **실제 데이터 로딩**: `data/schedule/option_c.json`에서 139개 활동 로드
```

---

## Refs

- [AGENTS.md](AGENTS.md) — SSOT·불변조건·에이전트 규칙
- [CONTRIBUTING.md](CONTRIBUTING.md) — 기여·PR 체크리스트
- [CHANGELOG.md](CHANGELOG.md) — 변경 이력
- [LICENSE](LICENSE) — 라이선스
- [docs/LAYOUT.md](docs/LAYOUT.md) — 레이아웃·컴포넌트 (2열)
- [docs/SYSTEM_ARCHITECTURE.md](docs/SYSTEM_ARCHITECTURE.md) — 시스템 아키텍처
- [docs/specs/SRS.md](docs/specs/SRS.md) — 요구사항정의서
- [docs/api/API_Reference.md](docs/api/API_Reference.md) — API 레퍼런스
- [docs/test/Test_Plan.md](docs/test/Test_Plan.md) — 테스트 계획
- [docs/manual/User_Guide.md](docs/manual/User_Guide.md) — 사용자 매뉴얼
- [docs/plan/plan_patchmain_14.md](docs/plan/plan_patchmain_14.md) — patchmain 14-item (2026-02-04)
- [docs/WORK_LOG_20260202.md](docs/WORK_LOG_20260202.md) — Phase 4~11 작업 이력
- [docs/BUGFIX_APPLIED_20260202.md](docs/BUGFIX_APPLIED_20260202.md) — Phase 6 Bugfix
- [docs/INDEX.md](docs/INDEX.md) — 문서 인덱스
