# Location Map Improvement Plan

**Date**: 2026-02-04
**Planner**: tr-planner (agent-orchestrator)
**Goal**: Improve Location Map to answer "Where" question more clearly
**Scope**: MapPanel, MapContent, MapLegend components

---

## 1. Executive Summary

### Current Strengths
- ✅ TR markers with state-based colors (patch.md §4.1)
- ✅ Collision indication (blocking=red outline, warning=yellow)
- ✅ Route segments with highlight support
- ✅ Key locations (Mina Zayed, AGI) with custom icons
- ✅ MapLegend component with TR status & collision legend
- ✅ Heat layer for key locations
- ✅ SSOT integration via `calculateCurrentActivityForTR`/`calculateCurrentLocationForTR`

### Critical Gaps (Why "Where" is not clear enough)
1. ❌ **Visual Hierarchy**: All TR markers look equal → hard to identify "current" position
2. ❌ **Context Information**: Tooltips show only TR ID + status → missing activity/ETA
3. ❌ **Map ↔ Timeline Sync**: `selectedActivityId` not strongly reflected on map
4. ❌ **Geofences/Zones**: No visual boundary for Yard/Jetty/Sea → spatial context missing
5. ❌ **Route Status**: Segments don't show progress (planned/in-progress/completed)
6. ❌ **Mobile UX**: Fixed height 280px, no touch optimization

---

## 2. Priority Matrix (P0/P1/P2)

### P0 (Core "Where" Clarity) - Must-Have
| Item | Current Issue | Improvement | Impact |
|------|---------------|-------------|--------|
| **TR Marker Emphasis** | All markers same size/style | Pulsing animation + size for `in_progress` | **High** - Immediate visual answer to "Where is TR now?" |
| **Rich Tooltips** | Only `label (status)` | + Current Activity name + ETA + Location name | **High** - Contextual "Where" information |
| **Map ↔ Timeline Highlight** | Weak sync (only `selectedActivityId`) | Bidirectional highlight: Map marker ↔ Timeline activity bar | **High** - Cross-panel consistency |
| **Route Progress** | All segments same color | Color segments by status (planned=gray, in_progress=blue, completed=green) | **Medium** - Visual journey progress |

### P1 (Enhanced Context) - Should-Have
| Item | Current Issue | Improvement | Impact |
|------|---------------|-------------|--------|
| **Geofences** | No zone visualization | Add translucent polygons for Yard/Jetty/Sea areas | **Medium** - Spatial boundaries |
| **Location Labels** | Only on hover (Popup) | Persistent labels for key nodes (size-responsive) | **Medium** - Always-visible reference |
| **Activity Tooltip** | N/A | Click TR marker → show current activity card (inline on map) | **Medium** - 1-click activity details |
| **Zoom/Pan Controls** | Default Leaflet only | Add custom "+/-" buttons + "Fit All" button | **Low** - UX polish |

### P2 (Advanced/Future) - Nice-to-Have
| Item | Current Issue | Improvement | Impact |
|------|---------------|-------------|--------|
| **Responsive Height** | Fixed 280px | Dynamic height based on viewport (min 280px, max 600px) | **Low** - Better mobile experience |
| **Mini-Map** | N/A | Add minimap overlay (optional toggle) | **Low** - Navigation aid |
| **ETA Prediction** | N/A | Show animated "ghost marker" for predicted next position | **Low** - Forward-looking view |
| **Historical Trail** | N/A | Show TR's past route as dotted line | **Low** - Journey visualization |

---

## 3. Component Architecture

### 3.1 Current Structure (No Change)
```
MapPanelWrapper (SSOT fetch + ViewModeStore)
  ├─ MapPanel (logic: trMarkers, routeSegments, locations)
  │   ├─ MapContent (Leaflet rendering)
  │   └─ MapLegend (status/collision legend)
```

### 3.2 Proposed Enhancements (Incremental)

#### Phase 1 (P0 - Core Improvements)
**Files to Modify**:
1. `components/map/MapContent.tsx`
   - Add pulsing animation to `in_progress` TR markers
   - Enhance Popup content (rich tooltip)
   - Add route segment coloring logic

2. `components/map/MapPanel.tsx`
   - Enhance `trMarkers` data structure (add `activityName`, `eta`, `locationName`)
   - Add `routeSegments` status calculation (planned/in_progress/completed)
   - Improve highlight sync logic (bidirectional)

3. `src/lib/map-status-colors.ts`
   - Add `ROUTE_STATUS_COLORS` for segment coloring

**New Files**:
- `components/map/TRMarkerTooltip.tsx` (optional, for reusable tooltip content)

#### Phase 2 (P1 - Enhanced Context)
**Files to Modify**:
1. `components/map/MapContent.tsx`
   - Add `<Polygon>` layer for geofences
   - Add persistent labels via Leaflet `divIcon` (non-Popup)

2. `components/map/MapPanel.tsx`
   - Add `geofences` data (hardcoded or from SSOT)
   - Add `persistentLabels` logic

**New Files**:
- `components/map/GeofenceLayer.tsx` (optional, encapsulate polygon logic)
- `components/map/CustomZoomControl.tsx` (optional, custom controls)

#### Phase 3 (P2 - Advanced Features)
- Deferred to future work (dynamic height, minimap, ETA prediction, historical trail)

---

## 4. Data Flow & State Management

### 4.1 Existing State (MapPanel Props)
```typescript
type MapPanelProps = {
  ssot: OptionC | null
  selectedTripId?: string | null
  selectedTrIds?: string[]
  selectedActivityId?: string | null  // ← Highlight sync key
  highlightedRouteId?: string | null
  riskOverlay?: 'none' | 'all' | 'wx' | 'resource' | 'permit'
  viewMode?: ViewMode
  onTrClick?: (trId: string) => void
  onActivitySelect?: (activityId: string) => void
}
```

### 4.2 Enhanced Data Structures (Derived in MapPanel)

#### trMarkers (Enhanced)
```typescript
type TRMarker = {
  trId: string
  lat: number
  lon: number
  status: MapStatusToken
  hasBlockingCollision: boolean
  hasWarningCollision: boolean
  label: string
  // NEW:
  currentActivityName: string | null
  currentActivityId: string | null
  locationName: string | null
  eta: string | null  // ISO timestamp or null
  isHighlighted: boolean  // ← Sync with selectedActivityId
}
```

#### routeSegments (Enhanced)
```typescript
type RouteSegment = {
  routeId: string
  coords: [number, number][]
  activityId: string
  isHighlighted: boolean
  // NEW:
  status: 'planned' | 'in_progress' | 'completed'  // ← Route progress
  trId: string
}
```

#### geofences (New)
```typescript
type Geofence = {
  geofence_id: string
  name: string
  type: 'yard' | 'jetty' | 'sea' | 'restricted'
  polygon: [number, number][]  // lat/lon coordinates
  color: string  // Fill color
  opacity: number
}
```

### 4.3 Calculation Logic (MapPanel)

**TR Marker Highlight**:
```typescript
const isHighlighted = useMemo(() => {
  if (!selectedActivityId) return false
  const activity = activities[selectedActivityId]
  return activity?.tr_ids?.includes(trId) ?? false
}, [selectedActivityId, trId, activities])
```

**Route Segment Status**:
```typescript
const status = useMemo(() => {
  const activity = activities[activityId]
  if (!activity) return 'planned'
  
  if (activity.actual.end_ts) return 'completed'
  if (activity.actual.start_ts) return 'in_progress'
  return 'planned'
}, [activityId, activities])
```

**ETA Calculation** (from SSOT):
```typescript
const eta = useMemo(() => {
  const activity = activities[currentActivityId]
  if (!activity) return null
  
  // If in progress, use plan.end_ts (or calc.ef_ts)
  if (activity.actual.start_ts && !activity.actual.end_ts) {
    return activity.plan.end_ts || activity.calc.ef_ts
  }
  
  return null
}, [currentActivityId, activities])
```

---

## 5. Visual Design Spec (patch.md §4.1 Compliance)

### 5.1 TR Markers (Enhanced)

#### Default State
- **Size**: 32x32px (current)
- **Border**: 2px white (current)
- **Color**: per `MAP_STATUS_HEX` (current)

#### `in_progress` State (NEW)
- **Size**: 36x36px (larger)
- **Animation**: Pulsing scale (1.0 → 1.1 → 1.0, 2s cycle)
- **Border**: 3px glowing white
- **Z-index**: Higher (front layer)

#### Collision Indicators (Current)
- **Blocking**: 3px red outline (`#dc2626`)
- **Warning**: 3px yellow outline (`#eab308`)

#### Highlighted State (NEW)
- **Border**: 3px cyan (`#22d3ee`)
- **Shadow**: 0 0 12px rgba(34, 211, 238, 0.6)

### 5.2 Route Segments (Enhanced)

**Current**:
- `isHighlighted=true`: color=#2563eb (blue), weight=4
- `isHighlighted=false`: color=#64748b (gray), weight=2

**NEW (Status-Based)**:
```typescript
const ROUTE_STATUS_STYLES = {
  planned: { color: '#9ca3af', weight: 2, opacity: 0.6 },      // Gray
  in_progress: { color: '#3b82f6', weight: 4, opacity: 0.9 }, // Blue
  completed: { color: '#22c55e', weight: 2, opacity: 0.8 },   // Green
}
```

**Highlight Override**:
- If `isHighlighted=true`, add dashed style (`dashArray: '10, 5'`) + cyan color override

### 5.3 Rich Tooltip Design

**Current** (Popup):
```html
<Popup>
  <strong>TR-01</strong> <span>(in_progress)</span>
</Popup>
```

**NEW** (Enhanced Popup):
```html
<Popup className="tr-marker-tooltip">
  <div class="font-semibold text-base">TR-01</div>
  <div class="text-sm text-muted-foreground">Mina Zayed Port</div>
  <div class="mt-1 text-xs">
    <span class="font-medium">Activity:</span> SPMT Load & Secure
  </div>
  <div class="text-xs text-yellow-400">
    <span class="font-medium">ETA:</span> Feb 3, 14:00 (2h remaining)
  </div>
  <div class="mt-2 flex gap-1">
    <span class="badge badge-blue">in_progress</span>
    {hasBlockingCollision && <span class="badge badge-red">blocked</span>}
  </div>
</Popup>
```

**Styling** (`app/globals.css` addition):
```css
.leaflet-popup-content {
  margin: 8px 12px !important;
  min-width: 200px;
}

.tr-marker-tooltip .badge {
  @apply px-2 py-0.5 text-[10px] rounded font-medium;
}
.tr-marker-tooltip .badge-blue {
  @apply bg-blue-500/20 text-blue-300 border border-blue-500/30;
}
.tr-marker-tooltip .badge-red {
  @apply bg-red-500/20 text-red-300 border border-red-500/30;
}
```

### 5.4 Geofences (P1)

**Visual Style**:
```typescript
const GEOFENCE_STYLES = {
  yard: { fillColor: '#22c55e', fillOpacity: 0.1, color: '#22c55e', weight: 2 },
  jetty: { fillColor: '#06b6d4', fillOpacity: 0.1, color: '#06b6d4', weight: 2 },
  sea: { fillColor: '#3b82f6', fillOpacity: 0.05, color: '#3b82f6', weight: 1 },
  restricted: { fillColor: '#ef4444', fillOpacity: 0.15, color: '#ef4444', weight: 2, dashArray: '5, 5' },
}
```

**Label Placement** (centroid of polygon):
```typescript
<Marker position={centroid} icon={L.divIcon({
  className: 'geofence-label',
  html: `<div class="text-xs text-white/60 font-medium">${name}</div>`,
  iconSize: [80, 20],
  iconAnchor: [40, 10],
})} />
```

---

## 6. Implementation Steps (Detailed)

### Phase 1 (P0) - Estimated: 4 tasks

#### Task 1.1: Enhanced TR Marker Data (MapPanel.tsx)
**File**: `components/map/MapPanel.tsx`

**Changes**:
```typescript
// Inside trMarkers useMemo:
const currentActivityId = calculateCurrentActivityForTR(ssot!, trId)
const activity = currentActivityId ? activities[currentActivityId] : null
const loc = locId ? locations[locId] : null

result.push({
  trId,
  lat: loc.lat,
  lon: loc.lon,
  status,
  hasBlockingCollision: hasBlocking,
  hasWarningCollision: hasWarning,
  label: tr?.name ?? trId,
  // NEW:
  currentActivityName: activity?.name || null,
  currentActivityId,
  locationName: loc?.name || null,
  eta: activity?.plan?.end_ts || activity?.calc?.ef_ts || null,
  isHighlighted: selectedActivityId ? activity?.activity_id === selectedActivityId : false,
})
```

**Test**:
- Verify `trMarkers` includes new fields
- Check `eta` format (ISO 8601)

---

#### Task 1.2: Route Segment Status (MapPanel.tsx)
**File**: `components/map/MapPanel.tsx`

**Changes**:
```typescript
// Inside routeSegments useMemo:
for (const activity of Object.values(activities)) {
  const loc = activity.plan?.location
  if (!loc?.route_id) continue

  const key = `${loc.from_location_id}-${loc.to_location_id}-${loc.route_id}`
  if (seen.has(key)) continue
  seen.add(key)

  const coords = getRoutePolyline(locations, loc.from_location_id, loc.to_location_id)
  if (coords.length < 2) continue

  // NEW: Calculate status
  let status: 'planned' | 'in_progress' | 'completed' = 'planned'
  if (activity.actual.end_ts) {
    status = 'completed'
  } else if (activity.actual.start_ts) {
    status = 'in_progress'
  }

  result.push({
    routeId: loc.route_id,
    coords,
    activityId: activity.activity_id,
    isHighlighted:
      highlightedRouteId === loc.route_id || selectedActivityId === activity.activity_id,
    // NEW:
    status,
    trId: activity.tr_ids?.[0] || '',
  })
}
```

**Test**:
- Verify status calculation for in-progress, completed activities

---

#### Task 1.3: Pulsing Animation + Rich Tooltip (MapContent.tsx)
**File**: `components/map/MapContent.tsx`

**Changes**:

1. **Add CSS animation** (in `app/globals.css`):
```css
@keyframes pulse-marker {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 0 8px rgba(59, 130, 246, 0.6);
  }
  50% {
    transform: scale(1.1);
    box-shadow: 0 0 16px rgba(59, 130, 246, 0.9);
  }
}

.tr-marker-pulse {
  animation: pulse-marker 2s ease-in-out infinite;
}
```

2. **Update TR marker rendering**:
```typescript
{trMarkers.map((m) => {
  const bgColor = mapStatusHex[m.status] ?? '#64748b'
  const outlineColor = m.hasBlockingCollision
    ? '#dc2626'
    : m.hasWarningCollision
    ? '#eab308'
    : m.isHighlighted
    ? '#22d3ee'
    : 'white'
  const outlineWidth = m.hasBlockingCollision || m.hasWarningCollision || m.isHighlighted ? 3 : 2
  
  // NEW: Size and pulse for in_progress
  const size = m.status === 'in_progress' ? 36 : 32
  const pulseClass = m.status === 'in_progress' ? 'tr-marker-pulse' : ''

  const icon = L.divIcon({
    className: `tr-marker ${pulseClass}`,
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${bgColor};border:${outlineWidth}px solid ${outlineColor};display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.4);color:white;font-size:10px;font-weight:bold;">${m.trId.slice(-3)}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })

  return (
    <Marker
      key={m.trId}
      position={[m.lat, m.lon]}
      icon={icon}
      eventHandlers={{
        click: () => onTrMarkerClick(m.trId),
      }}
    >
      <Popup>
        {/* NEW: Rich tooltip */}
        <div className="tr-marker-tooltip">
          <div className="font-semibold text-base">{m.label}</div>
          <div className="text-sm text-muted-foreground">{m.locationName || 'Unknown Location'}</div>
          {m.currentActivityName && (
            <div className="mt-1 text-xs">
              <span className="font-medium">Activity:</span> {m.currentActivityName}
            </div>
          )}
          {m.eta && (
            <div className="text-xs text-yellow-400">
              <span className="font-medium">ETA:</span> {new Date(m.eta).toLocaleString()}
            </div>
          )}
          <div className="mt-2 flex gap-1">
            <span className={`badge badge-${m.status === 'in_progress' ? 'blue' : 'gray'}`}>
              {m.status}
            </span>
            {m.hasBlockingCollision && <span className="badge badge-red">blocked</span>}
          </div>
        </div>
      </Popup>
    </Marker>
  )
})}
```

**Test**:
- Visual check: pulsing animation on `in_progress` markers
- Tooltip check: verify all new fields display correctly

---

#### Task 1.4: Route Segment Coloring (MapContent.tsx)
**File**: `components/map/MapContent.tsx`

**Changes**:
```typescript
const ROUTE_STATUS_STYLES = {
  planned: { color: '#9ca3af', weight: 2, opacity: 0.6 },
  in_progress: { color: '#3b82f6', weight: 4, opacity: 0.9 },
  completed: { color: '#22c55e', weight: 2, opacity: 0.8 },
}

{routeSegments.map((seg) => {
  const baseStyle = ROUTE_STATUS_STYLES[seg.status]
  const style = seg.isHighlighted
    ? { ...baseStyle, color: '#22d3ee', weight: 4, dashArray: '10, 5' }
    : baseStyle

  return (
    <Polyline
      key={`${seg.routeId}-${seg.activityId}`}
      positions={seg.coords}
      pathOptions={style}
    />
  )
})}
```

**Test**:
- Visual check: planned=gray, in_progress=blue, completed=green
- Highlight check: dashed cyan when selected

---

### Phase 2 (P1) - Estimated: 3 tasks

#### Task 2.1: Geofence Data (MapPanel.tsx)
**File**: `components/map/MapPanel.tsx`

**Add geofences constant** (hardcoded for now, can move to SSOT later):
```typescript
const GEOFENCES: Geofence[] = [
  {
    geofence_id: 'GF_YARD',
    name: 'Mina Zayed Yard',
    type: 'yard',
    polygon: [
      [24.530, 54.375],
      [24.535, 54.375],
      [24.535, 54.380],
      [24.530, 54.380],
    ],
    color: '#22c55e',
    opacity: 0.1,
  },
  {
    geofence_id: 'GF_JETTY_AGI',
    name: 'AGI Jetty',
    type: 'jetty',
    polygon: [
      [24.838, 53.656],
      [24.844, 53.656],
      [24.844, 53.661],
      [24.838, 53.661],
    ],
    color: '#06b6d4',
    opacity: 0.1,
  },
]
```

**Pass to MapContent**:
```typescript
<MapContent
  // ... existing props
  geofences={GEOFENCES}
/>
```

---

#### Task 2.2: Geofence Layer (MapContent.tsx)
**File**: `components/map/MapContent.tsx`

**Add Polygon layer**:
```typescript
import { Polygon } from 'react-leaflet'

export function MapContent({ ..., geofences }) {
  return (
    <MapContainer ...>
      <TileLayer ... />
      {heatPoints.length > 0 && <HeatLayer heatPoints={heatPoints} />}

      {/* NEW: Geofences */}
      {geofences.map((gf) => (
        <Polygon
          key={gf.geofence_id}
          positions={gf.polygon}
          pathOptions={{
            fillColor: gf.color,
            fillOpacity: gf.opacity,
            color: gf.color,
            weight: 2,
          }}
        />
      ))}

      {/* Route polylines ... */}
      {/* Location markers ... */}
      {/* TR markers ... */}
    </MapContainer>
  )
}
```

**Test**:
- Visual check: translucent polygons for Yard, Jetty
- No performance impact (small polygon count)

---

#### Task 2.3: Persistent Labels (MapContent.tsx)
**File**: `components/map/MapContent.tsx`

**Add divIcon labels for geofences** (at centroid):
```typescript
function calculateCentroid(polygon: [number, number][]): [number, number] {
  const lat = polygon.reduce((sum, p) => sum + p[0], 0) / polygon.length
  const lon = polygon.reduce((sum, p) => sum + p[1], 0) / polygon.length
  return [lat, lon]
}

{geofences.map((gf) => {
  const centroid = calculateCentroid(gf.polygon)
  const labelIcon = L.divIcon({
    className: 'geofence-label',
    html: `<div class="text-xs text-white/60 font-medium uppercase tracking-wide">${gf.name}</div>`,
    iconSize: [100, 20],
    iconAnchor: [50, 10],
  })

  return (
    <Fragment key={gf.geofence_id}>
      <Polygon ... />
      <Marker position={centroid} icon={labelIcon} />
    </Fragment>
  )
})}
```

**Add CSS** (in `app/globals.css`):
```css
.geofence-label {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  text-align: center;
  pointer-events: none;
}
```

**Test**:
- Labels appear at polygon centers
- No click interference (pointer-events: none)

---

## 7. SSOT Integration & Validation

### 7.1 SSOT Dependencies (Read-Only)
- `entities.trs`: TR metadata
- `entities.activities`: Activity plan/actual/state
- `entities.locations`: Location coordinates
- `collisions`: Collision data
- **Derived**: `calculateCurrentActivityForTR`, `calculateCurrentLocationForTR` (from `src/lib/derived-calc.ts`)

### 7.2 No SSOT Mutations
- All map changes are **visual only** (no writes to option_c.json)
- Interactions (click TR → select activity) trigger **parent callbacks** (`onTrClick`, `onActivitySelect`)
- Parent (page.tsx) handles state updates

### 7.3 Validation Steps
1. **Data Integrity**: Verify `trMarkers` match SSOT TR count
2. **Location Accuracy**: Check lat/lon match `LOCATION_OVERRIDES` and SSOT locations
3. **State Sync**: Confirm `selectedActivityId` → highlight → TR marker border change
4. **Collision Display**: Verify collision badges match `activity.calc.collision_ids`

---

## 8. Performance Considerations

### 8.1 Rendering Optimization
- **Current**: `useMemo` for `trMarkers`, `routeSegments`, `locations`
- **NEW**: No additional re-renders (geofences are static)
- **Leaflet**: Dynamic marker updates handled by React-Leaflet (efficient)

### 8.2 Animation Performance
- Pulsing animation is **CSS-only** (no JavaScript)
- Limited to `in_progress` markers only (~1-2 concurrent)
- No performance impact expected

### 8.3 Mobile Considerations
- Current fixed height (280px) is acceptable for Phase 1
- P2 task for dynamic height (deferred)
- Touch events: Leaflet handles by default (no custom changes needed)

---

## 9. Testing Plan

### 9.1 Unit Tests (Optional for P0, Recommended for P1)
- Test `calculateCentroid` function (geofence labels)
- Test route status calculation logic
- Test marker highlight logic

### 9.2 Visual Regression Tests
- Screenshot comparison: before/after for each marker status
- Route segment colors: planned/in_progress/completed
- Geofence rendering: check polygon + label alignment

### 9.3 Integration Tests
- **Map ↔ Timeline Sync**:
  1. Click activity in Timeline → verify TR marker highlighted
  2. Click TR marker → verify Timeline scrolls to activity
- **Collision Display**:
  1. Activity with blocking collision → red outline on marker
  2. Activity with warning collision → yellow outline

### 9.4 Manual QA Checklist
- [ ] All 7 TRs visible on map (Mina Zayed → AGI route)
- [ ] `in_progress` markers pulse (animation)
- [ ] Rich tooltip shows: TR name, location, activity, ETA, badges
- [ ] Route segments colored correctly (gray/blue/green)
- [ ] Highlighted route is cyan + dashed
- [ ] Geofences (Yard, Jetty) visible with labels
- [ ] Map legend matches new colors
- [ ] No console errors
- [ ] Mobile: map is touch-scrollable, tooltips work on tap

---

## 10. Rollout Strategy

### Phase 1 (P0) - Week 1
**Target**: Core "Where" clarity improvements
- Deploy Tasks 1.1-1.4 as single PR
- QA in dev environment
- Production rollout after verification

### Phase 2 (P1) - Week 2
**Target**: Enhanced context (geofences, labels)
- Deploy Tasks 2.1-2.3 as separate PR
- Validate geofence accuracy with operations team
- Iterate on label positioning if needed

### Phase 3 (P2) - Future
**Target**: Advanced features (deferred)
- Dynamic height, minimap, ETA prediction, historical trail
- Prioritize based on user feedback from Phase 1/2

---

## 11. Success Metrics

### Quantitative
- **"Where" Time-to-Answer**: Target <3 seconds (from Story Header + Map)
- **Map ↔ Timeline Sync Rate**: >95% accuracy (highlight consistency)
- **Mobile Usability**: No touch event failures

### Qualitative
- **User Feedback**: "Map clearly shows TR current position and journey progress"
- **Ops Team**: "Geofences help understand spatial context"
- **DoD Compliance**: patch.md §4.1 Map colors/legend rules maintained

---

## 12. Dependencies & Risks

### Dependencies
- ✅ SSOT (`option_c.json`) must have valid `locations`, `activities`, `trs`
- ✅ `derived-calc.ts` functions (`calculateCurrentActivityForTR`, etc.) must be stable
- ✅ Leaflet library (react-leaflet) already installed

### Risks
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Geofence coordinates inaccurate | Medium | Medium | Validate with ops team, use satellite imagery |
| Animation performance on low-end devices | Low | Low | CSS-only animation, limited to 1-2 markers |
| Map ↔ Timeline sync breaks on edge cases | Medium | High | Add integration tests, QA with full scenario |
| SSOT changes break map data | Low | High | Add validation layer in MapPanel, fallback to safe defaults |

---

## 13. Next Steps (Handoff to tr-implementer)

### tr-implementer Tasks
1. Read this plan
2. Implement Phase 1 (P0) tasks 1.1-1.4
3. Run lint, typecheck, test (if exists)
4. Verify no SSOT mutations
5. Test Map ↔ Timeline highlight sync
6. Output: Updated Map components + PR description

### Verification Criteria (for tr-verifier)
- All P0 tasks complete and functional
- No SSOT violations
- No regressions in MapLegend or existing features
- Visual QA checklist pass
- lint/typecheck/test/build pass

---

## 14. References

### Docs
- [AGENTS.md](../../AGENTS.md) - §5 UI 레이아웃 불변조건
- [patch.md](../../patch.md) - §4.1 Map (Where) 규칙
- [docs/LAYOUT.md](../LAYOUT.md) - §6.3 Map Section
- [option_c.json](../../option_c.json) - SSOT locations/activities/trs

### Code
- `components/map/MapPanel.tsx` - 현재 로직
- `components/map/MapContent.tsx` - Leaflet 렌더링
- `components/map/MapLegend.tsx` - 범례
- `src/lib/map-status-colors.ts` - 색상 규칙
- `src/lib/derived-calc.ts` - TR/Activity 계산

---

**Plan Status**: ✅ Complete
**Ready for Implementation**: Yes
**Estimated Effort**: Phase 1 (P0) = 4 tasks, ~6-8 hours
