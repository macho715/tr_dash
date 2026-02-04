'use client'

import { MAP_STATUS_HEX } from '@/src/lib/map-status-colors'
import type { MapStatusToken } from '@/src/lib/map-status-colors'

const STATUS_LABELS: Record<MapStatusToken, string> = {
  planned: 'Planned',
  ready: 'Ready',
  in_progress: 'In progress',
  completed: 'Completed',
  blocked: 'Blocked',
  delayed: 'Delayed',
}

/** Map legend for TR status colors and collision badges (patch §4.1) */
export function MapLegend() {
  return (
    <div
      className="absolute bottom-2 left-2 z-[1000] rounded-md border border-accent/30 bg-card/90 px-2 py-1.5 text-xs backdrop-blur-sm"
      data-testid="map-legend"
    >
      <div className="mb-1 font-semibold text-muted-foreground">TR Status</div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {(Object.keys(STATUS_LABELS) as MapStatusToken[]).map((token) => (
          <div key={token} className="flex items-center gap-1">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: MAP_STATUS_HEX[token] }}
              aria-hidden
            />
            <span className="text-muted-foreground">{STATUS_LABELS[token]}</span>
          </div>
        ))}
      </div>
      <div className="mt-1.5 border-t border-accent/20 pt-1 font-semibold text-muted-foreground">
        Collision
      </div>
      <div className="flex gap-2 text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full border-2 border-red-600" aria-hidden />
          Blocking
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full border-2 border-yellow-500" aria-hidden />
          Warning
        </span>
      </div>
    </div>
  )
}
