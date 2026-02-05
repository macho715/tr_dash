---
doc_id: map-integration-ideas
refs: [AGENTS.md, LAYOUT.md, patchmain1.md, components/map, files/map]
updated: 2026-02-04
---

# Map 컴포넌트 → 대시보드 통합 아이디어

> **참조**: `components/map/`, `files/map/` 스크립트 기반.  
> **목표**: Where → When/What → Evidence 3초 내 읽기, SSOT(option_c.json) 준수.

---

## 1. 현재 Map 아키텍처 요약

### 1.1 components/map (현재 대시보드 사용)

| 파일 | 역할 | 데이터 소스 |
|------|------|-------------|
| `MapPanelWrapper` | SSOT fetch, 에러/로딩 처리 | `/api/ssot` |
| `MapPanel` | TR 마커·루트·충돌 배지 파생 | option_c.json (SSOT) |
| `MapContent` | Leaflet 렌더 | locations, routeSegments, trMarkers |

**핵심 특징**
- `calculateCurrentLocationForTR`, `calculateCurrentActivityForTR` (derived-calc)
- `activityStateToMapStatus` → TR 마커 색상 (planned/in_progress/completed/blocked/delayed)
- Collision outline: blocking=빨강, warning=노랑
- 상호 하이라이트: Map 선택 → Timeline 스크롤, `onTrClick` / `onActivitySelect`

### 1.2 files/map (MapLibre + deck.gl, 별도 스토어)

| 레이어 | 역할 | 데이터 |
|--------|------|--------|
| Geofence | 구역 폴리곤 | locations → GeoJSON |
| Heatmap | 이벤트 밀도 | events (windowHours 필터) |
| ETA Wedge | ETA 방향/구간 | locations |
| Location | 상태 마커 (occupancy, status) | locations + statusByLocationId |
| POI | HVDC POI | POI_LOCATIONS |
| HvdcPoiLayers | AGI 사이트 POI | HvdcPoiLayers |

**스토어**: `useOpsStore`, `useLogisticsStore` (showGeofence, showHeatmap, showEtaWedge, heatFilter)

---

## 2. 대시보드 대입 아이디어 (우선순위)

### P0. 상호 하이라이트 강화 (AGENTS.md §5)

| 아이디어 | 설명 | 구현 힌트 |
|----------|------|-----------|
| **Map → Timeline 동기화** | TR 마커 클릭 시 Gantt/Schedule 해당 activity로 스크롤 + 하이라이트 | `onTrClick` → `scrollToActivity`, `scrollIntoView` |
| **Timeline → Map 동기화** | Activity 선택 시 해당 route_id 지오펜스/구간 강조 | `highlightedRouteId` 전달, Polyline weight/color |
| **2-click Evidence 점프** | Why 패널에서 Evidence 링크 클릭 시 Map 상 해당 Location 포커스 | Map bounds fit + 해당 Location pulsing |

### P1. Risk Overlay와 맵 결합 (patchmain1.md, GlobalControlBar)

| 아이디어 | 설명 | 구현 힌트 |
|----------|------|-----------|
| **riskOverlay=wx** | 기상 리스크 구역을 맵에 오버레이 | `data/schedule/weather.json` → GeoJSON 또는 Heatmap |
| **riskOverlay=resource** | 자원 충돌 구간(같은 리소스 사용 시간대) 하이라이트 | Collision activity의 route_id 구간 빨강 |
| **riskOverlay=permit** | Permit/Cert 구간 별도 스타일 | Activity type별 route 색상 (PTW/CERT 등) |
| **riskOverlay=none** | 기본: TR 위치 + 루트만 | 현재 동작 유지 |

### P2. files/map 기능을 SSOT 기반으로 이식

| 아이디어 | 설명 | SSOT 매핑 |
|----------|------|------------|
| **Geofence (선택)** | Activity location 구역 시각화 | `plan.location` → locations GeoJSON |
| **ETA Wedge (선택)** | 다음 이동 방향/예상 구간 표시 | `plan.location.to_location_id` + ETA |
| **Heatmap (선택)** | 과거 Actual 이벤트 밀도 | `actual` 기록 → events 유사 구조 (SSOT에서 파생) |
| **POI 통합** | LOC_MZP, LOC_AGI 등 HVDC POI | `option_c.entities.locations`에 POI 병합 또는 별도 레이어 |

### P3. View Mode별 맵 동작

| 모드 | 맵 동작 |
|------|---------|
| **Live** | TR 마커·루트·충돌·클릭 모두 활성 |
| **History** | as-of 시점 스냅샷, 클릭 비활성 또는 읽기 전용 |
| **Approval** | 읽기 전용, Evidence 배지만 강조 |
| **Compare** | baseline vs current delta → 변경된 route 구간 ghost 표시 |

### P4. UX/성능 개선

| 아이디어 | 설명 |
|----------|------|
| **Map Lazy Load** | `dynamic(..., { ssr: false })` 유지, fold 위 영역 우선 로드 |
| **줌 레벨 기반 레이어** | zoom &lt; 10: 루트만, zoom ≥ 10: TR 마커 + 상세 |
| **지오펜스 클릭 → Detail** | Location 클릭 시 해당 Activity 목록 표시 (Collapse) |
| **Map Legend** | TR 상태별 색상 + Collision 배지 의미 (patch §4.1) |

---

## 3. SSOT 불변조건 (AGENTS.md §1)

- **Activity = SSOT**: Map의 TR 위치·상태·충돌은 Activity에서 파생만. Trip/TR에 저장하지 않음.
- **파생 계산**: `calculateCurrentLocationForTR`, `calculateCurrentActivityForTR`, `activity.calc.collision_ids` 등 derived-calc 사용.
- **riskOverlay** 등 토글은 UI 상태만. SSOT에는 미반영.

---

## 4. 구현 순서 제안

1. **P0 상호 하이라이트** — 이미 부분 구현됨. `scrollToActivity`, `highlightedRouteId` 전달 경로 검증 및 보강.
2. **P1 riskOverlay** — GlobalControlBar의 `riskOverlay` prop이 MapPanel에 전달되는지 확인 후, wx/resource/permit 레이어 분기.
3. **P2 Geofence/POI** — option_c locations를 GeoJSON으로 변환하는 유틸 추가, MapContent에 선택적 레이어.
4. **P3 View Mode** — ViewModeStore 연동, MapPanel에 `viewMode` 전달 후 조건부 렌더/클릭.
5. **P4 Legend/Lazy** — Map Legend 컴포넌트, fold 기준 lazy load.

---

## 5. 파일 영향 범위

| 작업 | 영향 파일 |
|------|-----------|
| P0 | `MapPanel.tsx`, `page.tsx`, `gantt-chart.tsx` (scrollToActivity) |
| P1 | `MapPanel.tsx`, `MapContent.tsx`, `GlobalControlBar.tsx` |
| P2 | `MapContent.tsx`, `lib/ssot/map-geojson.ts` (신규), `option_c.json` 스키마 |
| P3 | `MapPanel.tsx`, `ViewModeProvider`, `map-status-colors.ts` |
| P4 | `MapPanel.tsx`, `MapLegend.tsx` (신규), `tr-three-column-layout.tsx` |

---

## Refs

- [AGENTS.md](../AGENTS.md) §1, §5
- [LAYOUT.md](../LAYOUT.md) §7 TrThreeColumnLayout, mapSlot
- [patchmain1.md](../patchmain1.md) P1 UX
- [components/map/](../../components/map/)
- [files/map/](../../files/map/)
