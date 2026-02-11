import { TideOverlayGantt } from "@/components/gantt/TideOverlayGantt"

export const metadata = {
  title: "Tide Overlay Gantt",
}

export default function TideGanttPage() {
  return (
    <main className="mx-auto w-full max-w-[1600px] p-4 md:p-6">
      <div className="mb-4 rounded-lg border border-accent/20 bg-card/70 p-4">
        <h1 className="text-lg font-semibold text-foreground">Tide-Overlay Gantt</h1>
        <p className="text-sm text-muted-foreground">
          Independent preview path for tide safety overlay. Baseline is compared against
          06:00-17:00 UTC work-window safety.
        </p>
      </div>

      <TideOverlayGantt debug={false} />

      <p className="mt-3 text-xs text-muted-foreground">
        If tide API is unavailable, page falls back to a fail-soft status table.
      </p>
    </main>
  )
}
