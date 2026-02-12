# TR Dashboard Mobile UX 구현 계획 (레포 실경로 기준 확정본)

**작성일**: 2026-02-11  
**기준**: AGENTS.md, patch.md, 현재 레포 구조 (page.tsx 중심)

---

## 요약

이 계획은 M1~M14를 현재 레포 구조(page.tsx 중심)에 맞춰 구현하는 실행 사양이다.  
**핵심 목표**: 모바일(≤768px)에서 Where → When/What → Evidence **3초 가독**과 **2-click Why** 유지, SSOT 불변조건(Activity 권위, Preview→Apply, 모드 분리) **무훼손**.

---

## 결정 고정 (Repo Mapping)

| 계획 항목 | 대안(미채택) | 확정 경로 |
|-----------|--------------|-----------|
| 페이지 엔트리 | — | **page.tsx** 기준 구현 |
| Control Bar | — | **GlobalControlBar.tsx** 수정 |
| Why/Collision | components/collisions/* | **WhyPanel.tsx**, **gantt-chart.tsx** collision badge 경로 수정 |
| Gantt/Map | GanttPanel.tsx | **gantt-chart.tsx**, **gantt-section.tsx**, **MapPanel.tsx** 수정 |
| 버튼/배지 | components/shared/* | **button.tsx**, **badge.tsx** 기준 터치 타겟 규칙 적용 |
| 기존 T1 산출물 | — | **components/dashboard/skeletons/** , **fallbacks/** , **use-near-viewport-preload.ts** baseline 재사용 |
| 기능 플래그 | — | **feature-flags.ts** 신규 도입, M1~M14 단계별 ON/OFF |

---

## Public API / 타입 변경

### 신규 파일

- **feature-flags.ts** — `MOBILE_UX_FLAGS` 상수 export

### Props 확장

- **GlobalControlBar.tsx**: `mobileDrawerEnabled?`, `onOpenFilterDrawer?`, `appliedFilterChips?`
- **StoryHeader.tsx**: `mobileMode?`, `compactEvidenceCount?`, `onOpenStoryMore?`
- **WhyPanel.tsx**: `mobileSheetMode?`, `stepLabel?: "1/2" | "2/2" | null`

### 신규 컴포넌트

- **MobileKPICard.tsx** (M2)
- **FilterDrawer.tsx** (M9)
- **PriorityBanner.tsx** (M3)
- **MobileLayout.tsx** (M7)
- **GanttDrawer.tsx** (M7)
- **GanttDetailModal.tsx** (M10)
- **OfflineBanner.tsx** (M13)
- **NotificationSettings.tsx** (M14)

### 신규 유틸

- **breakpoints.ts** — 모바일 판별
- **priority-checks.ts** (M3 파생 계산)
- **offline-cache.ts** (M13)
- **push.ts** (M14)

---

## 구현 순서 (PR 단위, 결정 완료)

### PR-1 Foundation (M4 + M5)

- **tailwind.config.ts**: mobile/tablet/desktop screens, touch utility `min-h-touch`/`min-w-touch` = 44px, mobile type tokens (`text-mobile-heading`/`body`/`caption`)
- **globals.css**: 모바일 타이포 scale, 대비 토큰(본문 4.5:1 이상)
- **button.tsx**, **badge.tsx**: 모바일 최소 터치 영역 44×44
- **주요 인터랙션**: StoryHeader, GlobalControlBar, WhyPanel, voyage-cards, HistoryEvidencePanel — touch target 보강 class 적용

**완료 기준**: 모바일 인터랙션 target 전수 44×44, 본문 대비 4.5:1 이상.

---

### PR-2 Quick Win UI (M2 + M11 + M9 + M12)

- **M2**: MobileKPICard.tsx 생성, StoryHeader 모바일 분기. 카드당 1 KPI + optional sparkline(고정 높이 60px 이하)
- **M11**: StoryHeader/VoyageCards/Gantt 보조 텍스트 모바일 축약. 상세는 "More" 액션으로 drawer/sheet
- **M9**: FilterDrawer.tsx. Trip/TR/Date/View/Risk를 모바일에서 drawer 전환. GlobalControlBar 모바일 "Filters" 버튼만 노출, 적용 필터 chip 표시
- **M12**: WhyPanel 모바일 sheet 모드. 단계 표시 badge 1/2, panel 2/2. Evidence/History 링크 터치 44×44. 데스크톱 side panel 유지

**완료 기준**: 모바일 2-click Why 5초 내 완료, 필터 drawer 접근/닫기/적용 키보드·터치 정상.

---

### PR-3 Short-term Layout (M1 + M3 + M7 + M10)

- **M1**: StoryHeader 모바일 1-screen stack. Where 1줄, When/What 1줄, Evidence N건. 긴 문자열 약어/ellipsis + tooltip
- **M3**: PriorityBanner.tsx, priority-checks.ts. Immediate action, At Risk voyage, Evidence unmet top 3. 클릭 시 #voyages/#gantt/#evidence 이동
- **M7**: MobileLayout.tsx, GanttDrawer.tsx. 모바일 Priority → Map → Detail → Evidence 세로 스택. Gantt는 drawer 진입. 데스크톱 TrThreeColumnLayout 유지
- **M10**: gantt-chart 모바일 요약 모드(Voyage 집계 막대). GanttDetailModal.tsx 상세 전체화면. MapPanel 모바일 marker-only 옵션

**완료 기준**: iPhone SE 폭에서 StoryHeader 스크롤 없이 1화면, 모바일 가로 스크롤 0.

---

### PR-4 Mid-term Field/Offline/Push (M6 + M13 + M14)

- **M6**: 아이콘+텍스트 액션 표준. button.tsx, badge.tsx, globals.css 고대비 모드
- **M13**: 오프라인 읽기 캐시. sw.js, offline-cache.ts, OfflineBanner.tsx. TTL 1시간, 오프라인 시 read-only 배너, Apply/Preview disable 규칙 연동
- **M14**: 푸시 알림. push.ts, route, NotificationSettings.tsx. deep link: #voyages, #gantt, #evidence, #water-tide

**완료 기준**: 오프라인 진입 시 캐시 데이터 + read-only 명시. 알림 클릭 시 해당 섹션 딥링크 이동.

---

### PR-5 Optional (M8)

- 모바일 전용 경로: page.tsx 또는 app/tide-gantt 패턴과 동일한 별도 route
- 구성: MobileView.tsx, SimpleTimeline.tsx. 데이터 fetch 기존 /api/ssot 공유
- **플래그 OFF 기본**, 운영 피드백 후 ON

---

## 테스트/검증 계획

### 단위/컴포넌트 테스트 추가

- GlobalControlBar.mobile.test.tsx — drawer trigger/칩/접근성
- StoryHeader.mobile.test.tsx — 1-screen stack, KPI 축약, More expansion
- WhyPanel.mobile.test.tsx — 1/2→2/2 흐름, sheet 모드, touch area
- PriorityBanner.test.tsx — 우선순위 계산/네비게이션
- MobileLayout.test.tsx — 모바일 세로 스택 + Gantt drawer
- GanttSummary.mobile.test.tsx — 요약모드/상세모달 전환
- offline-cache.test.ts — TTL/오프라인 fallback/read-only 정책
- push.test.ts — 딥링크 payload/권한 상태

### 회귀 테스트

- alerts.test.tsx, gantt-chart.tide-guidance.test.ts, MapPanel.test.tsx, tideService.test.ts
- StoryHeader/WhyPanel/GlobalControlBar 기존 동작 회귀 확인

### 검증 명령 (단계별 공통)

```bash
pnpm exec tsc --noEmit --incremental false
pnpm test:run  # 대상 테스트
pnpm build
```

### 수동 시나리오 (필수)

1. iPhone SE(375px): StoryHeader 1스크린, 3초 스캔 가능
2. 모바일: Filters 버튼 → drawer → 적용 chip 반영
3. collision badge 탭 → Why panel 2-step 흐름 5초 내 완료
4. 모바일: Map/Detail/Evidence 세로 스택, Gantt drawer 진입/닫기 정상
5. 오프라인: 배너 + read-only + 캐시 시간 표시
6. 알림 탭: 해당 섹션으로 정확히 이동

---

## 가정/기본값

- 모든 변경은 **page.tsx 주 경로**에서 우선 구현
- **기능 플래그 기본값**: Phase1/2 항목 ON, M6/M8/M13/M14 기본 OFF 후 점진 활성화
- SSOT / Preview→Apply / 모드 분리 계약은 **변경하지 않음**
- 모바일 전용 route(M8)는 Quick Win/Short-term 성과 부족 시에만 진행
- 푸시(M14): 브라우저 권한 거부를 기본 시나리오로 고려, **인앱 배너 fallback** 제공

---

## Refs

- [AGENTS.md](../AGENTS.md)
- [patch.md](../patch.md)
- [CHANGELOG.md](../CHANGELOG.md)
- [docs/innovation-scout-dashboard-upgrade-ideas-20260211.md](../innovation-scout-dashboard-upgrade-ideas-20260211.md) — U6 모바일·태블릿 반응형
