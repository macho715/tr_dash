"use client"

import { useMemo } from "react"
import type { ScheduleActivity } from "@/lib/ssot/schedule"
import { toUtcNoon } from "@/lib/ssot/schedule"
import { voyages } from "@/lib/dashboard-data"

type Props = {
  activities: ScheduleActivity[]
  onVoyageClick?: (voyageIndex: number) => void
  onActivityClick?: (activityId: string) => void
}

type TrStatus = {
  voyage: number
  trUnit: string
  currentActivity: ScheduleActivity | null
  completedCount: number
  totalCount: number
  nextActivity: ScheduleActivity | null
  status: "completed" | "in_progress" | "upcoming" | "blocked"
}

const STATUS_COLORS: Record<TrStatus["status"], { bg: string; text: string; dot: string }> = {
  completed: { bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-400" },
  in_progress: { bg: "bg-cyan-500/10", text: "text-cyan-400", dot: "bg-cyan-400 animate-pulse" },
  upcoming: { bg: "bg-slate-500/10", text: "text-slate-400", dot: "bg-slate-500" },
  blocked: { bg: "bg-red-500/10", text: "text-red-400", dot: "bg-red-400 animate-pulse" },
}

const STATUS_LABELS: Record<TrStatus["status"], string> = {
  completed: "Complete",
  in_progress: "Active",
  upcoming: "Upcoming",
  blocked: "Blocked",
}

export function ActivityStatusBoard({ activities, onVoyageClick, onActivityClick }: Props) {
  const trStatuses = useMemo(() => {
    const now = toUtcNoon(new Date())
    const result: TrStatus[] = []

    for (const v of voyages) {
      const trActivities = activities
        .filter(
          (a) =>
            a.activity_id !== null &&
            a.level1?.includes(`Unit ${v.voyage}`)
        )
        .sort(
          (a, b) =>
            new Date(a.planned_start).getTime() - new Date(b.planned_start).getTime()
        )

      const total = trActivities.length
      const done = trActivities.filter((a) => a.status === "done").length
      const inProg = trActivities.find((a) => a.status === "in_progress")
      const blocked = trActivities.find((a) => a.status === "blocked")
      const nextPlanned = trActivities.find(
        (a) =>
          a.status !== "done" &&
          a.status !== "in_progress" &&
          new Date(a.planned_start).getTime() >= now.getTime()
      )

      let status: TrStatus["status"] = "upcoming"
      if (done === total && total > 0) status = "completed"
      else if (blocked) status = "blocked"
      else if (inProg) status = "in_progress"

      result.push({
        voyage: v.voyage,
        trUnit: v.trUnit,
        currentActivity: inProg || blocked || null,
        completedCount: done,
        totalCount: total,
        nextActivity: nextPlanned || null,
        status,
      })
    }
    return result
  }, [activities])

  return (
    <div className="rounded-xl border border-accent/20 bg-card/80 p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3">TR Status Board</h3>
      <div className="space-y-1.5">
        {trStatuses.map((tr) => {
          const colors = STATUS_COLORS[tr.status]
          const pct = tr.totalCount > 0 ? Math.round((tr.completedCount / tr.totalCount) * 100) : 0
          return (
            <button
              key={tr.voyage}
              type="button"
              onClick={() => {
                if (tr.currentActivity?.activity_id) {
                  onActivityClick?.(tr.currentActivity.activity_id)
                } else {
                  onVoyageClick?.(tr.voyage - 1)
                }
              }}
              className={`w-full rounded-lg ${colors.bg} border border-transparent hover:border-accent/30 px-3 py-2 text-left transition-colors`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${colors.dot}`} />
                  <span className="text-xs font-semibold text-foreground">
                    V{tr.voyage}
                  </span>
                  <span className="text-[10px] text-slate-400">{tr.trUnit}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-semibold ${colors.text}`}>
                    {STATUS_LABELS[tr.status]}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    {tr.completedCount}/{tr.totalCount}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-1.5 h-1 w-full rounded-full bg-slate-800/60 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    background:
                      tr.status === "completed"
                        ? "rgb(34, 197, 94)"
                        : tr.status === "blocked"
                          ? "rgb(239, 68, 68)"
                          : "rgb(6, 182, 212)",
                  }}
                />
              </div>

              {/* Current activity info */}
              {tr.currentActivity && (
                <div className="mt-1 text-[10px] text-slate-400 truncate">
                  Now: {tr.currentActivity.activity_id}: {tr.currentActivity.activity_name}
                </div>
              )}
              {!tr.currentActivity && tr.nextActivity && tr.status === "upcoming" && (
                <div className="mt-1 text-[10px] text-slate-500 truncate">
                  Next: {tr.nextActivity.activity_id}: {tr.nextActivity.activity_name} ({tr.nextActivity.planned_start})
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
