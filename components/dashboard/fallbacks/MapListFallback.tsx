"use client"

import type { OptionC } from "@/src/types/ssot"

type MapListFallbackProps = {
  ssot?: OptionC | null
  selectedActivityId?: string | null
}

export function MapListFallback({ ssot, selectedActivityId = null }: MapListFallbackProps) {
  const locations = Object.values(ssot?.entities?.locations ?? {}).slice(0, 8)
  const selectedActivity = selectedActivityId
    ? ssot?.entities?.activities?.[selectedActivityId]
    : null

  return (
    <div
      className="min-h-[280px] rounded-lg border border-dashed border-amber-500/40 bg-amber-500/5 p-4"
      data-testid="map-list-fallback"
      aria-label="Map fail-soft fallback"
    >
      <div className="mb-3 text-sm font-semibold text-amber-300">Map unavailable, showing location list</div>
      {selectedActivity && (
        <div className="mb-3 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          Selected activity: {selectedActivity.title ?? selectedActivity.activity_id}
        </div>
      )}
      {locations.length === 0 ? (
        <p className="text-xs text-muted-foreground">No locations loaded from SSOT.</p>
      ) : (
        <ul className="space-y-1 text-xs text-slate-200">
          {locations.map((location) => (
            <li
              key={location.location_id}
              className="rounded border border-accent/10 bg-slate-900/30 px-2 py-1"
            >
              <span className="font-medium">{location.name}</span>
              <span className="ml-2 text-muted-foreground">
                ({location.lat.toFixed(3)}, {location.lon.toFixed(3)})
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
