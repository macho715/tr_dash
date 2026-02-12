# Changelog — TR Movement Dashboard

**형식**: [Keep a Changelog](https://keepachangelog.com/).  
**참조**: [docs/WORK_LOG_20260211.md](docs/WORK_LOG_20260211.md), [docs/WORK_LOG_20260202.md](docs/WORK_LOG_20260202.md), [docs/BUGFIX_APPLIED_20260202.md](docs/BUGFIX_APPLIED_20260202.md), [README.md](README.md).

---

## [Unreleased]

### Added

- **2모델 AI Dual-pass Intent Guard (2026-02-11)**:
  - 1차 모델(OLLAMA_MODEL) 파싱 후 2차 리뷰 모델(OLLAMA_REVIEW_MODEL) 검증. 엄격 intent(apply_preview, set_mode, high-risk)에서 모호 판정 시 `unclear` 전환.
  - `recommendations.what_if_shift_days` 자동 생성. `governance_checks`(CONFIRM_REQUIRED, APPLY_PREVIEW_REF, MODE_ALLOWED 등) 반환.
  - AIExplainDialog: 모델 trace, what-if 제안, governance 체크 UI 표시. route.ts, ai-intent.ts, AIExplainDialog.tsx.
- **AI LLM 타임아웃·Fallback·컨텍스트 축소 (2026-02-11)**:
  - `AI_PROVIDER_TIMEOUT_MS`(기본 9초) LLM 타임아웃.
  - 응답 깨짐/타임아웃 시 자연어 규칙 파서로 즉시 intent 반환(fast fallback).
  - `AI_MAX_ACTIVITY_CONTEXT`(기본 48) — 쿼리 관련 activity만 전송해 속도 개선.
  - provider 실패 시 503 대신 fallback 결과 반환.
- **FilterDrawer 모듈 (2026-02-11)**: `components/dashboard/FilterDrawer.tsx` — named/default export 둘 다 제공, 모바일 UX용 필터 드로어.
- **Release Split Deployment (General vs Mobile) (2026-02-11)**:
  - 단일 개발 저장소에서 일반/모바일 배포 경로 분리. `release/general→origin/main`, `release/mobile→mobile-origin/main` 가드레일.
  - `.husky/pre-push` + `scripts/release/pre-push-guard.ps1`로 `develop→main` 직접 push 및 교차 레포 push 차단.
  - `release:general`, `release:mobile`, `release:verify` (package.json). `AssertNoTrackedSecrets` 등 common.ps1 가드.
  - 모바일 배포: `trdash-mobile` Vercel 프로젝트, `https://trdash-mobile.vercel.app`. `NEXT_PUBLIC_GANTT_ENGINE=vis` 3환경 반영.
  - 문서: [docs/ops/release-split.md](docs/ops/release-split.md), [docs/ops/release-history-20260211.md](docs/ops/release-history-20260211.md).
- **Merge 정리 및 Reflow 통합 (2026-02-11)**:
  - page.tsx: Gantt/Detail 충돌 클릭 → `handleCollisionCardOpen` 통일, `detailPanelRef`·WhyPanel(`onJumpToHistory`, `onOpenWhyDetail`) 유지, #water-tide 해시 동기화(775), Compare KPI 카드 드릴다운(790), 배너 연결(834).
  - MapPanel.tsx: 맵 안정화(`mapInstanceKey` + `mapContentVisible`), Map → `onCollisionClick` 공통 핸들러 전달.
  - schedule-reflow.ts: 머지 마커 제거, `freeze_lock_violations` preview 우선 + 래퍼 fallback, actual freeze/hard lock 위반 분류 유지.
  - Reflow 권위: `src/lib/reflow/schedule-reflow-manager.ts`의 `previewScheduleReflow`/`applySchedulePreview` 단일 진입점, `collectFreezeLockViolations`(55), `impact.freeze_lock_violations` 채움(140). `lib/utils/schedule-reflow.ts` deprecated wrapper 유지. UI에서 schedule-reflow.ts 직접 호출 금지.
- **History append-only tombstone (2026-02-11)**: update-history.ts, history-deletion.ts, HistoryTab.tsx, HistoryEvidencePanel.tsx. Soft delete·Restore, append-only SSOT 유지. update-history.test.ts, history-evidence.test.ts 통과.
- **스크립트 추가 (package.json)**: `dev:webpack` (next dev), `sync:wa-events` (sync_wa_events_to_ssot.py).

- **Tide Phase 1 구현 + Phase 3 준비 (2026-02-11)**:
  - **Tide 서비스**: `lib/services/tideService.ts` — `fetchTideData`(5분 TTL 캐시), `buildTideWindows`, `validateTaskSafety`, `summarizeTideCoverage`. 규칙: UTC, 06~17, height ≥ 1.8m, 2시간 연속일 때만 SAFE. 테스트용 `__resetTideCacheForTests`.
  - **독립 Gantt 화면**: `components/gantt/TideOverlayGantt.tsx` — SAFE/DANGER/CLOSED strip, 드래그 후 재검증, DANGER 시 toast.warning, summary chip, fail-soft fallback table, debug JSON. `page.tsx` 연동.
  - **VisTimeline 연계 준비**: `lib/gantt/tide-overlay-adapter.ts` — TideWindow[] → VisItem[] (type: background), class 매핑 (tide-safe|tide-danger|tide-closed), view clipping.
  - **스타일**: `globals.css` — `.tide-safe`, `.tide-danger`, `.tide-closed`, `.task-safe`, `.task-danger`, `.task-closed` (Vis background 준비).
  - **테스트**: tideService.test.ts, TideOverlayGantt.test.tsx, tide-overlay-adapter.test.ts. vitest.config.ts에 `components/gantt/__tests__` 포함.
  - **의존성**: `gantt-task-react` 추가 (React 18 peer 경고 있으나 typecheck/테스트 통과).
- **Tide 고급 기능 — SAFE 추천·DANGER What-if (2026-02-11)**:
  - **SAFE 2h 연속 슬롯 자동 추천**: `tideService.ts` — `findNearestSafeSlot`, `TideSafeSlotSuggestion`. DANGER task 기준 시간 단위(최대 14일) 전진 탐색으로 가장 가까운 SAFE 시작 시각 추천.
  - **DANGER 드래그 시 What-if(+1/+2일) 제안**: `tideService.ts` — `buildShiftDayWhatIf`, `TideShiftWhatIf`. +1일/+2일 이동 시 결과를 SAFE/DANGER/CLOSED로 계산.
  - **UI**: TideOverlayGantt — DANGER 드래그 시 toast.warning(Nearest SAFE + What-if 요약), 가이던스 패널(Nearest SAFE, +1d/+2d status), **Apply nearest SAFE** / **Apply +1d** / **Apply +2d** 버튼으로 즉시 반영.
  - **테스트**: tideService.test.ts(nearest SAFE slot, +1/+2 day what-if), TideOverlayGantt.test.tsx(DANGER 드래그 → 경고·가이던스·what-if 표시). tsc·eslint·tide-overlay-adapter.test 통과. 4파일 +314/-7.
  - **다음 후보**: Compare KPI에 Tide risk delta.
- **VisTimeline 메인 Gantt Tide 연동 (2026-02-11)**:
  - **gantt-chart.tsx**: Tide 데이터 로드(fetchTideData + buildTideWindows, fail-soft). 드래그 시 DANGER면 가이던스 생성·toast(Nearest SAFE + What-if 요약)·가이던스 UI(`data-testid="vis-tide-guidance"`). Preview nearest SAFE / Preview +1d·+2d 버튼으로 기존 `onDragMove(activityId, YYYY-MM-DD)` 호출.
  - **gantt-chart.tide-guidance.ts**: `composeDragTideGuidance` — 드래그 태스크 + tide windows + rule → dragSafety, nearestSafe, whatIf(+1/+2d). DANGER가 아니면 null.
  - **테스트**: `gantt-chart.tide-guidance.test.ts`(DANGER 시 nearest SAFE·what-if, SAFE 시 null, SAFE 없을 때 nearestSafe=null), `tideService.test.ts` 정합성 유지. tsc·eslint 0 유지.
  - **문서**: AGENTS.md 최신 작업 반영 라인에 Tide 고급 한 줄 요약 추가.
- **Reflow 의존성 cascade Preview 경로 (2026-02-11)**:
  - **dependency-cascade.ts**: 의존성 cascade 엔진 신규 추가. `applyBulkAnchors`에 전략 인자 추가, 기본값 `dependency_cascade`로 전환(applyShift.ts).
  - **schedule-reflow-manager.ts**: canonical preview 경로를 cascade 엔진 기반으로 교체, `meta.cascade` 및 missing predecessor 진단 충돌 반영.
  - **page.tsx**: deprecated `reflowSchedule` 제거, Drag/What-if/Action 경로에서 `previewScheduleReflow` 직접 호출로 통일.
  - **테스트**: dependency-cascade.test.ts, schedule-preview-paths.test.ts, what-if-simulation.test.ts 추가/갱신. tsc·eslint 통과.
- **TideOverlayGantt 가이던스 수동 오픈 (2026-02-11)**:
  - **조건 충족(DANGER)**: 기존처럼 가이던스 패널 자동 표시.
  - **조건 미충족**: "View guidance" 버튼(`data-testid="open-tide-guidance"`) 및 task 선택 UI로 가이던스 패널 수동 표시. `guidancePinned`, `guidanceTaskId` 상태 추가. 자동/수동 소스 표시, 동일 패널 렌더 유지.
  - **테스트**: TideOverlayGantt.test.tsx — 비-DANGER 상태에서 버튼 클릭 시 패널 표시 검증 추가. 4 tests passed.
- **Tide Gantt 네비게이션 (2026-02-11)**:
  - 메인 대시보드 헤더에 **Open Tide Gantt** 버튼 추가(`components/dashboard/header.tsx`) → `/tide-gantt` 이동.
  - `/tide-gantt` 페이지 상단에 **Back to Dashboard** 버튼 추가(`app/tide-gantt/page.tsx`) → `/` 복귀. `/`↔`/tide-gantt` 왕복 이동 가능.
- **Voyage Map View · ETA Drift (2026-02-11)**:
  - **통 파생 helper**: `lib/tr/voyage-map-view.ts` — RiskBand, toRiskBand, riskColor, computeVoyageEtaDriftDays, buildVoyageRoute, isVoyageActive.
  - **Voyage 카드**: hover/select + Drift 배지 (`voyage-cards.tsx`, `voyages-section.tsx`). Map props: MapPanelWrapper, MapPanel, MapContent.
  - **Map overlay**: drift abs > 1.5 점선(MapPanel). click-selected만 flyTo, hover는 highlight only(MapContent). active destination pulse marker(MapContent).
  - **Page state**: selectedVoyageNo, hoveredVoyageNo 추가, selectedVoyage 파생화, 카드↔맵 연결(page.tsx).
  - **테스트**: voyage-map-view.test.ts 신규, MapPanel.test.tsx DateProvider 래핑 보강. MapPanel.test.tsx·tsc·eslint(지정 파일) 통과, lint errors 0.
  - **스크린샷 기준 보정 (2026-02-11)**: 카드 배지 겹침 수정 — 상단 여백 추가 + 배지 compact 2줄화(`voyage-cards.tsx`). 지도 경로 중첩 개선 — active voyage만 overlay 표시(`MapPanel.tsx`). tsc·MapPanel.test 통과.
- **즉시 조치(Immediate Action) 체크리스트 (2026-02-11)**:
  - **체크리스트 3항목 고정**: 1차 항차 TR 1유닛 로드(LCT 밸러스팅 제외), SPMT 2세트 유지·MOB 1/26 변경 없음, 잔여 일정 확정 후 반영. `lib/alerts/immediate-actions.ts` — 항목 상수, `toSelectedDateKey`, localStorage 키 `tr-dashboard-immediate-actions:{YYYY-MM-DD}`, load/save/toggle, invalid JSON fail-soft.
  - **OperationalNotice** (alerts.tsx): 체크박스·완료율(n/3 done)·Go 버튼. 항목1 Go → `onSelectVoyageNo(1)` + `onNavigateSection("voyages")`, 항목2 → `onNavigateSection("schedule")`, 항목3 → `onNavigateSection("gantt")`. 선택일 라벨 유지.
  - **AlertsSection** props: `onSelectVoyageNo?`, `onNavigateSection?`. **page.tsx**: `handleNavigateSection`(scrollIntoView), AlertsSection에 콜백 전달·voyage 선택 연동.
  - **테스트**: immediate-actions.test.ts(날짜 키·round-trip·invalid JSON), alerts.test.tsx(토글 완료율·날짜별 상태 분리·Go 콜백 payload). tsc 통과.

- **AI Command Phase 1 업그레이드 (2026-02-10)**: Unified Command Palette AI 실행 흐름 고도화.
  - `/api/nl-command` intent 계약 확장: `shift_activities|prepare_bulk|explain_conflict|set_mode|apply_preview|unclear`
  - Provider 전략: `AI_PROVIDER=ollama` 시 Ollama(EXAONE) 우선, OpenAI fallback
  - 응답 표준 필드: `confidence`, `risk_level`, `requires_confirmation=true` 강제
  - 정책 가드(422): `apply_preview.preview_ref === "current"`, `set_mode` enum 검증
  - 파일: `app/api/nl-command/route.ts`, `lib/ops/ai-intent.ts`
- **AI 리뷰/확인 실행 플로우 (2026-02-10)**:
  - AI 결과 즉시 실행 금지, `AIExplainDialog` 확인 후 `Confirm & Continue`에서만 실행
  - intent별 dispatcher(`executeAiIntent`) 추가: bulk/conflict/mode/apply 분기
  - 파일: `components/ops/UnifiedCommandPalette.tsx`, `components/ops/dialogs/AIExplainDialog.tsx`
- **Ambiguity 재질의 지원 (2026-02-10)**:
  - 다이얼로그 ambiguity 옵션 버튼 선택 시 `clarification` 포함 재호출
  - 파일: `components/ops/dialogs/AIExplainDialog.tsx`, `components/ops/UnifiedCommandPalette.tsx`, `app/api/nl-command/route.ts`
- **AI 검증 자산 추가 (2026-02-10)**:
  - UI/API 테스트 보강 + 한/영 스모크(12케이스) 추가
  - 파일: `components/ops/__tests__/AIExplainDialog.test.tsx`, `components/ops/__tests__/UnifiedCommandPalette.ai-mode.test.tsx`, `app/api/nl-command/__tests__/route.test.ts`, `scripts/smoke-nl-intent.ts`

- **StoryHeader SSOT 통합 (2026-02-04)**: TR/Activity 선택 시 Where/When/What/Evidence 자동 갱신. SSOT 타입 (`Activity`, `ActivityState`, `OptionC`) + derived-calc (`calculateCurrentActivityForTR`, `calculateCurrentLocationForTR`) + evidence-gate (`checkEvidenceGate`) import. `selectedTrId`, `ssot` state 추가. `storyHeaderData` 파생 계산 (`useMemo`). TR 선택 와이어링 (`handleActivityClick`, Map callbacks). ReadinessPanel에 `ssot` prop 전달. 파일: `app/page.tsx` (+175/-116). Ref: `docs/plan/story-header-ssot-integration.md`.
- **Trip 매칭 개선 (2026-02-04)**: ReadinessPanel의 Trip 선택 정확도 향상. `normalizeTripMatchValue()` (정규화), `matchTripIdForVoyage()` (Voyage → Trip 매칭), `readinessTripId` 파생 (ViewMode → Voyage 매칭 → null). 6가지 토큰 지원 (voyage/voy/trip/tr/tr unit/trUnit). 파일: `app/page.tsx`. Ref: `docs/plan/trip-matching-improvement.md`.
- **Map Geofence Layer (Phase 1) (2026-02-04)**: Semi-transparent boundary polygons around key locations (LOC_MZP, LOC_AGI)
  - `lib/map/geofenceUtils.ts`: GeoJSON creation and ray-casting algorithm (~2.2km offset)
  - `components/map/GeofenceLayer.tsx`: React component with dashed-border rectangles
  - Toggle control in MapLegend ("Layers" section with checkbox)
  - 10 unit tests with 100% pass rate (12ms execution)
  - SSOT Compliance: Read-only locations data, no mutations to `option_c_v0.8.0.json`
  - Quality Gates: ✅ lint (0 new warnings) | ✅ typecheck (0 new errors) | ✅ test (10/10) | ✅ build (success)
  - Ref: `docs/plan/map-enhancement-geofence-heatmap-eta.md` (Phase 1), `docs/plan/map-enhancement-geofence-phase1-complete.md`
- **SSOT 파일 출처 가드 (2026-02-04)**: option_c_v0.8.0.json 우선 사용, 폴백 메커니즘 (legacy → empty). `hasActivities()` 타입 가드로 빈 배열 방지. API route 후보 순서 명확화 및 유효성 검사 강화. 파일: `lib/data/schedule-data.ts`, `app/api/ssot/route.ts`. 테스트 7/7 passed ✅.
- **Weather Overlay 구현 완료 (2026-02-04)**: Canvas 배경 레이어 (z-0)로 NO_GO/NEAR_LIMIT 날씨 시각화. 신규 파일 3개 (`weather-overlay.ts`, `WeatherOverlay.tsx`, `weather-overlay.test.ts`). Opacity 슬라이더 (10-30%, md+에서 표시), UI 토글 (🌦️/🌤️), Range culling (viewStart/viewEnd), RAF throttle (10fps), DPI scaling (max 2x). 테스트 2/2 passed ✅.
- **A3. Mapper Caching (2026-02-04)**: Row-level 캐시 (LRU 200) in `lib/gantt/visTimelineMapper.ts`. 1개 row 변경 시 1개만 재계산, 재렌더링 30% 개선 목표.
- **B5. Dependency Type Visualization (2026-02-04)**: FS/SS/FF/SF 타입별 시각화. `components/gantt/DependencyArrowsOverlay.tsx` (SVG overlay, z-10). Live DOM 좌표 조회, 4가지 스타일 구분 (stroke/dash/width/marker), Lag 라벨 (+Nd/-Nd). `VisTimelineGantt.tsx` rangechange/changed callbacks 추가. ResizeObserver + RAF throttle. `gantt-chart.tsx` visContainerRef + renderKey 통합.

### Changed

- **문서 동기화 (2026-02-10)**: AI 기능 전용 문서 및 핵심 문서 최신화.
  - 신규: `docs/AI_FEATURES.md`, `docs/WORK_LOG_20260210_AI_UPGRADE.md`
  - 갱신: `docs/NL_COMMAND_INTERFACE_IMPLEMENTATION_REPORT.md`, `docs/NL_COMMAND_INTERFACE_COMPLETE.md`, `docs/INDEX.md`, `README.md`, `docs/SYSTEM_ARCHITECTURE.md`, `docs/LAYOUT.md`
- **VisTimelineGantt**: onRangeChange, onRender callbacks 추가 (overlay 동기화).
- **gantt-chart.tsx**: visContainerRef (positioned container), DependencyArrowsOverlay 통합, visRenderTick state, Weather Overlay 토글 + 슬라이더.
- **StoryHeader SSOT 연동**: 선택된 TR/Activity 기준으로 Location, Schedule, Evidence 요약을 파생 계산하도록 갱신.

### Fixed

- **Typecheck/Lint 전면 해결 (2026-02-11)**: `tsc --noEmit`, `eslint . --quiet` 0 errors 달성. ESLint 범위 설정(eslint.config.mjs), Ref 렌더 접근 제거(gantt-chart, VisTimelineGantt), map 타입·@ts 정리(PoiLocationsLayer, createHeatmapLayer), 누락 타입/모듈 보강(types/logistics.ts, deckgl-aggregation-layers.d.ts, lib/map/poiTypes, hvdcPoiLocations), 런타임·테스트 타입 수정(route, UnifiedCommandPalette, kpi-calculator, ssot-queries, forward/backward-pass, 9개 테스트 파일). 24파일 +470/-271. [docs/TYPECHECK_AND_LINT_FAILURES.md](docs/TYPECHECK_AND_LINT_FAILURES.md).
- **빌드 실패 (2026-02-11)**: tsconfig.tsbuildinfo·app/page.tsx 머지 충돌 마커 제거, .next 캐시 정리 후 빌드 성공.

- **Performance Optimization (P0)**: Turbopack + React 19 Compiler 활성화로 개발 경험 개선.
  - `next dev --turbo`: HMR 2~5배 빠름, 개발 서버 시작 1.2초.
  - `reactCompiler: true`: 불필요한 리렌더 30~50% 감소 (런타임 최적화).
  - `babel-plugin-react-compiler@1.0.0` 설치.
  - SSOT 검증 통과, 프로덕션 빌드 성공 (33초).
  - 참조: [docs/plan/performance-optimization-p0.md](docs/plan/performance-optimization-p0.md).

### Fixed

- **vis-timeline Gantt Vercel 미표시**: `NEXT_PUBLIC_GANTT_ENGINE` trim/toLowerCase 유연 비교 적용. `vis`, `VIS`, ` vis ` 등 모두 vis-timeline 엔진으로 인식 (gantt-chart.tsx).

### Added (기존)

- **vis-timeline Gantt Vercel 배포 안내**: config/env.example, docs/VERCEL.md에 `NEXT_PUBLIC_GANTT_ENGINE=vis` 환경 변수 설정 안내 추가. Vercel 배포 시 Environment Variables에 설정 필수.

---

## 2026-02-03

### 문서

- README, LAYOUT, SYSTEM_ARCHITECTURE, WORK_LOG 동기화 (Phase 6 Bug #1~5,#7, Phase 7/8/10/11 반영).
- CONTRIBUTING.md, CHANGELOG.md, LICENSE, docs/specs/SRS.md, Architecture.md, docs/api/API_Reference.md, docs/test/Test_Plan.md, docs/manual/User_Guide.md 추가.

---

## 2026-02-02

### Fixed (Phase 6 Bugfix — TR_Dashboard_Bugfix_Prompt_v1.1)

- **Bug #4**: WHERE/WHEN/WHAT/EVIDENCE 가이드 문구 제거 → StoryHeader Location/Schedule/Verification, tr-three-column-layout Map/Timeline.
- **Bug #2**: Trip/TR 필터 + 7 TRs visible — API 실패 시 voyages fallback, selectedVoyage 동기화, schedule-table fallback.
- **Bug #1**: Selected Date UTC 정렬 — `dateToIsoUtc`, `toUtcNoon`, gantt-chart/date-picker UTC 기준.
- **Bug #3**: View 버튼 → Detailed Voyage Schedule 섹션 스크롤.
- **Bug #5**: Compare Diff Baseline snapshot / Compare as-of UI 표시.

### Added

- **Phase 7**: Detail Panel 구조화, Collision tray, Why 패널 suggested_actions → reflowSchedule 연결.
- **Phase 10**: Compare Mode (compare-loader, CompareModeBanner, Gantt ghost bars, CompareDiffPanel).
- **Phase 11**: T11.2 Cycle detection, T11.3 Evidence gate, T11.4 E2E workflow 테스트.
- **Phase 8 T8.2**: Evidence checklist, EvidenceUploadModal, evidenceOverlay.
- **Phase 4**: Weather Go/No-Go 시스템 (files/weather_go_nogo.py 등).
- **Phase 5**: Real-Time Weather Data Integration 계획.

### Changed

- LAYOUT.md, SYSTEM_ARCHITECTURE.md, README.md, plan 문서들 본문 반영.

---

**Refs**: [WORK_LOG_20260202.md](docs/WORK_LOG_20260202.md), [BUGFIX_APPLIED_20260202.md](docs/BUGFIX_APPLIED_20260202.md)
