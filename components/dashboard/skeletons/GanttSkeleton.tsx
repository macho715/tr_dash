"use client"

const BAR_WIDTHS = ["78%", "62%", "88%", "54%", "70%", "81%"]

export function GanttSkeleton() {
  return (
    <div
      className="min-h-[400px] rounded-lg border border-accent/20 bg-card/40 p-4"
      data-testid="gantt-skeleton"
      aria-label="Gantt loading skeleton"
    >
      <div className="mb-4 grid grid-cols-7 gap-2">
        {Array.from({ length: 7 }).map((_, idx) => (
          <div key={idx} className="h-4 animate-pulse rounded bg-slate-700/35" />
        ))}
      </div>
      <div className="space-y-3">
        {BAR_WIDTHS.map((width, idx) => (
          <div key={idx} className="rounded-md border border-accent/10 bg-slate-900/20 px-3 py-2">
            <div
              className="h-5 animate-pulse rounded bg-cyan-600/25"
              style={{ width }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
