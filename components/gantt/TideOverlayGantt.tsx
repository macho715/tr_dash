"use client"

import React, { useEffect, useMemo, useState } from "react"
import { addDays } from "date-fns"
import { Gantt, ViewMode, type Task } from "gantt-task-react"
import "gantt-task-react/dist/index.css"
import { toast } from "sonner"
import { scheduleActivities } from "@/lib/data/schedule-data"
import {
  buildTideWindows,
  buildShiftDayWhatIf,
  fetchTideData,
  findNearestSafeSlot,
  summarizeTideCoverage,
  validateTaskSafety,
  type TideSafeSlotSuggestion,
  type TaskSafetyResult,
  type TideShiftWhatIf,
  type TideSafetyStatus,
  type TideTaskInput,
  type TideWindow,
} from "@/lib/services/tideService"

export interface TideOverlayGanttProps {
  className?: string
  debug?: boolean
}

const TIDE_RULE = {
  workStartHour: 6,
  workEndHour: 17,
  safeHeightThreshold: 1.8,
  minConsecutiveSafeHours: 2,
}

const TIDE_TASK_COLORS: Record<
  TideSafetyStatus,
  {
    backgroundColor: string
    backgroundSelectedColor: string
    progressColor: string
    progressSelectedColor: string
  }
> = {
  SAFE: {
    backgroundColor: "#2E7D32",
    backgroundSelectedColor: "#388E3C",
    progressColor: "#66BB6A",
    progressSelectedColor: "#81C784",
  },
  DANGER: {
    backgroundColor: "#B71C1C",
    backgroundSelectedColor: "#C62828",
    progressColor: "#EF5350",
    progressSelectedColor: "#E57373",
  },
  CLOSED: {
    backgroundColor: "#455A64",
    backgroundSelectedColor: "#546E7A",
    progressColor: "#90A4AE",
    progressSelectedColor: "#B0BEC5",
  },
}

function cn(...parts: Array<string | null | undefined | false>): string {
  return parts.filter(Boolean).join(" ")
}

function isValidDate(date: Date): boolean {
  return Number.isFinite(date.getTime())
}

function toNoonUtcDate(isoDate: string): Date | null {
  const parsed = new Date(`${isoDate}T12:00:00Z`)
  return isValidDate(parsed) ? parsed : null
}

function normalizeTaskRange(start: Date, end: Date): { start: Date; end: Date } {
  if (end.getTime() > start.getTime()) {
    return { start, end }
  }
  return {
    start,
    end: addDays(start, 1),
  }
}

function toTideTaskInput(task: Task): TideTaskInput {
  return {
    id: task.id,
    name: task.name,
    start: task.start,
    end: task.end,
  }
}

function statusClassName(status: TideSafetyStatus): string {
  if (status === "SAFE") return "tide-safe"
  if (status === "DANGER") return "tide-danger"
  return "tide-closed"
}

class GanttErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback
    }
    return this.props.children
  }
}

function buildBaseTasks(): Task[] {
  const tasks: Task[] = []
  for (const [index, activity] of scheduleActivities.entries()) {
    if (!activity.activity_id || !activity.planned_start || !activity.planned_finish) {
      continue
    }
    const id = activity.activity_id
    const start = toNoonUtcDate(activity.planned_start)
    const rawEnd = toNoonUtcDate(activity.planned_finish)
    if (!start || !rawEnd) {
      continue
    }

    const { end } = normalizeTaskRange(start, addDays(rawEnd, 1))
    tasks.push({
      id,
      name: activity.activity_name || id,
      type: "task",
      start,
      end,
      progress: activity.status === "done" ? 100 : activity.status === "in_progress" ? 50 : 0,
      displayOrder: index,
    })
  }
  return tasks
}

function TideFallbackList({
  tasks,
  safetyByTaskId,
  title,
}: {
  tasks: Task[]
  safetyByTaskId: Record<string, TaskSafetyResult>
  title: string
}) {
  return (
    <div className="rounded-lg border border-accent/20 bg-card/70 p-4">
      <p className="mb-3 text-xs text-muted-foreground">{title}</p>
      <div className="max-h-64 overflow-auto rounded-md border border-accent/10">
        <table className="w-full text-left text-xs">
          <thead className="bg-background/70 text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Task</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Reasons</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => {
              const result = safetyByTaskId[task.id]
              return (
                <tr key={task.id} className="border-t border-accent/10">
                  <td className="px-3 py-2">{task.name}</td>
                  <td className={cn("px-3 py-2 font-semibold", `task-${result?.status.toLowerCase() ?? "closed"}`)}>
                    {result?.status ?? "CLOSED"}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {result?.reasons.join(", ") ?? "NO_WORK_WINDOW_HOURS"}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TideStrip({ windows }: { windows: TideWindow[] }) {
  const grouped = useMemo(() => {
    const byDate = new Map<string, Map<number, TideWindow>>()
    for (const window of windows) {
      if (!byDate.has(window.date)) {
        byDate.set(window.date, new Map<number, TideWindow>())
      }
      byDate.get(window.date)?.set(window.hour, window)
    }

    return Array.from(byDate.entries())
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .map(([date, byHour]) => {
        const hours: TideWindow[] = []
        for (let hour = TIDE_RULE.workStartHour; hour <= TIDE_RULE.workEndHour; hour += 1) {
          const existing = byHour.get(hour)
          hours.push(
            existing ?? {
              date,
              hour,
              height: 0,
              status: "CLOSED",
              inWorkWindow: true,
            }
          )
        }
        return { date, hours }
      })
  }, [windows])

  if (grouped.length === 0) return null

  return (
    <div data-testid="tide-strip" className="mb-4 max-h-56 overflow-auto rounded-lg border border-accent/20 bg-background/40 p-2">
      <div className="space-y-2">
        {grouped.map((entry) => (
          <div key={entry.date} className="flex items-center gap-3">
            <div className="w-24 shrink-0 text-[11px] font-mono text-muted-foreground">{entry.date}</div>
            <div className="grid flex-1 grid-cols-12 gap-1">
              {entry.hours.map((window) => (
                <div
                  key={`${entry.date}-${window.hour}`}
                  className={cn("h-4 rounded-sm", statusClassName(window.status))}
                  title={`${window.date} ${String(window.hour).padStart(2, "0")}:00 • ${window.status} • ${window.height.toFixed(2)}m`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SummaryChip({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded-full border border-accent/30 bg-background/60 px-2.5 py-1 font-mono text-xs text-foreground">
      {label} {value}
    </span>
  )
}

function formatUtcDateTime(value: Date): string {
  return value.toISOString().slice(0, 16).replace("T", " ") + "Z"
}

type DangerGuidanceState = {
  taskId: string
  taskName: string
  safety: TaskSafetyResult
  nearestSafe: TideSafeSlotSuggestion | null
  whatIf: TideShiftWhatIf[]
  source: "auto" | "manual"
}

export function TideOverlayGantt({ className, debug = false }: TideOverlayGanttProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [windows, setWindows] = useState<TideWindow[]>([])
  const [ganttTasks, setGanttTasks] = useState<Task[]>(() => buildBaseTasks())
  const [dangerGuidance, setDangerGuidance] = useState<DangerGuidanceState | null>(null)
  const [guidancePinned, setGuidancePinned] = useState(false)
  const [guidanceTaskId, setGuidanceTaskId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetchTideData()
      .then((response) => {
        if (cancelled) return
        const built = buildTideWindows(response.days, TIDE_RULE)
        setWindows(built)
      })
      .catch((fetchError) => {
        if (cancelled) return
        setError(fetchError instanceof Error ? fetchError.message : "Failed to load tide data")
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!guidanceTaskId && ganttTasks[0]) {
      setGuidanceTaskId(ganttTasks[0].id)
    }
  }, [guidanceTaskId, ganttTasks])

  const safetyByTaskId = useMemo(() => {
    const result: Record<string, TaskSafetyResult> = {}
    for (const task of ganttTasks) {
      result[task.id] = validateTaskSafety(toTideTaskInput(task), windows, TIDE_RULE)
    }
    return result
  }, [ganttTasks, windows])

  const tasksWithStatus = useMemo(() => {
    return ganttTasks.map((task) => {
      const safety = safetyByTaskId[task.id]
      const status = safety?.status ?? "CLOSED"
      return {
        ...task,
        styles: TIDE_TASK_COLORS[status],
      }
    })
  }, [ganttTasks, safetyByTaskId])

  const coverage = useMemo(() => {
    return summarizeTideCoverage(
      ganttTasks.map((task) => toTideTaskInput(task)),
      windows,
      TIDE_RULE
    )
  }, [ganttTasks, windows])

  const TooltipContent = useMemo(() => {
    function TideTooltip({
      task,
      fontSize,
      fontFamily,
    }: {
      task: Task
      fontSize: string
      fontFamily: string
    }) {
      const safety = safetyByTaskId[task.id]
      return (
        <div
          className="rounded-md border border-accent/30 bg-slate-950/95 p-2 text-xs text-slate-100 shadow-lg"
          style={{ fontSize, fontFamily }}
        >
          <div className="font-semibold">{task.name}</div>
          <div className="mt-1 text-[11px] text-slate-300">Status: {safety?.status ?? "CLOSED"}</div>
          <div className="mt-1 text-[11px] text-slate-400">
            Reasons: {safety?.reasons.join(", ") ?? "NO_WORK_WINDOW_HOURS"}
          </div>
        </div>
      )
    }
    return TideTooltip
  }, [safetyByTaskId])

  const buildGuidance = (
    task: Task,
    safety: TaskSafetyResult,
    source: DangerGuidanceState["source"]
  ): DangerGuidanceState => ({
    taskId: task.id,
    taskName: task.name,
    safety,
    nearestSafe: findNearestSafeSlot(toTideTaskInput(task), windows, TIDE_RULE),
    whatIf: buildShiftDayWhatIf(toTideTaskInput(task), windows, [1, 2], TIDE_RULE),
    source,
  })

  const handleOpenGuidance = () => {
    const selectedTask =
      (guidanceTaskId ? ganttTasks.find((task) => task.id === guidanceTaskId) : null) ??
      ganttTasks[0]
    if (!selectedTask) return

    const safety = validateTaskSafety(toTideTaskInput(selectedTask), windows, TIDE_RULE)
    setDangerGuidance(buildGuidance(selectedTask, safety, "manual"))
    setGuidancePinned(true)
  }

  const handleHideGuidance = () => {
    setDangerGuidance(null)
    setGuidancePinned(false)
  }

  const handleDateChange = async (changedTask: Task) => {
    const normalized = normalizeTaskRange(changedTask.start, changedTask.end)
    const nextTask: Task = {
      ...changedTask,
      start: normalized.start,
      end: normalized.end,
    }

    const safety = validateTaskSafety(toTideTaskInput(nextTask), windows, TIDE_RULE)
    setGuidanceTaskId(nextTask.id)

    setGanttTasks((prev) => prev.map((task) => (task.id === nextTask.id ? nextTask : task)))

    if (safety.status === "DANGER") {
      const guidance = buildGuidance(nextTask, safety, "auto")
      setDangerGuidance(guidance)
      setGuidancePinned(false)

      const whatIfSummary = guidance.whatIf
        .map((option) => `+${option.shiftDays}d ${option.safety.status}`)
        .join(", ")
      const nearestSummary = guidance.nearestSafe
        ? `Nearest SAFE: ${formatUtcDateTime(guidance.nearestSafe.start)} (+${guidance.nearestSafe.shiftHours}h)`
        : "Nearest SAFE: not found in 14d horizon"
      toast.warning(`${nextTask.name}: unsafe tide window`, {
        description: `${nearestSummary} | What-if: ${whatIfSummary}`,
      })
    } else if (guidancePinned) {
      setDangerGuidance(buildGuidance(nextTask, safety, "manual"))
    } else {
      setDangerGuidance(null)
    }

    return true
  }

  const applyGuidanceWindow = (taskId: string, start: Date, end: Date) => {
    setGanttTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              start,
              end,
            }
          : task
      )
    )

    const nextTask = ganttTasks.find((task) => task.id === taskId)
    const candidateTask: Task = {
      ...(nextTask ?? { id: taskId, name: taskId, type: "task", progress: 0 }),
      id: taskId,
      name: nextTask?.name ?? taskId,
      start,
      end,
    } as Task
    const nextSafety = validateTaskSafety(toTideTaskInput(candidateTask), windows, TIDE_RULE)
    setGuidanceTaskId(taskId)

    if (nextSafety.status !== "DANGER" && !guidancePinned) {
      setDangerGuidance(null)
      return
    }
    setDangerGuidance(buildGuidance(candidateTask, nextSafety, guidancePinned ? "manual" : "auto"))
  }

  if (loading) {
    return (
      <div className={cn("rounded-xl border border-accent/20 bg-card/90 p-5", className)}>
        <div className="animate-pulse text-sm text-muted-foreground">Loading tide overlay Gantt...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn("rounded-xl border border-destructive/40 bg-destructive/10 p-5", className)}>
        <p className="text-sm text-destructive">{error}</p>
        <TideFallbackList
          tasks={ganttTasks}
          safetyByTaskId={safetyByTaskId}
          title="Tide API unavailable. Showing static safety fallback."
        />
      </div>
    )
  }

  return (
    <section className={cn("rounded-xl border border-accent/20 bg-card/90 p-4", className)}>
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Tide Overlay Gantt (UTC)</h2>
          <p className="text-xs text-muted-foreground">
            SAFE if height &gt;= 1.8m and at least 2 consecutive work-window hours (06:00-17:00).
          </p>
        </div>
        <div className="flex items-center gap-1.5" data-testid="tide-summary-chip">
          <SummaryChip label="SAFE" value={coverage.safe} />
          <SummaryChip label="DANGER" value={coverage.danger} />
          <SummaryChip label="CLOSED" value={coverage.closed} />
        </div>
      </header>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label htmlFor="tide-guidance-task" className="text-xs text-muted-foreground">
          Guidance task
        </label>
        <select
          id="tide-guidance-task"
          data-testid="tide-guidance-task-select"
          value={guidanceTaskId ?? ""}
          onChange={(event) => setGuidanceTaskId(event.target.value || null)}
          className="rounded border border-accent/30 bg-background/70 px-2 py-1 text-xs text-foreground"
        >
          {ganttTasks.map((task) => (
            <option key={task.id} value={task.id}>
              {task.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          data-testid="open-tide-guidance"
          onClick={handleOpenGuidance}
          className="rounded border border-cyan-400/40 bg-cyan-500/15 px-2 py-1 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/25"
        >
          View guidance
        </button>
        {dangerGuidance ? (
          <button
            type="button"
            data-testid="hide-tide-guidance"
            onClick={handleHideGuidance}
            className="rounded border border-slate-400/40 bg-slate-500/15 px-2 py-1 text-xs font-semibold text-slate-100 hover:bg-slate-500/25"
          >
            Hide
          </button>
        ) : null}
      </div>

      <TideStrip windows={windows} />
      {dangerGuidance ? (
        <section
          data-testid="tide-danger-guidance"
          className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3"
        >
          <p className="text-xs font-semibold text-amber-200">
            {dangerGuidance.safety.status === "DANGER"
              ? `DANGER detected: ${dangerGuidance.taskName}`
              : `Guidance: ${dangerGuidance.taskName} (${dangerGuidance.safety.status})`}
          </p>
          <p className="mt-1 text-[11px] text-amber-100/90">
            Source: {dangerGuidance.source === "auto" ? "auto (drag validation)" : "manual (button)"} •
            reasons: {dangerGuidance.safety.reasons.join(", ")}
          </p>
          {dangerGuidance.nearestSafe ? (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-amber-100">
              <span>
                Nearest SAFE slot: {formatUtcDateTime(dangerGuidance.nearestSafe.start)} (
                +{dangerGuidance.nearestSafe.shiftHours}h)
              </span>
              <button
                type="button"
                data-testid="apply-nearest-safe"
                onClick={() => {
                  const suggestion = dangerGuidance.nearestSafe
                  if (!suggestion) return
                  applyGuidanceWindow(dangerGuidance.taskId, suggestion.start, suggestion.end)
                }}
                className="rounded border border-emerald-400/40 bg-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-100 hover:bg-emerald-500/30"
              >
                Apply nearest SAFE
              </button>
            </div>
          ) : (
            <p className="mt-2 text-xs text-amber-100">
              No SAFE slot found within next 14 days.
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {dangerGuidance.whatIf.map((option) => (
              <span
                key={`${dangerGuidance.taskId}-${option.shiftDays}`}
                data-testid={`whatif-${option.shiftDays}d`}
                className={cn(
                  "inline-flex items-center gap-2 rounded border px-2 py-1",
                  option.safety.status === "SAFE"
                    ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-100"
                    : option.safety.status === "DANGER"
                      ? "border-red-400/40 bg-red-500/15 text-red-100"
                      : "border-slate-400/30 bg-slate-500/15 text-slate-100"
                )}
              >
                <span>
                  +{option.shiftDays}d {option.safety.status}
                </span>
                <button
                  type="button"
                  data-testid={`apply-whatif-${option.shiftDays}d`}
                  onClick={() =>
                    applyGuidanceWindow(dangerGuidance.taskId, option.start, option.end)
                  }
                  className="rounded border border-current/40 px-1.5 py-0.5 text-[10px] font-semibold hover:bg-white/10"
                >
                  Apply
                </button>
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <GanttErrorBoundary
        fallback={
          <TideFallbackList
            tasks={ganttTasks}
            safetyByTaskId={safetyByTaskId}
            title="Gantt rendering failed. Showing fail-soft table fallback."
          />
        }
      >
        <div data-testid="tide-overlay-gantt">
          <Gantt
            tasks={tasksWithStatus}
            viewMode={ViewMode.Day}
            onDateChange={handleDateChange}
            listCellWidth="320px"
            columnWidth={48}
            rowHeight={38}
            ganttHeight={560}
            TooltipContent={TooltipContent}
          />
        </div>
      </GanttErrorBoundary>

      {debug ? (
        <details className="mt-4 rounded-md border border-accent/20 bg-background/50 p-2 text-xs">
          <summary className="cursor-pointer font-semibold text-foreground">Debug: Tide runs</summary>
          <pre data-testid="tide-debug-json" className="mt-2 max-h-56 overflow-auto text-[11px] text-muted-foreground">
            {JSON.stringify(
              windows
                .filter((window) => window.safeRunId || window.inWorkWindow)
                .map((window) => ({
                  date: window.date,
                  hour: window.hour,
                  height: window.height,
                  status: window.status,
                  safeRunId: window.safeRunId,
                })),
              null,
              2
            )}
          </pre>
        </details>
      ) : null}
    </section>
  )
}
