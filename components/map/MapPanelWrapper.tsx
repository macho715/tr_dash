'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import type { OptionC } from '@/src/types/ssot'
import { useViewModeOptional } from '@/src/lib/stores/view-mode-store'
import type { RiskOverlay, ViewMode } from '@/src/lib/stores/view-mode-store'

// Leaflet uses window - must load only on client
const MapPanel = dynamic(() => import('./MapPanel').then((m) => m.MapPanel), {
  ssr: false,
  loading: () => (
    <div
      className="flex h-[280px] items-center justify-center rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 text-sm text-muted-foreground"
      data-testid="map-panel-loading"
    >
      Loading map…
    </div>
  ),
})

type MapPanelWrapperProps = {
  /** When provided, no internal fetch; parent is SSOT source. */
  ssot?: OptionC | null
  selectedTripId?: string | null
  selectedTrIds?: string[]
  selectedActivityId?: string | null
  highlightedRouteId?: string | null
  selectedVoyageNo?: number | null
  hoveredVoyageNo?: number | null
  voyageEtaDriftByNo?: Record<number, number>
  onTrClick?: (trId: string) => void
  onActivitySelect?: (activityId: string) => void
  onCollisionClick?: (collisionId: string, activityId: string) => void
}

export function MapPanelWrapper({
  ssot: ssotProp,
  selectedTripId = null,
  selectedTrIds = [],
  selectedActivityId = null,
  highlightedRouteId = null,
  selectedVoyageNo = null,
  hoveredVoyageNo = null,
  voyageEtaDriftByNo,
  onTrClick,
  onActivitySelect,
  onCollisionClick,
}: MapPanelWrapperProps) {
  const [internalSsot, setInternalSsot] = useState<OptionC | null>(null)
  const [error, setError] = useState<string | null>(null)
  const viewModeCtx = useViewModeOptional()
  const riskOverlay: RiskOverlay = viewModeCtx?.state.riskOverlay ?? 'none'
  const viewMode: ViewMode = viewModeCtx?.state.mode ?? 'live'

  const ssot = ssotProp !== undefined ? ssotProp : internalSsot

  useEffect(() => {
    if (ssotProp !== undefined) return
    fetch('/api/ssot')
      .then((res) => {
        if (!res.ok) throw new Error(`SSOT fetch failed: ${res.status}`)
        return res.json()
      })
      .then((data: OptionC) => setInternalSsot(data))
      .catch((e) => setError(e.message))
  }, [ssotProp])

  if (error) {
    return (
      <div
        className="flex h-[280px] items-center justify-center rounded-lg border border-dashed border-red-300 bg-red-50 text-sm text-red-700"
        data-testid="map-panel-error"
      >
        {error}
      </div>
    )
  }

  return (
    <MapPanel
      ssot={ssot}
      selectedTripId={selectedTripId}
      selectedTrIds={selectedTrIds}
      selectedActivityId={selectedActivityId}
      highlightedRouteId={highlightedRouteId}
      selectedVoyageNo={selectedVoyageNo}
      hoveredVoyageNo={hoveredVoyageNo}
      voyageEtaDriftByNo={voyageEtaDriftByNo}
      riskOverlay={riskOverlay}
      viewMode={viewMode}
      onTrClick={onTrClick}
      onActivitySelect={onActivitySelect}
      onCollisionClick={onCollisionClick}
    />
  )
}
