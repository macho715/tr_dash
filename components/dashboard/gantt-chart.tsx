"use client"

import React from "react"

import dynamic from "next/dynamic"
import { useEffect, useMemo, useRef, useState, forwardRef, useImperativeHandle } from "react"
import { Calendar } from "lucide-react"
import {
  legendItems,
  PROJECT_START,
  PROJECT_END,
  TOTAL_DAYS,
  type Activity,
  type ActivityType,
  activityTypeNames,
} from "@/lib/dashboard-data"
import { scheduleActivitiesToGanttRows } from "@/lib/data/schedule-data"
import { ganttRowsToVisDataCached } from "@/lib/gantt/visTimelineMapper"
import type { VisTimelineGanttHandle } from "@/components/gantt/VisTimelineGantt"
import { DependencyArrowsOverlay } from "@/components/gantt/DependencyArrowsOverlay"
import { WeatherOverlay } from "@/components/gantt/WeatherOverlay"

const VisTimelineGantt = dynamic(
  () =>
    import("@/components/gantt/VisTimelineGantt").then((m) => ({
      default: m.VisTimelineGantt,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[400px] items-center justify-center rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 text-sm text-muted-foreground">
        Loading Gantt…
      </div>
    ),
  }
)
import type { GanttEventBase } from "@/lib/gantt/gantt-contract"
import type {
  DateChange,
  ScheduleActivity,
  ScheduleConflict,
  ScheduleDependency,
} from "@/lib/ssot/schedule"
import type { WeatherDelayChange } from "@/lib/weather/weather-delay-preview"
import type { WeatherForecastData, WeatherLimits } from "@/lib/weather/weather-service"
import {
  parseDateInput,
  parseDateToNoonUtc,
  toUtcNoon,
  dateToIsoUtc,
} from "@/lib/ssot/schedule"
import {
  TimelineControls,
  type HighlightFlags,
  type TimelineView,
} from "@/components/dashboard/timeline-controls"
import { cn } from "@/lib/utils"
import { useDate } from "@/lib/contexts/date-context"
import {
  getConstraintBadges,
  getCollisionBadges,
  getConflictsForActivity,
  CONSTRAINT_BADGES,
  COLLISION_BADGES,
} from "@/lib/ssot/timeline-badges"
import type { CompareResult } from "@/lib/compare/types"
import { calculateSlack } from "@/lib/utils/slack-calc"
import { getLegendDefinition, type LegendDefinition } from "@/lib/gantt-legend-guide"
import { GanttLegendDrawer } from "@/components/dashboard/GanttLegendDrawer"

const MS_PER_DAY = 1000 * 60 * 60 * 24
const DAYS_PER_WEEK = 7

const activityColors: Record<ActivityType, string> = {
  mobilization: "bg-gradient-to-r from-violet-400 to-violet-500 shadow-violet-500/40",
  loadout: "bg-gradient-to-r from-cyan-300 to-cyan-500 shadow-cyan-500/40",
  transport: "bg-gradient-to-r from-amber-300 to-amber-500 shadow-amber-500/40",
  loadin: "bg-gradient-to-r from-emerald-300 to-emerald-500 shadow-emerald-500/40",
  turning: "bg-gradient-to-r from-pink-400 to-pink-500 shadow-pink-500/40",
  jackdown: "bg-gradient-to-r from-blue-400 to-blue-500 shadow-blue-500/40",
}

const legendColors: Record<string, string> = {
  mobilization: "bg-gradient-to-r from-violet-400 to-violet-500",
  loadout: "bg-gradient-to-r from-cyan-300 to-cyan-500",
  transport: "bg-gradient-to-r from-amber-300 to-amber-500",
  loadin: "bg-gradient-to-r from-emerald-300 to-emerald-500",
  turning: "bg-gradient-to-r from-pink-400 to-pink-500",
  jackdown: "bg-gradient-to-r from-blue-400 to-blue-500",
}

const DEPENDENCY_STYLES: Record<
  ScheduleDependency["type"],
  { stroke: string; dash: string | undefined; width: number; marker: string }
> = {
  FS: {
    stroke: "rgb(34 211 238)",
    dash: undefined,
    width: 0.45,
    marker: "arrow-fs",
  },
  SS: {
    stroke: "rgb(34 211 238)",
    dash: "4 2",
    width: 0.45,
    marker: "arrow-ss",
  },
  FF: {
    stroke: "rgb(6 182 212)",
    dash: undefined,
    width: 0.7,
    marker: "arrow-ff",
  },
  SF: {
    stroke: "rgb(251 146 60)",
    dash: "8 4",
    width: 0.45,
    marker: "arrow-sf",
  },
}

function calcPosition(
  startDate: string,
  endDate: string,
  view: TimelineView,
  totalUnits: number
) {
  const start = parseDateToNoonUtc(startDate) ?? PROJECT_START
  const end = parseDateToNoonUtc(endDate) ?? PROJECT_END
  const startDays =
    Math.floor((start.getTime() - PROJECT_START.getTime()) / MS_PER_DAY) + 1
  const duration =
    Math.floor((end.getTime() - start.getTime()) / MS_PER_DAY) + 1
  if (view === "Week") {
    const startWeeks = Math.floor((startDays - 1) / DAYS_PER_WEEK) + 1
    const durationWeeks = Math.max(1, Math.ceil(duration / DAYS_PER_WEEK))
    return {
      left: ((startWeeks - 1) / totalUnits) * 100,
      width: Math.max((durationWeeks / totalUnits) * 100, 3),
    }
  }
  return {
    left: ((startDays - 1) / totalUnits) * 100,
    width: Math.max((duration / totalUnits) * 100, 1.8),
  }
}

/** Format date for Gantt labels (UTC, Bug #1) */
function formatShortDateUtc(date: Date) {
  const month = String(date.getUTCMonth() + 1).padStart(2, "0")
  const day = String(date.getUTCDate()).padStart(2, "0")
  return `${month}-${day}`
}

interface TooltipState {
  visible: boolean
  x: number
  y: number
  activity: Activity | null
}

export interface GanttChartHandle {
  scrollToActivity: (activityId: string) => void
}

interface GanttChartProps {
  activities: ScheduleActivity[]
  view: TimelineView
  onViewChange: (view: TimelineView) => void
  highlightFlags: HighlightFlags
  onHighlightFlagsChange: (flags: HighlightFlags) => void
  jumpDate: string
  onJumpDateChange: (value: string) => void
  jumpTrigger?: number
  onJumpRequest?: () => void
  onActivityClick?: (activityId: string, start: string) => void
  /** Bug 3: 배경 클릭 시 선택 해제 */
  onActivityDeselect?: () => void
  conflicts?: ScheduleConflict[]
  onCollisionClick?: (conflict: ScheduleConflict) => void
  focusedActivityId?: string | null
  /** Phase 10: Compare mode delta for ghost bars */
  compareDelta?: CompareResult | null
  /** Live mode: reflow preview ghost bars (supports metadata) */
  reflowPreview?: {
    changes: DateChange[]
    metadata?: import("@/lib/gantt/visTimelineMapper").GhostBarMetadata
  } | DateChange[] | null
  /** Live mode: weather delay preview ghost bars */
  weatherPreview?: WeatherDelayChange[] | null
  /** Live mode: weather delay propagated ghost bars */
  weatherPropagated?: WeatherDelayChange[] | null
  /** Weather overlay data */
  weatherForecast?: WeatherForecastData
  weatherLimits?: WeatherLimits
  weatherOverlayVisible?: boolean
  weatherOverlayOpacity?: number
  /** Project end date for slack calculation (must match page.tsx for consistent DetailPanel/Gantt values) */
  projectEndDate: string
  /** GANTTPATCH2: Event stream (ITEM_SELECTED, GANTT_READY) */
  onGanttEvent?: (event: GanttEventBase) => void
}

export const GanttChart = forwardRef<GanttChartHandle, GanttChartProps>(function GanttChart(
  {
    activities,
    view,
    onViewChange,
    highlightFlags,
    onHighlightFlagsChange,
    jumpDate,
    onJumpDateChange,
    jumpTrigger = 0,
    onJumpRequest,
    onActivityClick,
    onActivityDeselect,
    conflicts = [],
    onCollisionClick,
    focusedActivityId,
    compareDelta,
    reflowPreview,
    weatherPreview,
    weatherPropagated,
    weatherForecast,
    weatherLimits,
    weatherOverlayVisible = false,
    weatherOverlayOpacity = 0.15,
    projectEndDate,
    onGanttEvent,
  },
  ref
) {
  const { selectedDate, setSelectedDate } = useDate()
  const [legendDrawerItem, setLegendDrawerItem] = useState<LegendDefinition | null>(null)
  const [collisionPopover, setCollisionPopover] = useState<{
    x: number
    y: number
    conflicts: ScheduleConflict[]
  } | null>(null)
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    activity: null,
  })
  const ganttContainerRef = useRef<HTMLDivElement>(null)
  const visContainerRef = useRef<HTMLDivElement>(null)
  const activityRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const visTimelineRef = useRef<VisTimelineGanttHandle>(null)
  const visRenderRaf = useRef<number | null>(null)
  const visRangeRaf = useRef<number | null>(null)
  const [visRenderTick, setVisRenderTick] = useState(0)
  const visRangeRef = useRef<{ start: Date; end: Date }>({
    start: PROJECT_START,
    end: PROJECT_END,
  })
  const [visRange, setVisRange] = useState(visRangeRef.current)
  const [weatherOverlayEnabled, setWeatherOverlayEnabled] = useState(
    weatherOverlayVisible
  )
  const [weatherOverlayOpacityValue, setWeatherOverlayOpacityValue] = useState(
    weatherOverlayOpacity
  )
  // AGENTS.md §5.1: VisTimelineGantt 필수 사용 (vis-timeline 기반)
  const raw = (process.env.NEXT_PUBLIC_GANTT_ENGINE || "vis").trim().toLowerCase()
  const useVisEngine = raw === "vis"
  const ganttRows = useMemo(
    () => scheduleActivitiesToGanttRows(activities),
    [activities]
  )
  const totalWeeks = Math.ceil(TOTAL_DAYS / DAYS_PER_WEEK)
  const totalUnits = view === "Day" ? TOTAL_DAYS : totalWeeks
  const unitWidth = view === "Day" ? 22 : 120
  const chartWidth = Math.max(1000, totalUnits * unitWidth)

  const activityMeta = useMemo(() => {
    const map = new Map<string, ScheduleActivity>()
    for (const activity of activities) {
      if (activity.activity_id) {
        map.set(activity.activity_id, activity)
      }
    }
    return map
  }, [activities])

  const slackMap = useMemo(
    () => calculateSlack(activities, projectEndDate),
    [activities, projectEndDate]
  )

  const { barPositions, dependencyEdges } = useMemo(() => {
    const positions = new Map<
      string,
      { rowIndex: number; left: number; width: number }
    >()
    const edges: {
      predId: string
      succId: string
      type: ScheduleDependency["type"]
      lagDays: number
    }[] = []
    ganttRows.forEach((row, rowIndex) => {
      row.activities?.forEach((activity) => {
        const refKey = activity.label.split(":")[0].trim()
        const pos = calcPosition(activity.start, activity.end, view, totalUnits)
        positions.set(refKey, { rowIndex, left: pos.left, width: pos.width })
        const meta = activityMeta.get(refKey)
        if (meta?.depends_on) {
          for (const d of meta.depends_on) {
            edges.push({
              predId: d.predecessorId,
              succId: refKey,
              type: d.type,
              lagDays: d.lagDays ?? 0,
            })
          }
        }
      })
    })
    const validEdges = edges.filter(
      (e) => positions.has(e.predId) && positions.has(e.succId)
    )
    return { barPositions: positions, dependencyEdges: validEdges }
  }, [activities, view, totalUnits, activityMeta])

  const dateMarks = useMemo(() => {
    const marks: string[] = []
    const step = view === "Day" ? 1 : DAYS_PER_WEEK
    const totalSteps = view === "Day" ? TOTAL_DAYS : totalWeeks
    for (let i = 0; i < totalSteps; i += 1) {
      const offset = i * step
      const date = new Date(PROJECT_START.getTime() + offset * MS_PER_DAY)
      marks.push(formatShortDateUtc(date))
    }
    return marks
  }, [view, totalWeeks])

  const getDatePosition = (date: Date) => {
    const noon = toUtcNoon(date)
    const daysFromStart =
      Math.floor((noon.getTime() - PROJECT_START.getTime()) / MS_PER_DAY) + 1
    if (view === "Week") {
      const weeksFromStart = Math.floor((daysFromStart - 1) / DAYS_PER_WEEK) + 1
      return Math.max(0, Math.min(100, ((weeksFromStart - 0.5) / totalUnits) * 100))
    }
    return Math.max(0, Math.min(100, ((daysFromStart - 0.5) / totalUnits) * 100))
  }

  const visData = useMemo(
    () =>
      ganttRowsToVisDataCached(ganttRows, compareDelta, {
        reflowPreview,
        weatherPreview,
        weatherPropagated,
      }),
    [ganttRows, compareDelta, reflowPreview, weatherPreview, weatherPropagated]
  )

  const scrollToActivity = (activityId: string) => {
    const normalizedId = activityId.split(":")[0].trim()
    if (useVisEngine) {
      visTimelineRef.current?.scrollToActivity(normalizedId)
      return
    }
    const el = activityRefs.current.get(normalizedId)
    if (!el) {
      for (const [key, value] of activityRefs.current.entries()) {
        const keyId = key.split(":")[0].trim()
        if (key.startsWith(normalizedId) || normalizedId.startsWith(keyId)) {
          value.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" })
          return
        }
      }
      return
    }
    el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" })
  }

  useImperativeHandle(ref, () => ({ scrollToActivity }), [])

  const selectedDatePosition = getDatePosition(selectedDate)

  useEffect(() => {
    activityRefs.current.clear()
  }, [ganttRows])

  useEffect(() => {
    return () => {
      if (visRenderRaf.current !== null) {
        cancelAnimationFrame(visRenderRaf.current)
        visRenderRaf.current = null
      }
      if (visRangeRaf.current !== null) {
        cancelAnimationFrame(visRangeRaf.current)
        visRangeRaf.current = null
      }
    }
  }, [])

  useEffect(() => {
    setWeatherOverlayEnabled(weatherOverlayVisible)
  }, [weatherOverlayVisible])

  useEffect(() => {
    setWeatherOverlayOpacityValue(weatherOverlayOpacity)
  }, [weatherOverlayOpacity])

  const scheduleVisRenderTick = () => {
    if (visRenderRaf.current !== null) return
    visRenderRaf.current = requestAnimationFrame(() => {
      visRenderRaf.current = null
      setVisRenderTick((prev) => prev + 1)
    })
  }

  const scheduleVisRangeUpdate = () => {
    if (visRangeRaf.current !== null) return
    visRangeRaf.current = requestAnimationFrame(() => {
      visRangeRaf.current = null
      setVisRange({ ...visRangeRef.current })
    })
  }

  const handleVisRangeChange = (range: { start: Date; end: Date }) => {
    visRangeRef.current = range
    scheduleVisRangeUpdate()
    scheduleVisRenderTick()
  }

  useEffect(() => {
    if (jumpTrigger === 0) return
    if (!jumpDate) return
    const parsed = parseDateInput(jumpDate)
    if (!parsed) return
    const clamped = new Date(
      Math.min(Math.max(parsed.getTime(), PROJECT_START.getTime()), PROJECT_END.getTime())
    )
    setSelectedDate(clamped)

    if (useVisEngine) {
      visTimelineRef.current?.moveToToday(clamped)
      return
    }

    const container = ganttContainerRef.current
    if (!container) return
    const content = container.firstElementChild as HTMLElement | null
    const contentWidth = content?.offsetWidth ?? container.scrollWidth
    const targetLeft = (getDatePosition(clamped) / 100) * contentWidth
    const nextScrollLeft = Math.max(0, targetLeft - container.clientWidth / 2)
    container.scrollTo({ left: nextScrollLeft, behavior: "smooth" })
    // Only run when Go is clicked (jumpTrigger). Omit setSelectedDate from deps:
    // it's a stable setState setter; including it can cause redundant runs if
    // DateProvider re-renders and context value reference changes.
  }, [jumpTrigger, jumpDate, view, useVisEngine])

  const getHighlightClass = (meta: ScheduleActivity | undefined, activityEnd: string) => {
    if (!meta || !meta.activity_id) return ""
    if (focusedActivityId && meta.activity_id === focusedActivityId) {
      return "ring-2 ring-cyan-200/90 ring-offset-2 ring-offset-slate-900"
    }
    const slackResult = slackMap.get(meta.activity_id)
    const isCriticalPath = slackResult?.isCriticalPath ?? false
    const isLocked = Boolean(meta.is_locked)
    const hasConstraint = Boolean(meta.constraint)
    const plannedFinish = new Date(`${activityEnd}T12:00:00.000Z`)
    const isDelayed =
      meta.status === "blocked" ||
      (meta.status !== "done" && plannedFinish.getTime() < selectedDate.getTime())
    if (highlightFlags.delay && isDelayed) {
      return "ring-2 ring-amber-400/80 ring-offset-2 ring-offset-slate-900"
    }
    if (highlightFlags.lock && isLocked) {
      return "ring-2 ring-fuchsia-400/80 ring-offset-2 ring-offset-slate-900"
    }
    if (highlightFlags.constraint && hasConstraint) {
      return "ring-2 ring-sky-400/80 ring-offset-2 ring-offset-slate-900"
    }
    if (isCriticalPath) {
      return "ring-2 ring-emerald-400/80 ring-offset-2 ring-offset-slate-900"
    }
    return ""
  }

  const handleMouseEnter = (e: React.MouseEvent, activity: Activity) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setTooltip({
      visible: true,
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
      activity,
    })
  }

  const handleMouseLeave = () => {
    setTooltip({ visible: false, x: 0, y: 0, activity: null })
  }

  return (
    <section className="flex flex-col flex-1 min-h-0 bg-card/85 backdrop-blur-lg rounded-2xl p-6 border border-accent/15">
      <h2 className="text-foreground text-base font-bold mb-5 flex items-center gap-2 tracking-tight">
        <Calendar className="w-5 h-5 text-cyan-400" />
        Gantt Chart (Jan 26 - Mar 24, 2026)
        <span className="flex-1 h-px bg-gradient-to-r from-accent/40 to-transparent ml-3" />
      </h2>

      <TimelineControls
        view={view}
        onViewChange={onViewChange}
        highlightFlags={highlightFlags}
        onHighlightFlagsChange={onHighlightFlagsChange}
        jumpDate={jumpDate}
        onJumpDateChange={onJumpDateChange}
        onJumpRequest={onJumpRequest}
        zoomCallbacks={
          useVisEngine
            ? {
                onZoomIn: () => visTimelineRef.current?.zoomIn(),
                onZoomOut: () => visTimelineRef.current?.zoomOut(),
                onFit: () => visTimelineRef.current?.fit(),
                onToday: () => visTimelineRef.current?.moveToToday(selectedDate),
                onPanLeft: () => visTimelineRef.current?.panLeft(),
                onPanRight: () => visTimelineRef.current?.panRight(),
              }
            : undefined
        }
      />

      {/* Legend — P1-4: 클릭 시 Drawer(태그 정의·의사결정 영향) */}
      <div className="flex flex-wrap gap-5 p-4 bg-glass rounded-xl mb-5 border border-accent/15">
        {legendItems.map((item) => {
          const def = getLegendDefinition(item.type)
          return (
            <button
              key={item.type}
              type="button"
              onClick={() => def && setLegendDrawerItem(def)}
              className="flex items-center gap-2.5 text-xs font-medium text-slate-400 hover:text-cyan-300 hover:underline focus:outline-none focus:ring-2 focus:ring-cyan-500/50 rounded min-h-[24px] min-w-[24px]"
              title="Click for description"
            >
              <div
                className={cn("w-7 h-3.5 rounded shadow-md", legendColors[item.type])}
              />
              {item.label}
            </button>
          )
        })}
        <span className="text-slate-500">|</span>
        <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-500">
          {(["W", "PTW", "CERT", "LNK", "BRG", "RES"] as const).map((key) => {
            const def = getLegendDefinition(key)
            return (
              <button
                key={key}
                type="button"
                onClick={() => def && setLegendDrawerItem(def)}
                className="hover:text-cyan-300 hover:underline focus:outline-none focus:ring-2 focus:ring-cyan-500/50 rounded min-h-[24px] min-w-[24px]"
                title="Click for description"
              >
                [{key}]
              </button>
            )
          })}
          {(["COL", "COL-LOC", "COL-DEP"] as const).map((key) => {
            const def = getLegendDefinition(key)
            return (
              <button
                key={key}
                type="button"
                onClick={() => def && setLegendDrawerItem(def)}
                className="text-red-400 hover:text-red-300 hover:underline focus:outline-none focus:ring-2 focus:ring-cyan-500/50 rounded min-h-[24px] min-w-[24px]"
                title="Click for description"
              >
                {key === "COL" ? "[COL]" : key === "COL-LOC" ? "[COL-LOC]" : "[COL-DEP]"}
              </button>
            )
          })}
          <button
            type="button"
            onClick={() => getLegendDefinition("slack") && setLegendDrawerItem(getLegendDefinition("slack")!)}
            className="text-emerald-400 hover:text-emerald-300 hover:underline focus:outline-none focus:ring-2 focus:ring-cyan-500/50 rounded min-h-[24px] min-w-[24px]"
            title="클릭하면 설명 보기"
          >
            +Xd
          </button>
          <button
            type="button"
            onClick={() => getLegendDefinition("CP") && setLegendDrawerItem(getLegendDefinition("CP")!)}
            className="text-emerald-400 hover:text-emerald-300 hover:underline focus:outline-none focus:ring-2 focus:ring-cyan-500/50 rounded min-h-[24px] min-w-[24px]"
            title="클릭하면 설명 보기"
          >
            CP
          </button>
          {compareDelta && compareDelta.changed.length > 0 && (
            <>
              <span className="text-slate-500">|</span>
              <button
                type="button"
                onClick={() => getLegendDefinition("Compare") && setLegendDrawerItem(getLegendDefinition("Compare")!)}
                className="text-amber-400 hover:underline focus:outline-none focus:ring-2 focus:ring-cyan-500/50 rounded min-h-[24px] min-w-[24px]"
                title="Click for description"
              >
                [Compare]
              </button>
            </>
          )}
          <span className="text-slate-500">|</span>
          <span className="text-xs text-muted-foreground" title="Gantt engine (NEXT_PUBLIC_GANTT_ENGINE)">
            Gantt: {useVisEngine ? "vis-timeline" : "custom"}
          </span>
        </div>
        {useVisEngine && weatherForecast && weatherLimits && (
          <>
            <span className="text-slate-500">|</span>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <button
                type="button"
                onClick={() => setWeatherOverlayEnabled((prev) => !prev)}
                className="flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-cyan-300 hover:underline focus:outline-none focus:ring-2 focus:ring-cyan-500/50 rounded min-h-[24px] min-w-[24px]"
                title="Toggle Weather Overlay"
              >
                <span>{weatherOverlayEnabled ? "🌦️" : "🌤️"}</span>
                <span>Weather Overlay</span>
              </button>
              {weatherOverlayEnabled && (
                <div className="hidden items-center gap-3 md:flex">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <span className="inline-block h-3 w-5 rounded border border-red-500/30 bg-red-500/15" />
                      <span>NO_GO</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="inline-block h-3 w-5 rounded border border-amber-400/30 bg-amber-400/10" />
                      <span>NEAR_LIMIT</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label htmlFor="weather-opacity" className="text-xs text-slate-400">
                      Opacity
                    </label>
                    <input
                      id="weather-opacity"
                      type="range"
                      min={10}
                      max={30}
                      step={5}
                      value={Math.round(weatherOverlayOpacityValue * 100)}
                      onChange={(e) =>
                        setWeatherOverlayOpacityValue(Number(e.target.value) / 100)
                      }
                      className="h-1 w-20 accent-cyan-400"
                    />
                    <span className="text-[11px] text-slate-500">
                      {Math.round(weatherOverlayOpacityValue * 100)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
      {legendDrawerItem && (
        <GanttLegendDrawer
          item={legendDrawerItem}
          onClose={() => setLegendDrawerItem(null)}
        />
      )}

      {/* Gantt Container: flexible height so detail + Gantt grow together */}
      <div className="flex min-h-[400px] flex-1 flex-col">
      {useVisEngine ? (
        <div ref={visContainerRef} className="relative flex-1 min-h-[400px]">
          {weatherOverlayEnabled && weatherForecast && weatherLimits && (
            <WeatherOverlay
              containerRef={visContainerRef as React.RefObject<HTMLDivElement>}
              forecast={weatherForecast}
              limits={weatherLimits}
              viewStart={visRange.start}
              viewEnd={visRange.end}
              opacity={weatherOverlayOpacityValue}
              renderKey={visRenderTick}
              className="pointer-events-none absolute z-0"
            />
          )}
          <DependencyArrowsOverlay
            containerRef={visContainerRef as React.RefObject<HTMLDivElement>}
            edges={dependencyEdges}
            renderKey={visRenderTick}
            className="pointer-events-none absolute inset-0 z-10"
          />
          <VisTimelineGantt
            ref={visTimelineRef}
            groups={visData.groups}
            items={visData.items}
            selectedDate={selectedDate}
            view={view}
            onEvent={onGanttEvent}
            onRangeChange={handleVisRangeChange}
            onRender={scheduleVisRenderTick}
            onItemClick={(id) => {
              const activityId = id.startsWith("ghost_")
                ? id.slice(6)
                : id.startsWith("reflow_ghost_")
                  ? id.slice(13)
                  : id.startsWith("weather_ghost_")
                    ? id.slice(14)
                    : id.startsWith("weather_prop_ghost_")
                      ? id.slice(20)
                    : id
              onActivityClick?.(activityId, activities.find((a) => a.activity_id === activityId)?.planned_start ?? "")
              scrollToActivity(activityId)
              const ganttSection = document.getElementById("gantt")
              ganttSection?.scrollIntoView({ behavior: "smooth", block: "start" })
            }}
            onDeselect={onActivityDeselect}
            focusedActivityId={focusedActivityId}
          />
        </div>
      ) : (
      <div className="overflow-x-auto flex-1 min-h-0" ref={ganttContainerRef}>
        <div className="relative" style={{ minWidth: `${chartWidth}px` }}>
          {/* Date Header */}
          <div className="flex ml-[200px] lg:ml-[220px] mb-3 border-b border-accent/15 pb-3">
            {dateMarks.map((date) => (
              <div
                key={date}
                className="flex-1 text-center font-mono text-xs text-cyan-400 font-semibold tracking-wide"
              >
                {date}
              </div>
            ))}
          </div>

          {selectedDate >= PROJECT_START && selectedDate <= PROJECT_END && (
            <div
              className="absolute top-[36px] bottom-0 w-0.5 bg-amber-400 z-20 pointer-events-none"
              style={{ left: `${selectedDatePosition}%` }}
              title={`Selected Date: ${dateToIsoUtc(toUtcNoon(selectedDate))} (UTC)`}
            >
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-amber-400 text-slate-900 text-[8px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap">
                {formatShortDateUtc(toUtcNoon(selectedDate))} ({dateToIsoUtc(toUtcNoon(selectedDate))})
              </div>
            </div>
          )}

          {/* Dependency arrows (FS/SS/FF/SF) */}
          {dependencyEdges.length > 0 && (
            <div
              className="pointer-events-none absolute left-[200px] top-[52px] z-10 lg:left-[220px]"
              style={{
                width: `calc(100% - 220px)`,
                height: `${ganttRows.length * 40}px`,
              }}
            >
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="h-full w-full"
              >
                <defs>
                  {(["FS", "SS", "FF", "SF"] as const).map((type) => (
                    <marker
                      key={type}
                      id={`arrow-${type.toLowerCase()}`}
                      markerWidth="4"
                      markerHeight="4"
                      refX="3"
                      refY="2"
                      orient="auto"
                    >
                      <polygon
                        points="0 0, 4 2, 0 4"
                        fill={DEPENDENCY_STYLES[type].stroke}
                        fillOpacity="0.8"
                      />
                    </marker>
                  ))}
                </defs>
                {dependencyEdges.map(({ predId, succId, type, lagDays }, i) => {
                  const pred = barPositions.get(predId)
                  const succ = barPositions.get(succId)
                  if (!pred || !succ) return null
                  const predStart = pred.left
                  const predEnd = pred.left + pred.width
                  const succStart = succ.left
                  const succEnd = succ.left + succ.width
                  let x1 = predEnd
                  let x2 = succStart
                  if (type === "SS") {
                    x1 = predStart
                    x2 = succStart
                  } else if (type === "FF") {
                    x1 = predEnd
                    x2 = succEnd
                  } else if (type === "SF") {
                    x1 = predStart
                    x2 = succEnd
                  }
                  const y1 = ((pred.rowIndex + 0.5) / ganttRows.length) * 100
                  const y2 = ((succ.rowIndex + 0.5) / ganttRows.length) * 100
                  const midX = (x1 + x2) / 2
                  const path =
                    pred.rowIndex === succ.rowIndex
                      ? `M ${x1} ${y1} L ${x2} ${y2}`
                      : `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`
                  const style = DEPENDENCY_STYLES[type] ?? DEPENDENCY_STYLES.FS
                  return (
                    <g key={`${predId}-${succId}-${i}`}>
                      <path
                        d={path}
                        fill="none"
                        stroke={style.stroke}
                        strokeOpacity="0.6"
                        strokeWidth={style.width}
                        strokeDasharray={style.dash}
                        markerEnd={`url(#${style.marker})`}
                      />
                      {lagDays !== 0 && (
                        <text
                          x={midX}
                          y={(y1 + y2) / 2 - 2}
                          fontSize="6"
                          fill={lagDays > 0 ? "rgb(34 211 238)" : "rgb(239 68 68)"}
                          textAnchor="middle"
                        >
                          {lagDays > 0 ? "+" : ""}
                          {lagDays}d
                        </text>
                      )}
                    </g>
                  )
                })}
              </svg>
            </div>
          )}

          {/* Gantt Rows */}
          {ganttRows.map((row, index) => (
            <div key={index} className="flex items-center mb-2">
              <div
                className={cn(
                  "w-[200px] lg:w-[220px] text-xs pr-4 flex-shrink-0",
                  row.isHeader
                    ? "font-bold text-amber-400 pt-4 tracking-wide"
                    : "font-medium text-slate-400"
                )}
              >
                {row.name}
              </div>
              <div className="flex-1 h-8 relative bg-cyan-500/[0.03] rounded border border-cyan-500/[0.08]">
                {/* Phase 10: Ghost bars for compare mode (changed) */}
                {compareDelta?.changed
                  ?.filter((d) => barPositions.get(d.activity_id)?.rowIndex === index)
                  ?.map((d) => {
                    if (!d.compare) return null
                    const ghostPos = calcPosition(
                      d.compare.planned_start,
                      d.compare.planned_finish,
                      view,
                      totalUnits
                    )
                    return (
                      <div
                        key={`ghost-${d.activity_id}`}
                        className="absolute h-6.5 top-[3px] rounded border-2 border-dashed border-amber-400/70 bg-amber-500/25 pointer-events-none z-0"
                        style={{
                          left: `${ghostPos.left}%`,
                          width: `${ghostPos.width}%`,
                        }}
                        title={`Compare: ${d.activity_id} shifted`}
                      />
                    )
                  })}
                {row.activities?.map((activity, actIndex) => {
                  const pos = calcPosition(activity.start, activity.end, view, totalUnits)
                  const refKey = activity.label.split(":")[0].trim()
                  const meta = activityMeta.get(refKey)
                  const highlightClass = getHighlightClass(meta, activity.end)

                  // Plan/Actual rendering (patch.md §5.1)
                  const hasActual = meta?.actual_start && meta?.actual_finish
                  const actualPos = hasActual
                    ? calcPosition(meta.actual_start!, meta.actual_finish!, view, totalUnits)
                    : null

                  return (
                    <React.Fragment key={actIndex}>
                      {/* Plan bar (main or semi-transparent if Actual exists) */}
                      <div
                        ref={(node) => {
                          if (node && activity.label) {
                            activityRefs.current.set(refKey, node)
                          }
                        }}
                        className={cn(
                          "absolute h-6.5 top-[3px] rounded font-mono text-[9px] flex items-center justify-center gap-0.5 text-slate-900 font-bold cursor-pointer transition-transform hover:scale-y-110 hover:scale-x-[1.02] hover:z-10 shadow-md",
                          activityColors[activity.type],
                          highlightClass,
                          hasActual && "opacity-40"
                        )}
                        style={{
                          left: `${pos.left}%`,
                          width: `${pos.width}%`,
                        }}
                        onMouseEnter={(e) => handleMouseEnter(e, activity)}
                        onMouseLeave={handleMouseLeave}
                        onClick={() =>
                          onActivityClick?.(refKey, activity.start)
                        }
                      >
                        <span className="truncate px-1">{activity.label}</span>
                        {(() => {
                          const slack = slackMap.get(refKey)
                          return slack?.slackDays != null && slack.slackDays > 0 ? (
                            <span
                              className="shrink-0 rounded bg-slate-800/60 px-0.5 text-[8px] text-emerald-300"
                              title={`Slack: ${slack.slackDays}d`}
                            >
                              +{slack.slackDays}d
                            </span>
                          ) : null
                        })()}
                        {getConstraintBadges(meta).map((k) => (
                          <span
                            key={k}
                            className="shrink-0 rounded bg-slate-900/40 px-0.5 text-[8px]"
                            title={
                              k === "W"
                                ? "Weather"
                                : k === "RES"
                                  ? "Resource"
                                  : k
                            }
                          >
                            {CONSTRAINT_BADGES[k]}
                          </span>
                        ))}
                        {getCollisionBadges(meta, conflicts).map((k) => {
                          const actConflicts = getConflictsForActivity(
                            refKey,
                            conflicts
                          )
                          return (
                            <span
                              key={k}
                              className="shrink-0 cursor-pointer rounded bg-red-900/50 px-0.5 text-[8px] text-red-200 hover:bg-red-800/60"
                              title="Click for summary, then Why for details"
                              onClick={(e) => {
                                e.stopPropagation()
                                if (actConflicts.length > 0) {
                                  const rect = (e.target as HTMLElement).getBoundingClientRect()
                                  setCollisionPopover({
                                    x: rect.left + rect.width / 2,
                                    y: rect.top - 4,
                                    conflicts: actConflicts,
                                  })
                                }
                              }}
                            >
                              {COLLISION_BADGES[k]}
                            </span>
                          )
                        })}
                      </div>

                      {/* Actual bar (solid overlay if exists) */}
                      {hasActual && actualPos && (
                        <div
                          className={cn(
                            "absolute h-6.5 top-[3px] rounded font-mono text-[9px] flex items-center justify-center gap-0.5 text-slate-900 font-bold shadow-lg border-2 border-white/30",
                            activityColors[activity.type]
                          )}
                          style={{
                            left: `${actualPos.left}%`,
                            width: `${actualPos.width}%`,
                            zIndex: 5,
                          }}
                          title={`Actual: ${meta?.actual_start} → ${meta?.actual_finish}`}
                        >
                          <span className="text-[8px] bg-slate-900/70 px-1 rounded">ACTUAL</span>
                        </div>
                      )}
                    </React.Fragment>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      )}
      </div>

      {/* Collision popover (1-click: summary, 2-click: Why → Detail) */}
      {collisionPopover && collisionPopover.conflicts.length > 0 && (
        <div
          className="fixed z-50 w-64 rounded-lg border border-red-500/40 bg-slate-800 px-3 py-2 shadow-xl"
          style={{
            left: collisionPopover.x,
            top: collisionPopover.y,
            transform: "translate(-50%, -100%)",
          }}
        >
          <div className="text-xs font-bold text-red-300 mb-1">
            Collision summary
          </div>
          <p className="text-xs text-slate-300 mb-2">
            {collisionPopover.conflicts[0].message}
          </p>
          <div className="flex gap-1">
            <button
              type="button"
              className="flex-1 rounded bg-red-900/50 px-2 py-1 text-xs font-medium text-red-200 hover:bg-red-800/60"
              onClick={() => {
                onCollisionClick?.(collisionPopover.conflicts[0])
                setCollisionPopover(null)
              }}
            >
              Why
            </button>
            <button
              type="button"
              className="rounded px-2 py-1 text-xs text-slate-400 hover:text-foreground"
              onClick={() => setCollisionPopover(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Tooltip */}
      {tooltip.visible && tooltip.activity && (
        <div
          className="fixed z-50 bg-slate-800 border border-cyan-500/40 rounded-lg px-4 py-3 shadow-xl pointer-events-none transform -translate-x-1/2 -translate-y-full"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <div className="font-bold text-foreground text-sm mb-1">
            {tooltip.activity.label}
          </div>
          <div className="text-xs text-slate-400 space-y-0.5">
            <p>
              <strong className="text-slate-300">Period:</strong>{" "}
              {tooltip.activity.start} ~ {tooltip.activity.end}
            </p>
            <p>
              <strong className="text-slate-300">Type:</strong>{" "}
              {activityTypeNames[tooltip.activity.type]}
            </p>
          </div>
        </div>
      )}

    </section>
  )
})
