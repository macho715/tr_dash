'use client'

import { useEffect, useState } from 'react'
import type { OptionC } from '@/src/types/ssot'
import { useViewModeOptional } from '@/src/lib/stores/view-mode-store'
import type { RiskOverlay, ViewMode } from '@/src/lib/stores/view-mode-store'
import { MapPanel } from './MapPanel'
import { MapPanelSkeleton } from '@/components/dashboard/skeletons/MapPanelSkeleton'

export function preloadMapPanel(): Promise<unknown> {
  return import('./MapPanel')
}

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
  const [isLoading, setIsLoading] = useState(ssotProp === undefined)
  const viewModeCtx = useViewModeOptional()
  const riskOverlay: RiskOverlay = viewModeCtx?.state.riskOverlay ?? 'none'
  const viewMode: ViewMode = viewModeCtx?.state.mode ?? 'live'

  const ssot = ssotProp !== undefined ? ssotProp : internalSsot

  useEffect(() => {
    let cancelled = false
    if (ssotProp !== undefined) {
      setIsLoading(false)
      return () => {
        cancelled = true
      }
    }
    setIsLoading(true)
    setError(null)
    fetch('/api/ssot')
      .then((res) => {
        if (!res.ok) throw new Error(`SSOT fetch failed: ${res.status}`)
        return res.json()
      })
      .then((data: OptionC) => {
        if (!cancelled) setInternalSsot(data)
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          const message = e instanceof Error ? e.message : 'SSOT fetch failed'
          setError(message)
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
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

  if (ssotProp === undefined && isLoading && !internalSsot) {
    return <MapPanelSkeleton />
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
