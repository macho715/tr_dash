"use client"

import type { ScheduleActivity } from "@/lib/ssot/schedule"

type GanttListFallbackProps = {
  activities: ScheduleActivity[]
  selectedActivityId?: string | null
}

export function GanttListFallback({
  activities,
  selectedActivityId = null,
}: GanttListFallbackProps) {
  const rows = activities.slice(0, 10)

  return (
    <div
      className="min-h-[280px] rounded-lg border border-dashed border-amber-500/40 bg-amber-500/5 p-4"
      data-testid="gantt-list-fallback"
      aria-label="Gantt fail-soft fallback"
    >
      <div className="mb-3 text-sm font-semibold text-amber-300">
        Gantt unavailable, showing activity table
      </div>
      <div className="overflow-hidden rounded-md border border-accent/10">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900/60 text-slate-300">
            <tr>
              <th className="px-2 py-1">ID</th>
              <th className="px-2 py-1">Activity</th>
              <th className="px-2 py-1">Start</th>
              <th className="px-2 py-1">Finish</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((activity) => {
              const isSelected = selectedActivityId === activity.activity_id
              return (
                <tr
                  key={activity.activity_id}
                  className={isSelected ? "bg-cyan-500/10 text-cyan-200" : "bg-slate-900/20 text-slate-200"}
                >
                  <td className="px-2 py-1 font-mono">{activity.activity_id}</td>
                  <td className="px-2 py-1">{activity.activity_name}</td>
                  <td className="px-2 py-1 font-mono">{activity.planned_start.slice(0, 10)}</td>
                  <td className="px-2 py-1 font-mono">{activity.planned_finish.slice(0, 10)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
