# Geofence · Heatmap · ETA Wedge 번들

이 폴더는 **맵 레이어(Geofence, Heatmap, ETA Wedge)** 및 그 사용처의 **참조용 복사본**입니다.

- **원본**: `apps/logistics-dashboard` 내 상위 경로에 있으며, 앱은 원본만 참조합니다.
- **용도**: 그룹 파악, 백업, 이관 시 참조. 빌드/런타임에는 사용되지 않습니다.
- **가이드**: 상세 기능 설명·파일 역할·사용법은 [GUIDE.md](./GUIDE.md)를 참고하세요.

## 빠른 참조

| 구분   | 이 번들 내 경로              | 원본 경로 (앱 기준) |
|--------|------------------------------|----------------------|
| 레이어 | `layers/*.ts`                | `components/map/layers/` |
| UI     | `HeatmapLegend.tsx`          | `components/map/HeatmapLegend.tsx` |
| 맵     | `MapView.tsx`                | `components/map/MapView.tsx` |
| 헤더   | `dashboard/HeaderBar.tsx`     | `components/dashboard/HeaderBar.tsx` |
| 스토어 | `store/logisticsStore.ts`    | `store/logisticsStore.ts` |
| 타입   | `types/logistics.ts`         | `types/logistics.ts` |
