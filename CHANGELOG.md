# Changelog — TR Movement Dashboard

**형식**: [Keep a Changelog](https://keepachangelog.com/).  
**참조**: [docs/WORK_LOG_20260202.md](docs/WORK_LOG_20260202.md), [docs/BUGFIX_APPLIED_20260202.md](docs/BUGFIX_APPLIED_20260202.md), [README.md](README.md).

---

## [Unreleased]

### Fixed

- **vis-timeline Gantt Vercel 미표시**: `NEXT_PUBLIC_GANTT_ENGINE` trim/toLowerCase 유연 비교 적용. `vis`, `VIS`, ` vis ` 등 모두 vis-timeline 엔진으로 인식 (gantt-chart.tsx).

### Added

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
