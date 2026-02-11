'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import type { OptionC, Location } from '@/src/types/ssot'
import { calculateCurrentActivityForTR, calculateCurrentLocationForTR } from '@/src/lib/derived-calc'
import { activityStateToMapStatus, MAP_STATUS_HEX } from '@/src/lib/map-status-colors'
import type { MapStatusToken } from '@/src/lib/map-status-colors'

// Single dynamic import for entire map - avoids appendChild race with TileLayer
const MapContent = dynamic(
  () => import('./MapContent').then((m) => m.MapContent),
  { ssr: false }
)

/** Incremented on unmount so Strict Mode remount gets a fresh container (avoids "Map container is being reused") */
let mapInstanceKey = 0

export type ViewMode = 'live' | 'history' | 'approval' | 'compare'

export type MapPanelProps = {
  ssot: OptionC | null
  selectedTripId?: string | null
  selectedTrIds?: string[]
  selectedActivityId?: string | null
  highlightedRouteId?: string | null
  riskOverlay?: 'none' | 'all' | 'wx' | 'resource' | 'permit'
  viewMode?: ViewMode
  onTrClick?: (trId: string) => void
  onActivitySelect?: (activityId: string) => void
  onCollisionClick?: (collisionId: string, activityId: string) => void
}

/** Verified coordinates: Mina Zayed (vesselfinder/AEMZD), Al Ghallan Island (Upper Zakum) */
const LOCATION_OVERRIDES: Record<string, Location> = {
  LOC_MZP: {
    location_id: 'LOC_MZP',
    name: 'Mina Zayed Port',
    lat: 24.524890,
    lon: 54.377980,
  },
  LOC_AGI: {
    location_id: 'LOC_AGI',
    name: 'AGI Jetty (Al Ghallan Island)',
    lat: 24.841096,
    lon: 53.658619,
  },
}

function getRoutePolyline(
  locations: Record<string, Location>,
  fromId: string,
  toId: string
): [number, number][] {
  const from = locations[fromId]
  const to = locations[toId]
  if (!from || !to) return []
  return [
    [from.lat, from.lon],
    [to.lat, to.lon],
  ]
}

export function MapPanel({
  ssot,
  selectedTripId = null,
  selectedTrIds = [],
  selectedActivityId = null,
  highlightedRouteId = null,
  riskOverlay = 'none',
  viewMode = 'live',
  onTrClick,
  onActivitySelect,
  onCollisionClick,
}: MapPanelProps) {
  const [mounted, setMounted] = useState(false)
  const [mapReady, setMapReady] = useState(false)
  const [mapContentVisible, setMapContentVisible] = useState(false)
  const [showHeatmapLegend] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // On unmount, bump key so next mount gets a fresh map container (avoids "Map container is being reused")
  useEffect(() => {
    return () => {
      mapInstanceKey += 1
    }
  }, [])

  // Defer Leaflet mount until container is in DOM and ref is set (avoids appendChild on undefined)
  useEffect(() => {
    if (!mounted) return
    let cancelled = false
    const tryReady = () => {
      if (cancelled) return
      if (containerRef.current) {
        setMapReady(true)
      } else {
        setTimeout(tryReady, 0)
      }
    }
    const t = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(tryReady, 0)
      })
    })
    return () => {
      cancelled = true
      cancelAnimationFrame(t)
    }
  }, [mounted])

  // Delay MapContent mount by two frames after mapReady so Leaflet's inner container ref is set (avoids appendChild on undefined).
  useEffect(() => {
    if (!mapReady) {
      setMapContentVisible(false)
      return
    }
    let cancelled = false
    let t2 = 0
    const t1 = requestAnimationFrame(() => {
      t2 = requestAnimationFrame(() => {
        if (!cancelled) setMapContentVisible(true)
      })
    })
    return () => {
      cancelled = true
      cancelAnimationFrame(t1)
      if (t2) cancelAnimationFrame(t2)
    }
  }, [mapReady])

  const locations = useMemo(
    () => ({
      ...(ssot?.entities?.locations ?? {}),
      ...LOCATION_OVERRIDES,
    }),
    [ssot]
  )

  /** Heat points with dynamic intensity based on activity density */
  const heatPoints = useMemo(() => {
    const result: [number, number, number][] = []
    const activities = ssot?.entities?.activities ?? {}

    for (const loc of Object.values(locations)) {
      // Count activities at this location (both from and to)
      const activityCount = Object.values(activities).filter(
        (a) =>
          a.plan?.location?.from_location_id === loc.location_id ||
          a.plan?.location?.to_location_id === loc.location_id
      ).length

      if (activityCount === 0) continue

      // Normalize: 1-10 activities → 0.2-1.0 intensity
      const intensity = Math.min(1.0, 0.2 + (activityCount / 10) * 0.8)

      result.push([loc.lat, loc.lon, intensity])
    }

    return result
  }, [locations, ssot])

  const trs = ssot?.entities?.trs ?? {}
  const activities = ssot?.entities?.activities ?? {}
  const collisions = ssot?.collisions ?? {}

  // TR markers: current position from derived calc
  const trMarkers = useMemo(() => {
    const result: Array<{
      trId: string
      lat: number
      lon: number
      status: MapStatusToken
      hasBlockingCollision: boolean
      hasWarningCollision: boolean
      label: string
      currentActivityName: string | null
      currentActivityId: string | null
      primaryCollisionId: string | null
      locationName: string | null
      eta: string | null
      isHighlighted: boolean
    }> = []

    for (const trId of Object.keys(trs)) {
      const tr = trs[trId]
      let locId = calculateCurrentLocationForTR(ssot!, trId)
      // Fallback: use SSOT calc or first activity's from_location
      if (!locId && tr?.calc?.current_location_id) {
        locId = tr.calc.current_location_id
      }
      if (!locId) {
        const acts = Object.values(activities).filter((a) => a.tr_ids?.includes(trId))
        const first = acts[0]
        if (first?.plan?.location?.from_location_id) {
          locId = first.plan.location.from_location_id
        }
      }
      const loc = locId ? locations[locId] : null
      if (!loc) continue

      const currentActivityId = calculateCurrentActivityForTR(ssot!, trId)
      const activity = currentActivityId ? activities[currentActivityId] : null
      const status = activity
        ? activityStateToMapStatus(activity.state)
        : ('planned' as MapStatusToken)

      let hasBlocking = false
      let hasWarning = false
      if (activity) {
        for (const colId of activity.calc.collision_ids) {
          const col = collisions[colId]
          if (col?.severity === 'blocking') hasBlocking = true
          if (col?.severity === 'warning') hasWarning = true
        }
      }

      // Calculate ETA: use plan.end_ts or calc.ef_ts for in-progress activities
      const eta =
        activity && activity.actual.start_ts && !activity.actual.end_ts
          ? activity.plan.end_ts || activity.calc.ef_ts
          : null

      result.push({
        trId,
        lat: loc.lat,
        lon: loc.lon,
        status,
        hasBlockingCollision: hasBlocking,
        hasWarningCollision: hasWarning,
        label: tr?.name ?? trId,
        currentActivityName: activity?.title || null,
        currentActivityId,
        primaryCollisionId: activity?.calc.collision_ids?.[0] ?? null,
        locationName: loc?.name || null,
        eta,
        isHighlighted: selectedActivityId ? activity?.activity_id === selectedActivityId : false,
      })
    }
    return result
  }, [ssot, trs, locations, activities, collisions, selectedActivityId])

  // Route segments from activities with route_id
  const routeSegments = useMemo(() => {
    const seen = new Set<string>()
    const result: Array<{
      routeId: string
      coords: [number, number][]
      activityId: string
      isHighlighted: boolean
      status: 'planned' | 'in_progress' | 'completed'
      trId: string
    }> = []

    for (const activity of Object.values(activities)) {
      const loc = activity.plan?.location
      if (!loc?.route_id) continue

      const key = `${loc.from_location_id}-${loc.to_location_id}-${loc.route_id}`
      if (seen.has(key)) continue
      seen.add(key)

      const coords = getRoutePolyline(locations, loc.from_location_id, loc.to_location_id)
      if (coords.length < 2) continue

      // Calculate status from activity actual timestamps
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
        status,
        trId: activity.tr_ids?.[0] || '',
      })
    }
    return result
  }, [activities, locations, highlightedRouteId, selectedActivityId])

  const isReadOnly = viewMode === 'history' || viewMode === 'approval'
  const handleTrMarkerClick = useCallback(
    (trId: string) => {
      if (isReadOnly) return
      onTrClick?.(trId)
      const currentActivityId = ssot ? calculateCurrentActivityForTR(ssot, trId) : null
      if (currentActivityId) {
        onActivitySelect?.(currentActivityId)
      }
    },
    [onTrClick, onActivitySelect, ssot, isReadOnly]
  )

  if (!ssot) {
    return (
      <div
        className="flex h-[280px] items-center justify-center rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 text-sm text-muted-foreground"
        data-testid="map-panel-placeholder"
      >
        Load SSOT to display map
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="relative h-[280px] w-full overflow-hidden rounded-lg"
      data-testid="map-panel"
    >
      {mounted && mapReady ? (
        <div key={mapInstanceKey} className="h-full w-full">
          {mapContentVisible ? (
            <MapContent
              heatPoints={heatPoints}
              locations={locations}
              routeSegments={routeSegments}
              trMarkers={trMarkers}
              onTrMarkerClick={handleTrMarkerClick}
              mapStatusHex={MAP_STATUS_HEX}
              showGeofence={false}
              showHeatmapLegend={showHeatmapLegend}
              onCollisionClick={onCollisionClick}
            />
          ) : null}
        </div>
      ) : (
        <div className="flex h-full w-full items-center justify-center rounded-lg bg-muted/20 text-sm text-muted-foreground">
          Loading map…
        </div>
      )}
    </div>
  )
}
