# Changelog — TR Movement Dashboard

**형식**: [Keep a Changelog](https://keepachangelog.com/).  
**참조**: [docs/WORK_LOG_20260202.md](docs/WORK_LOG_20260202.md), [docs/BUGFIX_APPLIED_20260202.md](docs/BUGFIX_APPLIED_20260202.md), [README.md](README.md).

---

## [Unreleased]

### Added

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

- **VisTimelineGantt**: onRangeChange, onRender callbacks 추가 (overlay 동기화).
- **gantt-chart.tsx**: visContainerRef (positioned container), DependencyArrowsOverlay 통합, visRenderTick state, Weather Overlay 토글 + 슬라이더.
- **StoryHeader SSOT 연동**: 선택된 TR/Activity 기준으로 Location, Schedule, Evidence 요약을 파생 계산하도록 갱신.

### Fixed

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
