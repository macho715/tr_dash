"use client"

export function MapPanelSkeleton() {
  return (
    <div
      className="rounded-lg border border-accent/20 bg-card/50 p-3"
      data-testid="map-panel-skeleton"
      aria-label="Map loading skeleton"
    >
      <div className="grid min-h-[280px] grid-cols-[1fr_120px] gap-3">
        <div className="relative overflow-hidden rounded-md border border-accent/10 bg-slate-900/40">
          <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-slate-700/30 via-cyan-900/10 to-slate-700/30" />
          <div className="absolute left-3 top-3 h-8 w-8 rounded-md bg-slate-700/40" />
          <div className="absolute left-3 top-14 h-8 w-8 rounded-md bg-slate-700/30" />
        </div>
        <div className="space-y-2 rounded-md border border-accent/10 bg-slate-900/30 p-2">
          <div className="h-3 w-16 animate-pulse rounded bg-slate-600/40" />
          <div className="h-7 w-full animate-pulse rounded bg-slate-700/30" />
          <div className="h-7 w-full animate-pulse rounded bg-slate-700/30" />
          <div className="h-7 w-full animate-pulse rounded bg-slate-700/30" />
          <div className="h-7 w-full animate-pulse rounded bg-slate-700/30" />
        </div>
      </div>
    </div>
  )
}
