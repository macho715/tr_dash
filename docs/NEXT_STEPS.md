# 다음 단계 (Next Steps)

**Last updated:** 2026-02-05

현재 완료된 작업(SSOT·ErrorBoundary·날짜·fetch 수정, 테스트 2건 수정) 이후 남은 이슈와 권장 순서.

---

## 1. Vitest — 컴포넌트 테스트 워커 타임아웃

**현상:** 전량 테스트 시 다음 5개 파일에서 `Timeout waiting for worker to respond` 발생.

- `components/dashboard/__tests__/why-panel.test.tsx`
- `components/control-bar/__tests__/GlobalControlBar.test.tsx`
- `components/map/__tests__/MapPanel.test.tsx`
- `components/detail/__tests__/detail-panel.test.tsx`
- `components/ops/__tests__/AgiOpsDock.test.tsx`

**조치:** `vitest.config.ts`에 `testTimeout: 20000` 적용됨. 그래도 실패 시:

- 해당 5개 파일만 따로 실행: `pnpm run test:run -- components/dashboard/__tests__/why-panel.test.tsx` 등
- 또는 `--pool=threads` / `--no-file-parallelism` 등으로 워커 부하 완화 후 재실행

---

## 2. TypeCheck — 기존 타입 에러

**현상:** `pnpm run typecheck` 시 다수 파일에서 에러(이번 SSOT/ErrorBoundary/날짜 수정과 무관).

주요 위치: 테스트 픽스처·타입 단언, `EvidenceTab`/`HistoryEvidencePanel` props, `MapContent`(leaflet), `WhatIfPanel`, `GanttChart`, `files/map/bundle-geofence-heatmap-eta/`, `src/lib/derived-calc.ts`, reflow/state-machine/timeline 등.

**권장:** 파일/모듈 단위로 타입 수정 또는 `// @ts-expect-error` 정리. 스키마/공용 타입 변경 시 AGENTS.md “Ask first” 준수.

---

## 3. Lint

**현상:** `pnpm run lint` 전량 실행 시 타임아웃 가능성. 변경 파일만 검사하면 빠르게 확인 가능.

**권장:** PR 전 `pnpm run lint` 1회 실행. 변경한 경로만 검사할 경우:

```bash
pnpm exec eslint app/page.tsx lib/dashboard-data.ts components/map/MapPanelWrapper.tsx components/dashboard/WidgetErrorBoundary.tsx components/dashboard/gantt-chart.tsx src/lib/__tests__/history-evidence.test.ts src/lib/__tests__/ssot-loader.test.ts vitest.config.ts
```

---

## 4. 참고

- SSOT/데이터 소스 정책: AGENTS.md §5.1
- 테스트 수정 내역: `history-evidence.test.ts` import 경로(`@/src/lib/state-machine/evidence-gate`), `ssot-loader.test.ts` baseline 기대값(activities 17, trs 7)
