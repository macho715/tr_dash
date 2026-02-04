'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
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
const MapLegend = dynamic(
  () => import('./MapLegend').then((m) => m.MapLegend),
  { ssr: false }
)

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
}

/** Verified coordinates: Mina Zayed (vesselfinder/AEMZD), Al Ghallan Island (Upper Zakum) */
const LOCATION_OVERRIDES: Record<string, Location> = {
  LOC_MZP: {
    location_id: 'LOC_MZP',
    name: 'Mina Zayed Port',
    lat: 24.5327093,
    lon: 54.3781822,
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
}: MapPanelProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const locations = useMemo(
    () => ({
      ...(ssot?.entities?.locations ?? {}),
      ...LOCATION_OVERRIDES,
    }),
    [ssot]
  )

  /** Heat points for Mina Port and AGI (lat, lon, intensity) */
  const heatPoints = useMemo(
    () => [
      [LOCATION_OVERRIDES.LOC_MZP.lat, LOCATION_OVERRIDES.LOC_MZP.lon, 1.0] as [number, number, number],
      [LOCATION_OVERRIDES.LOC_AGI.lat, LOCATION_OVERRIDES.LOC_AGI.lon, 1.0] as [number, number, number],
    ],
    []
  )

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

      result.push({
        trId,
        lat: loc.lat,
        lon: loc.lon,
        status,
        hasBlockingCollision: hasBlocking,
        hasWarningCollision: hasWarning,
        label: tr?.name ?? trId,
      })
    }
    return result
  }, [ssot, trs, locations, activities, collisions])

  // Route segments from activities with route_id
  const routeSegments = useMemo(() => {
    const seen = new Set<string>()
    const result: Array<{
      routeId: string
      coords: [number, number][]
      activityId: string
      isHighlighted: boolean
    }> = []

    for (const activity of Object.values(activities)) {
      const loc = activity.plan?.location
      if (!loc?.route_id) continue

      const key = `${loc.from_location_id}-${loc.to_location_id}-${loc.route_id}`
      if (seen.has(key)) continue
      seen.add(key)

      const coords = getRoutePolyline(locations, loc.from_location_id, loc.to_location_id)
      if (coords.length < 2) continue

      result.push({
        routeId: loc.route_id,
        coords,
        activityId: activity.activity_id,
        isHighlighted:
          highlightedRouteId === loc.route_id || selectedActivityId === activity.activity_id,
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
    <div className="relative h-[280px] w-full overflow-hidden rounded-lg" data-testid="map-panel">
      {mounted ? (
        <>
          <MapContent
            heatPoints={heatPoints}
            locations={locations}
            routeSegments={routeSegments}
            trMarkers={trMarkers}
            onTrMarkerClick={handleTrMarkerClick}
            mapStatusHex={MAP_STATUS_HEX}
          />
          <MapLegend />
        </>
      ) : (
        <div className="flex h-full w-full items-center justify-center rounded-lg bg-muted/20 text-sm text-muted-foreground">
          Loading map…
        </div>
      )}
    </div>
  )
}
