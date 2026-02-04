# Map Enhancement Plan: Geofence, Heatmap, ETA Wedge

**Status:** PHASE 1 COMPLETE ✅ | PHASE 2 PENDING | PHASE 3 PENDING  
**Priority:** P0 (Geofence), P1 (Heatmap), P2 (ETA Wedge)  
**Estimated Effort:** 10-13 hours  
**SSOT Impact:** None (derived data only)

**Phase 1 Completion:**
- Date: 2026-02-04
- Quality Gates: ✅ lint | ✅ typecheck | ✅ test (10/10) | ✅ build
- SSOT Compliance: ✅ Read-only locations, no mutations
- Details: [docs/plan/map-enhancement-geofence-phase1-complete.md](./map-enhancement-geofence-phase1-complete.md)

---

## Executive Summary

Implement 3 advanced map visualization features inspired by LOGI-MASTER-DASH:
1. **Geofence**: Location boundary polygons with point-in-polygon detection
2. **Enhanced Heatmap**: 6-color gradient + dynamic intensity + legend
3. **ETA Wedge**: Directional sector visualization showing TR movement direction and ETA urgency

**Target Stack:** Leaflet (no deck.gl migration)  
**SSOT Compliance:** All features use derived data from `option_c_v0.8.0.json`

---

## Phase 1: Geofence (P0) - 2-3 hours

### Goals
- Display semi-transparent polygons around key locations (LOC_MZP, LOC_AGI)
- Implement point-in-polygon detection for future heatmap weighting
- Add toggle control to MapLegend

### Files to Create
- `lib/map/geofenceUtils.ts` (~50 lines)
  - `createGeofenceGeojson()`: Generate GeoJSON FeatureCollection
  - `isPointInGeofence()`: Ray-casting algorithm (from LOGI-MASTER-DASH)
- `components/map/GeofenceLayer.tsx` (~30 lines)
  - React component rendering Leaflet Polygons
  - Props: `locations`, `visible`

### Files to Modify
- `components/map/MapContent.tsx`
  - Import and render `<GeofenceLayer>`
- `components/map/MapPanel.tsx`
  - Add `showGeofence` state (default: false)
  - Pass `locations` to MapContent
- `components/map/MapLegend.tsx`
  - Add "Geofence" checkbox toggle

### Implementation Details

#### `lib/map/geofenceUtils.ts`
```typescript
export type GeofenceFeature = {
  type: 'Feature'
  geometry: {
    type: 'Polygon'
    coordinates: [number, number][][]
  }
  properties: {
    location_id: string
    name: string
  }
}

export type GeofenceFeatureCollection = {
  type: 'FeatureCollection'
  features: GeofenceFeature[]
}

export function createGeofenceGeojson(
  locations: Record<string, { location_id: string; name: string; lat: number; lon: number }>
): GeofenceFeatureCollection {
  const offset = 0.02 // ~2.2km
  
  return {
    type: 'FeatureCollection',
    features: Object.values(locations).map((loc) => ({
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [loc.lon - offset, loc.lat - offset],
          [loc.lon + offset, loc.lat - offset],
          [loc.lon + offset, loc.lat + offset],
          [loc.lon - offset, loc.lat + offset],
          [loc.lon - offset, loc.lat - offset], // close
        ]],
      },
      properties: {
        location_id: loc.location_id,
        name: loc.name,
      },
    })),
  }
}

// Ray-casting algorithm (from LOGI-MASTER-DASH)
export function isPointInGeofence(
  lon: number,
  lat: number,
  geojson: GeofenceFeatureCollection
): boolean {
  return geojson.features.some((feature) => {
    const ring = feature.geometry.coordinates[0]
    let inside = false
    
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i]
      const [xj, yj] = ring[j]
      const intersects =
        yi > lat !== yj > lat &&
        lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
      if (intersects) inside = !inside
    }
    
    return inside
  })
}
```

#### `components/map/GeofenceLayer.tsx`
```typescript
'use client'

import { Polygon } from 'react-leaflet'

type Location = {
  location_id: string
  name: string
  lat: number
  lon: number
}

type GeofenceLayerProps = {
  locations: Record<string, Location>
  visible: boolean
}

export function GeofenceLayer({ locations, visible }: GeofenceLayerProps) {
  if (!visible) return null
  
  const offset = 0.02 // ~2.2km
  
  return (
    <>
      {Object.values(locations).map((loc) => {
        const bounds: [number, number][] = [
          [loc.lat - offset, loc.lon - offset],
          [loc.lat - offset, loc.lon + offset],
          [loc.lat + offset, loc.lon + offset],
          [loc.lat + offset, loc.lon - offset],
        ]
        
        return (
          <Polygon
            key={loc.location_id}
            positions={bounds}
            pathOptions={{
              color: '#6495ED',
              fillColor: '#6495ED',
              fillOpacity: 0.15,
              weight: 2,
              dashArray: '5, 5',
            }}
          />
        )
      })}
    </>
  )
}
```

### Testing
- `lib/map/__tests__/geofenceUtils.test.ts`
  - `isPointInGeofence()` with inside/outside cases
  - `createGeofenceGeojson()` output structure

### Acceptance Criteria
- [x] Geofence polygons visible on map when toggled on
- [x] Toggles on/off via MapLegend checkbox
- [x] Ray-casting test passes for LOC_MZP/LOC_AGI
- [x] No SSOT violations
- [x] `pnpm lint && pnpm typecheck` passes (no new errors)

---

## Phase 2: Enhanced Heatmap (P1) - 3-4 hours

### Goals
- Add 6-color gradient (blue → red) to existing leaflet.heat
- Calculate dynamic intensity based on activity density per location
- Add HeatmapLegend component

### Files to Create
- `components/map/HeatmapLegend.tsx` (~40 lines)
  - Visual legend with color swatches
  - Labels: "Low", "Low-Med", "Medium", "Med-High", "High", "Very High"

### Files to Modify
- `components/map/MapContent.tsx`
  - Update `HeatLayer` component: add `gradient` config
- `components/map/MapPanel.tsx`
  - Calculate `heatPoints` with dynamic intensity
  - Formula: `intensity = min(1.0, 0.2 + (activityCount / 10) * 0.8)`
- `components/map/MapLegend.tsx`
  - Add "Heatmap Legend" toggle

### Implementation Details

#### Update `MapContent.tsx` HeatLayer
```typescript
function HeatLayer({ heatPoints }: { heatPoints: HeatPoint[] }) {
  const map = useMap()
  useEffect(() => {
    if (!heatPoints?.length) return
    const heat = (L as any).heatLayer(heatPoints, {
      radius: 35,
      blur: 20,
      maxZoom: 12,
      minOpacity: 0.4,
      gradient: {
        0.0: '#0198bd',   // blue
        0.4: '#49e3ce',   // cyan
        0.65: '#d8feb5',  // lime
        0.85: '#feedb1',  // yellow
        0.95: '#fead54',  // orange
        1.0: '#d1374e',   // red
      },
    })
    heat.addTo(map)
    return () => map.removeLayer(heat)
  }, [map, heatPoints])
  return null
}
```

#### `components/map/HeatmapLegend.tsx`
```typescript
'use client'

const HEATMAP_GRADIENT = [
  { color: '#0198bd', label: 'Low' },
  { color: '#49e3ce', label: 'Low-Med' },
  { color: '#d8feb5', label: 'Medium' },
  { color: '#feedb1', label: 'Med-High' },
  { color: '#fead54', label: 'High' },
  { color: '#d1374e', label: 'Very High' },
]

type HeatmapLegendProps = {
  visible: boolean
}

export function HeatmapLegend({ visible }: HeatmapLegendProps) {
  if (!visible) return null
  
  return (
    <div className="absolute left-2 top-20 z-[1000] rounded-md border bg-card/90 px-2 py-1.5 text-xs backdrop-blur-sm">
      <div className="mb-1 font-semibold">Activity Density</div>
      {HEATMAP_GRADIENT.map((g) => (
        <div key={g.color} className="flex items-center gap-1.5">
          <span
            className="h-3 w-5 rounded border border-gray-300"
            style={{ backgroundColor: g.color }}
          />
          <span>{g.label}</span>
        </div>
      ))}
    </div>
  )
}
```

#### Update `MapPanel.tsx` heatPoints calculation
```typescript
const heatPoints = useMemo(() => {
  const result: HeatPoint[] = []
  
  for (const loc of Object.values(locations)) {
    // Count activities at this location
    const activityCount = Object.values(activities).filter(
      (a) =>
        a.plan?.location?.from_location_id === loc.location_id ||
        a.plan?.location?.to_location_id === loc.location_id
    ).length
    
    // Normalize: 1-10 activities → 0.2-1.0 intensity
    const intensity = Math.min(1.0, 0.2 + (activityCount / 10) * 0.8)
    
    result.push([loc.lat, loc.lon, intensity])
  }
  
  return result
}, [locations, activities])
```

### Testing
- Visual regression: screenshot before/after gradient
- Snapshot test for HeatmapLegend colors

### Acceptance Criteria
- [ ] Heatmap displays with 6-color gradient
- [ ] Legend visible when toggled on
- [ ] Intensity reflects activity density
- [ ] No performance degradation (<100ms render)
- [ ] `pnpm lint && pnpm typecheck` passes

---

## Phase 3: ETA Wedge (P2) - 5-6 hours

### Goals
- Display directional sector (wedge) for TRs with ETA data
- Color-code by urgency: red (<2h), yellow (<6h), green (>6h)
- Calculate bearing from current location to destination

### Files to Create
- `lib/map/wedgeUtils.ts` (~60 lines)
  - `calculateBearing()`: Haversine bearing formula
  - `createWedgePolygon()`: Generate wedge coordinates
- `components/map/EtaWedgeLayer.tsx` (~100 lines)
  - React component rendering Leaflet Polygons
  - Props: `trMarkers`, `activities`, `locations`, `visible`

### Files to Modify
- `components/map/MapContent.tsx`
  - Import and render `<EtaWedgeLayer>`
- `components/map/MapPanel.tsx`
  - Add `showEtaWedge` state (default: false)
  - Pass `activities` to MapContent
- `components/map/MapLegend.tsx`
  - Add "ETA Wedge" checkbox toggle

### Implementation Details

#### `lib/map/wedgeUtils.ts`
```typescript
// Haversine bearing calculation
export function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const y = Math.sin(dLon) * Math.cos((lat2 * Math.PI) / 180)
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.cos(dLon)
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

// Create wedge polygon
export function createWedgePolygon(
  lat: number,
  lon: number,
  bearing: number,
  arcWidth: number,
  radiusKm: number
): [number, number][] {
  const points: [number, number][] = [[lat, lon]] // apex
  const start = bearing - arcWidth / 2
  const end = bearing + arcWidth / 2
  
  for (let angle = start; angle <= end; angle += 5) {
    const radians = (angle * Math.PI) / 180
    const latOffset = (radiusKm / 111) * Math.cos(radians)
    const lonOffset =
      (radiusKm / (111 * Math.cos((lat * Math.PI) / 180))) * Math.sin(radians)
    points.push([lat + latOffset, lon + lonOffset])
  }
  
  points.push([lat, lon]) // close
  return points
}
```

#### `components/map/EtaWedgeLayer.tsx`
```typescript
'use client'

import { Polygon } from 'react-leaflet'
import { calculateBearing, createWedgePolygon } from '@/lib/map/wedgeUtils'

type Location = {
  location_id: string
  name: string
  lat: number
  lon: number
}

type Activity = {
  activity_id: string
  plan?: {
    location?: {
      to_location_id?: string
    }
  }
}

type TrMarker = {
  trId: string
  lat: number
  lon: number
  eta: string | null
  currentActivityId: string | null
}

type EtaWedgeLayerProps = {
  trMarkers: TrMarker[]
  activities: Record<string, Activity>
  locations: Record<string, Location>
  visible: boolean
}

export function EtaWedgeLayer({
  trMarkers,
  activities,
  locations,
  visible,
}: EtaWedgeLayerProps) {
  if (!visible) return null
  
  return (
    <>
      {trMarkers.map((m) => {
        if (!m.eta || !m.currentActivityId) return null
        
        const activity = activities[m.currentActivityId]
        if (!activity) return null
        
        // Get destination location
        const toLocId = activity.plan?.location?.to_location_id
        const toLoc = toLocId ? locations[toLocId] : null
        if (!toLoc) return null
        
        // Calculate bearing and wedge
        const bearing = calculateBearing(m.lat, m.lon, toLoc.lat, toLoc.lon)
        const wedge = createWedgePolygon(m.lat, m.lon, bearing, 45, 3) // 45° arc, 3km
        
        // Color by ETA urgency
        const hoursRemaining =
          (new Date(m.eta).getTime() - Date.now()) / 3600000
        const color =
          hoursRemaining < 2
            ? '#dc2626' // red
            : hoursRemaining < 6
            ? '#eab308' // yellow
            : '#22c55e' // green
        
        return (
          <Polygon
            key={m.trId}
            positions={wedge}
            pathOptions={{
              color,
              fillColor: color,
              fillOpacity: 0.25,
              weight: 2,
            }}
          />
        )
      })}
    </>
  )
}
```

### Testing
- `lib/map/__tests__/wedgeUtils.test.ts`
  - `calculateBearing()` for cardinal directions
  - `createWedgePolygon()` point count and apex
- Visual test: wedge pointing from Mina Zayed to AGI

### Acceptance Criteria
- [ ] Wedges visible for TRs with ETA data
- [ ] Color reflects urgency (red/yellow/green)
- [ ] Direction points toward destination
- [ ] Toggles on/off via MapLegend checkbox
- [ ] No overlap with TR markers (z-index correct)
- [ ] `pnpm lint && pnpm typecheck` passes

---

## SSOT Compliance Checklist

### Read-Only Operations
- ✅ Geofence: Reads `locations` from SSOT
- ✅ Heatmap: Reads `activities` + `locations` from SSOT
- ✅ ETA Wedge: Reads `activities` + `locations` + derived `eta` from SSOT

### No Mutations
- ✅ All features use derived data
- ✅ No changes to `option_c_v0.8.0.json`
- ✅ No Apply actions (visualization only)

### History/Audit
- ✅ No history events generated (read-only layers)

---

## Quality Gates

### Per-Phase Gates
1. **Lint**: `pnpm lint` (0 warnings)
2. **Type**: `pnpm typecheck` (0 errors)
3. **Test**: `pnpm test` (new tests pass)
4. **Build**: `pnpm build` (success)
5. **SSOT**: `validate_optionc.py` (PASS)

### Final Gate
- All 3 phases complete
- All toggles functional
- No performance regression
- Visual regression test pass
- Documentation updated

---

## Rollback Plan

If any phase fails:
1. Revert feature files (GeofenceLayer, etc.)
2. Revert MapContent/MapPanel/MapLegend changes
3. Re-run quality gates
4. Document failure reason in `docs/plan/map-enhancement-issues.md`

---

## Documentation Updates

After completion:
- Update `docs/LAYOUT.md` with new map features
- Add screenshots to `docs/screenshots/map-layers/`
- Update `CHANGELOG.md` with feature additions

---

## Timeline

- **Week 1**: Phase 1 (Geofence)
- **Week 2**: Phase 2 (Heatmap)
- **Week 3**: Phase 3 (ETA Wedge)

Total: 3 weeks part-time (10-13 hours)

---

**Approved by:** agent-orchestrator  
**Plan Generated:** 2026-02-04  
**Target Completion:** 2026-02-25
