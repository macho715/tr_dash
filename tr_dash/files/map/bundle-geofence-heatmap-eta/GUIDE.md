# Geofence · Heatmap · ETA Wedge 가이드

맵에서 Geofence, Heatmap, ETA Wedge 레이어의 기능, 파일 역할, 사용 방법을 정리한 문서입니다.

---

## 1. 기능 설명

### Geofence (지오펜스)

- **역할**: 각 로케이션 주변에 가상 경계(폴리곤)를 그려 구역을 표시합니다.
- **동작**: `locations` 기준으로 위·경도 offset(0.02)으로 사각형 폴리곤을 생성하고, deck.gl `GeoJsonLayer`로 렌더링합니다.
- **연계**: Heatmap의 `getWeight`에서 지오펜스 내부 이벤트에 가중치(2)를 부여해 밀도 표현을 강조할 수 있습니다.
- **토글**: HeaderBar의 "Geofence" 스위치로 표시/숨김이 가능합니다.

### Heatmap (히트맵)

- **역할**: 이벤트(`Event[]`)의 위치 밀도를 색상으로 표현합니다.
- **동작**: `@deck.gl/aggregation-layers`의 `HeatmapLayer`를 사용하며, `getPosition`, `getWeight`, `radiusPixels`, `colorRange`로 스타일을 제어합니다.
- **옵션**: `windowHours` 내 이벤트만 사용하고, Heat Filter(All/OK/WARNING/CRITICAL)로 상태별 필터링이 가능합니다. 줌 레벨이 9.5 이상이면 레이어가 숨겨집니다.
- **범례**: `HeatmapLegend` 컴포넌트가 낮음→매우 높음 구간을 표시합니다.
- **토글**: HeaderBar의 "Heatmap" 스위치로 표시/숨김이 가능합니다.

### ETA Wedge (ETA 웨지)

- **역할**: PORT/BERTH 로케이션에 대해 “도착 예정 방향”을 wedge 형태로 표시합니다.
- **동작**: 현재는 **스텁**입니다. 위치 기준 단순 삼각형(wedge)을 그리며, 실제 ETA·항로 데이터 기반 geometry는 TODO 상태입니다.
- **토글**: HeaderBar의 "ETA Wedge" 스위치로 표시/숨김이 가능합니다.

---

## 2. 파일 역할

### 레이어 (`layers/`)

| 파일 | 역할 |
|------|------|
| `createGeofenceLayer.ts` | `locations`로 GeoJSON을 만들고 `GeoJsonLayer` 인스턴스를 반환합니다. |
| `geofenceUtils.ts` | `createGeofenceGeojson(locations)`로 GeoJSON 생성, `isPointInGeofence(lon, lat, geojson)`으로 점 포함 여부 판별합니다. |
| `createHeatmapLayer.ts` | `events`와 옵션(`getWeight`, `radiusPixels`, `visible`)으로 `HeatmapLayer`를 생성합니다. `HEATMAP_COLOR_RANGE`를 export합니다. |
| `createEtaWedgeLayer.ts` | PORT/BERTH만 필터한 뒤 wedge 폴리곤을 만들고 `PolygonLayer`로 렌더링합니다. (실제 ETA 연동은 미구현) |

### UI·사용처

| 파일 | 역할 |
|------|------|
| `HeatmapLegend.tsx` | Heatmap 색상 구간(낮음~매우 높음)을 범례로 표시합니다. |
| `MapView.tsx` | 맵 초기화, deck.gl overlay, 레이어 배열 구성. Geofence/Heatmap/ETA Wedge 레이어를 생성해 넣고, `showGeofence`/`showHeatmap`/`showEtaWedge`와 줌/필터에 따라 표시 여부를 결정합니다. |
| `dashboard/HeaderBar.tsx` | Geofence / Heatmap / ETA Wedge 스위치와 Window(h), Heat Filter 선택 UI를 제공합니다. |

### 상태·타입

| 파일 | 역할 |
|------|------|
| `store/logisticsStore.ts` | `showGeofence`, `showHeatmap`, `showEtaWedge`와 `toggleGeofence`, `toggleHeatmap`, `toggleEtaWedge`, `windowHours`, `heatFilter` 등을 관리합니다. |
| `types/logistics.ts` | `LogisticsState` 등 레이어 토글·필터에 필요한 타입을 정의합니다. |

---

## 3. 데이터 흐름

1. **Store**: `useLogisticsStore`에서 `showGeofence`, `showHeatmap`, `showEtaWedge`, `windowHours`, `heatFilter`를 제공합니다.
2. **MapView**: `useOpsStore`에서 `locationsById`, `eventsById`, `locationStatusesById`를 받아 `locations`·이벤트 목록을 구성하고, store의 토글/필터 값을 구독합니다.
3. **레이어 생성**: `createGeofenceLayer(locations, showGeofence)`, `createHeatmapLayer(events, { getWeight, radiusPixels, visible })`, `createEtaWedgeLayer(locations, showEtaWedge)`를 호출해 deck.gl 레이어 배열에 넣습니다.
4. **Heatmap 가중치**: `createGeofenceGeojson`과 `isPointInGeofence`로 이벤트가 지오펜스 안에 있으면 weight 2, 아니면 1을 주어 Heatmap 밀도를 조정합니다.

---

## 4. 사용 시 유의사항

- 이 번들 폴더는 **복사본**이므로, 앱에서 실제로 import되는 경로는 원본(`@/store`, `@/components/map/...` 등)입니다. 번들 내 파일의 import 경로는 수정하지 않았습니다.
- ETA Wedge는 실제 ETA/항로 데이터가 반영된 geometry로 교체하는 작업이 필요합니다(`createEtaWedgeLayer.ts` 내 TODO).
- Heatmap은 줌 9.5 미만에서만 표시되며, `MAP_LAYER_ZOOM_THRESHOLDS.heatmapMax`로 제어됩니다.
