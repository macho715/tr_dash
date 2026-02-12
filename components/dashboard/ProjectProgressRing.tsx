"use client"

import { useMemo } from "react"
import type { ScheduleActivity } from "@/lib/ssot/schedule"
import type { SlackResult } from "@/lib/utils/slack-calc"
import { PROJECT_START, PROJECT_END, TOTAL_DAYS } from "@/lib/dashboard-data"
import { toUtcNoon } from "@/lib/ssot/schedule"

type Props = {
  activities: ScheduleActivity[]
  slackMap: Map<string, SlackResult>
  conflicts: { length: number }
}

function ProgressRing({
  value,
  max,
  size = 80,
  strokeWidth = 6,
  color,
  label,
  sublabel,
}: {
  value: number
  max: number
  size?: number
  strokeWidth?: number
  color: string
  label: string
  sublabel?: string
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const pct = max > 0 ? Math.min(value / max, 1) : 0
  const dashOffset = circumference * (1 - pct)

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(148, 163, 184, 0.15)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="text-center -mt-[calc(50%+12px)] mb-6">
        <div className="text-lg font-bold text-foreground">{Math.round(pct * 100)}%</div>
      </div>
      <div className="text-[11px] font-semibold text-slate-300 text-center">{label}</div>
      {sublabel && (
        <div className="text-[10px] text-slate-500 text-center">{sublabel}</div>
      )}
    </div>
  )
}

export function ProjectProgressRing({ activities, slackMap, conflicts }: Props) {
  const metrics = useMemo(() => {
    const leafs = activities.filter((a) => a.activity_id !== null)
    const total = leafs.length
    const done = leafs.filter((a) => a.status === "done").length
    const inProgress = leafs.filter((a) => a.status === "in_progress").length
    const blocked = leafs.filter((a) => a.status === "blocked").length

    // Time progress
    const now = toUtcNoon(new Date())
    const elapsed = Math.max(
      0,
      Math.floor((now.getTime() - PROJECT_START.getTime()) / (1000 * 60 * 60 * 24))
    )
    const timeProgress = Math.min(elapsed, TOTAL_DAYS)

    // Critical path activities
    let criticalCount = 0
    let totalSlack = 0
    let slackEntries = 0
    for (const [, result] of slackMap) {
      if (result.isCriticalPath) criticalCount++
      totalSlack += result.slackDays
      slackEntries++
    }
    const avgSlack = slackEntries > 0 ? Math.round(totalSlack / slackEntries) : 0

    return {
      total,
      done,
      inProgress,
      blocked,
      timeProgress,
      criticalCount,
      avgSlack,
      conflictCount: conflicts.length,
    }
  }, [activities, slackMap, conflicts])

  return (
    <div className="rounded-xl border border-accent/20 bg-card/80 p-4">
      <h3 className="text-sm font-semibold text-foreground mb-4">Project Health</h3>
      <div className="grid grid-cols-4 gap-4">
        <ProgressRing
          value={metrics.done}
          max={metrics.total}
          color="rgb(34, 197, 94)"
          label="Completion"
          sublabel={`${metrics.done}/${metrics.total}`}
        />
        <ProgressRing
          value={metrics.timeProgress}
          max={TOTAL_DAYS}
          color="rgb(34, 211, 238)"
          label="Time"
          sublabel={`D${metrics.timeProgress}/${TOTAL_DAYS}`}
        />
        <ProgressRing
          value={metrics.total - metrics.criticalCount}
          max={metrics.total}
          color={metrics.criticalCount > metrics.total * 0.3 ? "rgb(239, 68, 68)" : "rgb(251, 191, 36)"}
          label="CP Health"
          sublabel={`${metrics.criticalCount} critical`}
        />
        <ProgressRing
          value={Math.max(0, metrics.total - metrics.conflictCount)}
          max={metrics.total}
          color={metrics.conflictCount > 0 ? "rgb(249, 115, 22)" : "rgb(34, 197, 94)"}
          label="Conflict-Free"
          sublabel={`${metrics.conflictCount} conflicts`}
        />
      </div>

      {/* Summary stats row */}
      <div className="mt-4 grid grid-cols-4 gap-2 border-t border-accent/10 pt-3">
        <div className="text-center">
          <div className="text-xs font-mono text-emerald-400">{metrics.inProgress}</div>
          <div className="text-[9px] text-slate-500">In Progress</div>
        </div>
        <div className="text-center">
          <div className="text-xs font-mono text-red-400">{metrics.blocked}</div>
          <div className="text-[9px] text-slate-500">Blocked</div>
        </div>
        <div className="text-center">
          <div className="text-xs font-mono text-emerald-300">+{metrics.avgSlack}d</div>
          <div className="text-[9px] text-slate-500">Avg Slack</div>
        </div>
        <div className="text-center">
          <div className="text-xs font-mono text-red-300">{metrics.criticalCount}</div>
          <div className="text-[9px] text-slate-500">Critical</div>
        </div>
      </div>
    </div>
  )
}
