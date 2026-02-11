"use client"

import React from "react"

import dynamic from "next/dynamic"
import { useEffect, useMemo, useRef, useState, forwardRef, useImperativeHandle } from "react"
import { Calendar } from "lucide-react"
import { toast } from "sonner"
import {
  legendItems,
  getSmartInitialDate,
  PROJECT_START,
  PROJECT_END,
  TOTAL_DAYS,
  type Activity,
  type ActivityType,
  activityTypeNames,
} from "@/lib/dashboard-data"
import { scheduleActivitiesToGanttRows } from "@/lib/data/schedule-data"
import { buildGroupedVisData, applyGanttFilters } from "@/lib/gantt/grouping"
import { buildDensityBuckets } from "@/lib/gantt/density"
import { loadEventLog } from "@/lib/data/event-log-loader"
import type { VisTimelineGanttHandle, DragMovePayload } from "@/components/gantt/VisTimelineGantt"
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
  diffUTCDays,
} from "@/lib/ssot/schedule"
import {
  TimelineControls,
  type HighlightFlags,
  type TimelineView,
  type TimelineFilters,
  type GroupingState,
  type EventOverlayToggles,
} from "@/components/dashboard/timeline-controls"
import { cn } from "@/lib/utils"
import { useDate } from "@/lib/contexts/date-context"
import { useViewModeOptional } from "@/src/lib/stores/view-mode-store"
import { checkEvidenceGate } from "@/src/lib/state-machine/evidence-gate"
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
import { GanttMiniMap } from "@/components/gantt/GanttMiniMap"
import { DensityHeatmapOverlay } from "@/components/gantt/DensityHeatmapOverlay"
import type { EventLogItem } from "@/lib/ops/event-sourcing/types"
import type { Activity as SsotActivity, ActivityState, OptionC } from "@/src/types/ssot"

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

function getEvidenceTargetState(state: ActivityState): ActivityState {
  if (state === "in_progress") return "completed"
  if (state === "planned" || state === "ready" || state === "blocked") return "in_progress"
  return state
}

function getFirstEventTs(
  events: EventLogItem[],
  state: EventLogItem["state"]
): string | null {
  const match = events
    .filter((event) => event.state === state)
    .sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime())[0]
  return match?.ts ?? null
}

function getLastEventTs(
  events: EventLogItem[],
  state: EventLogItem["state"]
): string | null {
  const matches = events
    .filter((event) => event.state === state)
    .sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime())
  return matches.length > 0 ? matches[matches.length - 1].ts : null
}

interface TooltipState {
  visible: boolean
  x: number
  y: number
  activity: Activity | null
}

interface HoverCardState {
  activityId: string
  x: number
  y: number
}

export interface GanttChartHandle {
  scrollToActivity: (activityId: string) => void
}

interface GanttChartProps {
  activities: ScheduleActivity[]
  ssot?: OptionC | null
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
  onOpenEvidence?: (activityId: string) => void
  onOpenHistory?: (activityId: string) => void
  /** Drag-to-Edit: called when user drags an activity bar to a new date */
  onDragMove?: (activityId: string, newStart: string) => void
}

export const GanttChart = forwardRef<GanttChartHandle, GanttChartProps>(function GanttChart(
  {
    activities,
    ssot,
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
    onOpenEvidence,
    onOpenHistory,
    onDragMove,
  },
  ref
) {
  const { selectedDate, setSelectedDate } = useDate()
  const viewMode = useViewModeOptional()
  const canEdit = viewMode?.canEdit ?? true
  const isHistoryMode = viewMode?.state.mode === "history"
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
  const [hoverCard, setHoverCard] = useState<HoverCardState | null>(null)
  const hoverHideTimeoutRef = useRef<number | null>(null)
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
  const [filters, setFilters] = useState<TimelineFilters>({
    criticalOnly: false,
    blockedOnly: false,
  })
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [heatmapEnabled, setHeatmapEnabled] = useState(false)
  const [eventOverlays, setEventOverlays] = useState<EventOverlayToggles>({
    showActual: false,
    showHold: false,
    showMilestone: false,
  })
  const [eventLogByActivity, setEventLogByActivity] = useState<
    Map<string, EventLogItem[]>
  >(new Map())
  const [eventLogLoading, setEventLogLoading] = useState(false)
  const [eventLogAttempted, setEventLogAttempted] = useState(false)
  const [weatherOverlayEnabled, setWeatherOverlayEnabled] = useState(
    weatherOverlayVisible
  )
  const [weatherOverlayOpacityValue, setWeatherOverlayOpacityValue] = useState(
    weatherOverlayOpacity
  )
  // AGENTS.md §5.1: VisTimelineGantt 필수 사용 (vis-timeline 기반)
  const raw = (process.env.NEXT_PUBLIC_GANTT_ENGINE || "vis").trim().toLowerCase()
  const useVisEngine = raw === "vis"
  const eventOverlayEnabled =
    useVisEngine &&
    (eventOverlays.showActual || eventOverlays.showHold || eventOverlays.showMilestone)
  const showOverlayLegend =
    useVisEngine &&
    (eventOverlays.showActual || eventOverlays.showHold || eventOverlays.showMilestone)
  const totalWeeks = Math.ceil(TOTAL_DAYS / DAYS_PER_WEEK)
  const totalUnits = view === "Day" ? TOTAL_DAYS : totalWeeks
  const unitWidth = view === "Day" ? 22 : 120
  const chartWidth = Math.max(1000, totalUnits * unitWidth)

  const slackMap = useMemo(
    () => calculateSlack(activities, projectEndDate),
    [activities, projectEndDate]
  )
  const filteredActivities = useMemo(
    () => applyGanttFilters(activities, filters, slackMap),
    [activities, filters, slackMap]
  )
  const ganttRows = useMemo(
    () => scheduleActivitiesToGanttRows(filteredActivities),
    [filteredActivities]
  )

  const activityMeta = useMemo(() => {
    const map = new Map<string, ScheduleActivity>()
    for (const activity of filteredActivities) {
      if (activity.activity_id) {
        map.set(activity.activity_id, activity)
      }
    }
    return map
  }, [filteredActivities])

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
  }, [ganttRows, view, totalUnits, activityMeta])

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

  const density = useMemo(
    () => buildDensityBuckets(filteredActivities, PROJECT_START, PROJECT_END),
    [filteredActivities]
  )

  const groupingState: GroupingState = useMemo(
    () => ({
      enabled: useVisEngine,
      collapsed: collapsedGroups,
    }),
    [useVisEngine, collapsedGroups]
  )

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

  const groupedVisData = useMemo(() => {
    if (!useVisEngine) return null
    
    const result = buildGroupedVisData({
      activities: filteredActivities,
      compareDelta,
      reflowPreview,
      weatherPreview,
      weatherPropagated,
      collapsedGroupIds: collapsedGroups,
      eventLogByActivity: eventOverlayEnabled ? eventLogByActivity : undefined,
      eventOverlay: eventOverlayEnabled ? eventOverlays : undefined,
      actualOverlay: {
        enabled: true,
        selectedDate,
        isHistoryMode,
      },
      slackMap,
    })
    return result
  }, [
    useVisEngine,
    filteredActivities,
    compareDelta,
    reflowPreview,
    weatherPreview,
    weatherPropagated,
    collapsedGroups,
    eventOverlayEnabled,
    eventLogByActivity,
    eventOverlays,
    selectedDate,
    isHistoryMode,
    slackMap,
  ])

  const isGhostItemId = (id: string) =>
    id.startsWith("ghost_") ||
    id.startsWith("reflow_ghost_old_") ||
    id.startsWith("reflow_ghost_new_") ||
    id.startsWith("reflow_ghost_") ||
    id.startsWith("weather_ghost_") ||
    id.startsWith("weather_prop_ghost_")

  const isOverlayNonInteractiveId = (id: string) =>
    id.startsWith("hold__") || id.startsWith("milestone__")

  const normalizeItemId = (id: string) => {
    if (id.startsWith("ghost_")) return id.slice(6)
    if (id.startsWith("reflow_ghost_old_")) return id.slice(17)
    if (id.startsWith("reflow_ghost_new_")) return id.slice(17)
    if (id.startsWith("reflow_ghost_")) return id.slice(13)
    if (id.startsWith("weather_ghost_")) return id.slice(14)
    if (id.startsWith("weather_prop_ghost_")) return id.slice(20)
    if (id.startsWith("actual__")) return id.slice(8)
    if (id.startsWith("hold__")) return id.split("__")[1] ?? id
    if (id.startsWith("milestone__")) return id.split("__")[1] ?? id
    return id
  }

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

  useEffect(() => {
    if (!eventOverlayEnabled) return
    if (eventLogLoading || eventLogAttempted) return
    let active = true
    setEventLogLoading(true)
    setEventLogAttempted(true)
    loadEventLog()
      .then((map) => {
        if (active) setEventLogByActivity(map)
      })
      .finally(() => {
        if (active) setEventLogLoading(false)
      })
    return () => {
      active = false
    }
  }, [eventOverlayEnabled, eventLogLoading, eventLogAttempted])

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

  const handleCollapseAll = () => {
    if (!groupedVisData) return
    setCollapsedGroups(new Set(groupedVisData.parentGroupIds))
  }

  const handleExpandAll = () => {
    setCollapsedGroups(new Set())
  }

  const handleResetGantt = () => {
    const initialDate = getSmartInitialDate()

    // 1. Reset view to Day
    onViewChange?.("Day")

    // 2. Reset filters
    setFilters({ criticalOnly: false, blockedOnly: false })

    // 3. Reset highlight flags
    onHighlightFlagsChange?.({ delay: false, lock: false, constraint: false })

    // 4. Expand all groups
    setCollapsedGroups(new Set())

    // 5. Reset event overlays
    setEventOverlays({ showActual: false, showHold: false, showMilestone: false })

    // 6. Disable heatmap
    setHeatmapEnabled(false)

    // 7. Reset jump date
    onJumpDateChange?.("")

    // 8. Reset weather overlay
    setWeatherOverlayEnabled(false)
    setWeatherOverlayOpacityValue(weatherOverlayOpacity)

    // 9. Clear selections and sync Global Control Bar date cursor
    onActivityDeselect?.()
    setSelectedDate(initialDate)
    viewMode?.setDateCursor?.(initialDate.toISOString())

    // 10. Clear popover/tooltip states
    setCollisionPopover(null)
    setTooltip({ visible: false, x: 0, y: 0, activity: null })
    setHoverCard(null)
    setLegendDrawerItem(null)

    // 11. Reset event log state
    setEventLogByActivity(new Map())
    setEventLogLoading(false)
    setEventLogAttempted(false)

    // 12. Window is set by VisTimelineGantt useEffect(view, selectedDate) to Day view + 14d; do not call fit() or it would zoom out to full project and undo the reset.
    toast.success("Gantt view reset to initial state", {
      duration: 2000,
    })
  }

  const handleGroupClick = (groupId: string) => {
    if (!groupedVisData?.parentGroupIds.has(groupId)) return
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) {
        next.delete(groupId)
      } else {
        next.add(groupId)
      }
      return next
    })
  }

  const clearHoverHideTimeout = () => {
    if (hoverHideTimeoutRef.current !== null) {
      window.clearTimeout(hoverHideTimeoutRef.current)
      hoverHideTimeoutRef.current = null
    }
  }

  const handleItemHover = (payload: { id: string; x: number; y: number }) => {
    if (isGhostItemId(payload.id) || isOverlayNonInteractiveId(payload.id)) return
    const activityId = normalizeItemId(payload.id)
    if (!activityMeta.has(activityId)) return
    clearHoverHideTimeout()
    setHoverCard({ activityId, x: payload.x, y: payload.y })
  }

  const handleItemBlur = () => {
    clearHoverHideTimeout()
    hoverHideTimeoutRef.current = window.setTimeout(() => {
      setHoverCard(null)
      hoverHideTimeoutRef.current = null
    }, 120)
  }

  // Keyboard shortcut: Ctrl/Cmd+Shift+R to reset Gantt
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'R') {
        e.preventDefault()
        handleResetGantt()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, []) // handleResetGantt는 stable하므로 deps 불필요

  useEffect(() => {
    if (!groupedVisData) return
    setCollapsedGroups((prev) => {
      const next = new Set<string>()
      for (const id of prev) {
        if (groupedVisData.parentGroupIds.has(id)) next.add(id)
      }
      return next.size === prev.size ? prev : next
    })
  }, [groupedVisData])

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
      return "ring-2 ring-red-400/80 ring-offset-2 ring-offset-slate-900"
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

  const hoverActivity = hoverCard ? activityMeta.get(hoverCard.activityId) ?? null : null
  const hoverEvents = hoverCard
    ? eventLogByActivity.get(hoverCard.activityId) ?? []
    : []
  const hoverSsotActivity: SsotActivity | null =
    hoverCard && ssot?.entities?.activities
      ? ssot.entities.activities[hoverCard.activityId] ?? null
      : null

  const hoverEvidenceSummary = hoverSsotActivity
    ? (() => {
        const targetState = getEvidenceTargetState(hoverSsotActivity.state)
        const gate = checkEvidenceGate(
          hoverSsotActivity,
          targetState,
          hoverSsotActivity.state,
          ssot ?? undefined
        )
        const missingTypes = Array.from(
          new Set(gate.missing.map((missing) => missing.evidence_type))
        )
        return {
          evidenceCount: hoverSsotActivity.evidence_ids?.length ?? 0,
          missingCount: gate.missing.length,
          missingTypes: missingTypes.length > 0 ? missingTypes.join(", ") : "—",
        }
      })()
    : null

  const derivedActualStart =
    hoverActivity?.actual_start ?? getFirstEventTs(hoverEvents, "START")
  const derivedActualEnd =
    hoverActivity?.actual_finish ?? getLastEventTs(hoverEvents, "END")

  const hoverProgressLabel = hoverActivity
    ? (() => {
        if (derivedActualEnd) return "Complete"
        if (derivedActualStart && !derivedActualEnd) {
          const todayIso = dateToIsoUtc(toUtcNoon(selectedDate))
          const elapsed = Math.max(1, diffUTCDays(derivedActualStart, todayIso) + 1)
          const duration = Math.max(1, Math.ceil(hoverActivity.duration))
          const pct = Math.min(100, Math.round((elapsed / duration) * 100))
          return `In progress • ${pct}% (${elapsed}/${duration}d)`
        }
        return "Planned"
      })()
    : "Planned"

  const handleDragMove = (payload: DragMovePayload) => {
    if (!canEdit) return
    const activityId = normalizeItemId(payload.itemId)
    if (!activityMeta.has(activityId)) return
    // Convert date to YYYY-MM-DD UTC noon string
    const d = new Date(payload.newStart)
    const year = d.getUTCFullYear()
    const month = String(d.getUTCMonth() + 1).padStart(2, "0")
    const day = String(d.getUTCDate()).padStart(2, "0")
    const newStartIso = `${year}-${month}-${day}`
    onDragMove?.(activityId, newStartIso)
    toast.info(`Drag preview: ${activityId} → ${newStartIso}`, { duration: 2000 })
  }

  const handleQuickEdit = (activityId: string) => {
    const meta = activityMeta.get(activityId)
    if (!meta || !onActivityClick) return
    onActivityClick(activityId, meta.planned_start)
    setHoverCard(null)
  }

  const handleQuickEvidence = (activityId: string) => {
    onOpenEvidence?.(activityId)
    setHoverCard(null)
  }

  const handleQuickHistory = (activityId: string) => {
    onOpenHistory?.(activityId)
    setHoverCard(null)
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
        filters={filters}
        onFiltersChange={setFilters}
        grouping={groupingState}
        onCollapseAll={handleCollapseAll}
        onExpandAll={handleExpandAll}
        eventOverlays={useVisEngine ? eventOverlays : undefined}
        onEventOverlaysChange={useVisEngine ? setEventOverlays : undefined}
        heatmapEnabled={heatmapEnabled}
        onHeatmapToggle={() => setHeatmapEnabled((prev) => !prev)}
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
                onReset: handleResetGantt,
              }
            : undefined
        }
      />
      {!useVisEngine && (
        <div className="mb-4 rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
          Advanced grouping, mini-map, hover cards, and density heatmap are available in the vis-timeline engine.
        </div>
      )}
      {eventOverlayEnabled && eventLogLoading && (
        <div className="mb-4 rounded-lg border border-indigo-400/20 bg-indigo-500/10 px-3 py-2 text-xs text-indigo-200">
          Loading event log overlays…
        </div>
      )}

      {/* Legend — Badge icons + Info (Activity Types moved to Drawer for space) */}
      <div className="flex flex-wrap gap-5 p-4 bg-glass rounded-xl mb-5 border border-accent/15">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <button
            type="button"
            onClick={() => {
              const activityTypeDef = getLegendDefinition("activity-types")
              if (activityTypeDef) setLegendDrawerItem(activityTypeDef)
            }}
            className="flex items-center gap-2 hover:text-cyan-300 hover:underline focus:outline-none focus:ring-2 focus:ring-cyan-500/50 rounded px-2 py-1"
            title="Click to view Activity Types legend"
          >
            <span className="text-xs font-medium">Activity Types</span>
            <span className="text-[10px] text-slate-500">(6)</span>
          </button>
        </div>
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
            className="text-red-400 hover:text-red-300 hover:underline focus:outline-none focus:ring-2 focus:ring-cyan-500/50 rounded min-h-[24px] min-w-[24px]"
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
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <button
                type="button"
                onClick={() => setWeatherOverlayEnabled((prev) => !prev)}
                className="flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-cyan-300 hover:underline focus:outline-none focus:ring-2 focus:ring-cyan-500/50 rounded px-2 py-1"
                title="Toggle Weather Overlay"
              >
                <span>{weatherOverlayEnabled ? "🌦️" : "🌤️"}</span>
                <span>Weather Overlay</span>
              </button>
              {weatherOverlayEnabled && (
                <div className="flex items-center gap-2 ml-2">
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
                  <button
                    type="button"
                    onClick={() => {
                      const weatherDef = getLegendDefinition("weather-overlay")
                      if (weatherDef) setLegendDrawerItem(weatherDef)
                    }}
                    className="text-xs text-slate-500 hover:text-cyan-300 hover:underline ml-1"
                    title="View Weather Legend"
                  >
                    [Legend]
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
      {showOverlayLegend && (
        <div className="flex flex-wrap gap-4 p-4 bg-glass rounded-xl mb-5 border border-accent/15 text-xs text-slate-400">
          {eventOverlays.showActual && (
            <>
              <div className="flex items-center gap-2">
                <div className="h-3 w-8 rounded bg-emerald-500/30 border-2 border-emerald-500/70" />
                <span>Actual (On Time)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-8 rounded bg-emerald-500/30 border-2 border-emerald-600/90" />
                <span>Actual (Early)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-8 rounded bg-red-500/30 border-2 border-red-500/80" />
                <span>Actual (Delayed)</span>
              </div>
            </>
          )}
          {eventOverlays.showHold && (
            <>
              <div className="flex items-center gap-2">
                <div className="h-3 w-8 rounded bg-yellow-500/30" />
                <span>Hold (Weather)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-8 rounded bg-orange-500/30" />
                <span>Hold (PTW)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-8 rounded bg-purple-500/30" />
                <span>Hold (Berth)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-8 rounded bg-pink-500/30" />
                <span>Hold (MWS)</span>
              </div>
            </>
          )}
          {eventOverlays.showMilestone && (
            <>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-blue-500 border-2 border-blue-700" />
                <span>Arrive</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-orange-500 border-2 border-orange-700" />
                <span>Depart</span>
              </div>
            </>
          )}
        </div>
      )}
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
          {heatmapEnabled && (
            <DensityHeatmapOverlay
              buckets={density.buckets}
              maxCount={density.maxCount}
              className="pointer-events-none absolute inset-0 z-0"
            />
          )}
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
            groups={groupedVisData?.groups ?? []}
            items={groupedVisData?.items ?? []}
            selectedDate={selectedDate}
            view={view}
            onEvent={onGanttEvent}
            onRangeChange={handleVisRangeChange}
            onRender={scheduleVisRenderTick}
            onItemHover={handleItemHover}
            onItemBlur={handleItemBlur}
            onGroupClick={handleGroupClick}
            onItemClick={(id) => {
              const activityId = normalizeItemId(id)
              onActivityClick?.(activityId, activityMeta.get(activityId)?.planned_start ?? "")
              scrollToActivity(activityId)
              const ganttSection = document.getElementById("gantt")
              ganttSection?.scrollIntoView({ behavior: "smooth", block: "start" })
            }}
            onDeselect={onActivityDeselect}
            onItemMove={handleDragMove}
            dragEnabled={canEdit}
            focusedActivityId={focusedActivityId}
          />
          {groupedVisData && (
            <div className="absolute bottom-3 right-3 z-30">
              <GanttMiniMap
                buckets={density.buckets}
                maxCount={density.maxCount}
                projectStart={PROJECT_START}
                projectEnd={PROJECT_END}
                visibleRange={visRange}
                onWindowChange={(start, end) =>
                  visTimelineRef.current?.setWindow(start, end, { animation: true })
                }
              />
            </div>
          )}
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

      {hoverCard && hoverActivity && (() => {
        const hoverSlack = hoverCard ? slackMap.get(hoverCard.activityId) : null
        const hoverConflicts = hoverCard ? getConflictsForActivity(hoverCard.activityId, conflicts) : []
        const hoverDeps = hoverActivity.depends_on ?? []
        return (
        <div
          className="fixed z-50 w-80 rounded-xl border border-cyan-500/40 bg-slate-900/95 p-4 text-xs text-slate-200 shadow-2xl"
          style={{ left: hoverCard.x, top: hoverCard.y, transform: "translate(-40%, -110%)" }}
          onMouseEnter={clearHoverHideTimeout}
          onMouseLeave={() => setHoverCard(null)}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="font-semibold text-sm text-foreground">
              {hoverActivity.activity_name || hoverActivity.activity_id}
            </div>
            <div className="flex items-center gap-1">
              {hoverSlack?.isCriticalPath && (
                <span className="rounded bg-red-900/50 px-1.5 py-0.5 text-[10px] font-bold text-red-300">
                  CP
                </span>
              )}
              <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] uppercase text-slate-400">
                {hoverActivity.status ?? "planned"}
              </span>
            </div>
          </div>
          <div className="mt-1 text-[10px] font-mono text-slate-500">
            {hoverActivity.planned_start} ~ {hoverActivity.planned_finish} ({Math.ceil(hoverActivity.duration)}d)
          </div>
          <div className="mt-2 space-y-1 text-[11px] text-slate-400">
            <div>
              <span className="text-slate-300">Progress:</span> {hoverProgressLabel}
            </div>
            {hoverSlack && (
              <div>
                <span className="text-slate-300">Slack:</span>{" "}
                {hoverSlack.slackDays > 0 ? (
                  <span className="text-emerald-400">+{hoverSlack.slackDays}d</span>
                ) : (
                  <span className="text-red-400 font-semibold">0d (Critical Path)</span>
                )}
              </div>
            )}
            <div>
              <span className="text-slate-300">Resource:</span>{" "}
              {hoverActivity.resource_tags?.join(", ") || "Unassigned"}
            </div>
            {hoverActivity.constraint && (
              <div>
                <span className="text-slate-300">Constraint:</span>{" "}
                <span className="text-sky-400">{hoverActivity.constraint.type}</span>
                {hoverActivity.constraint.date && (
                  <span className="text-slate-500 ml-1">({hoverActivity.constraint.date})</span>
                )}
              </div>
            )}
            {hoverDeps.length > 0 && (
              <div>
                <span className="text-slate-300">Depends on:</span>{" "}
                {hoverDeps.map(d => `${d.predecessorId} (${d.type}${d.lagDays ? ` +${d.lagDays}d` : ""})`).join(", ")}
              </div>
            )}
            {hoverConflicts.length > 0 && (
              <div className="text-red-400">
                <span className="text-red-300 font-semibold">Conflicts:</span>{" "}
                {hoverConflicts.length} ({hoverConflicts.map(c => c.resource || c.type).join(", ")})
              </div>
            )}
            {hoverEvidenceSummary && (
              <div>
                <span className="text-slate-300">Evidence:</span>{" "}
                {hoverEvidenceSummary.evidenceCount} attached • Missing{" "}
                {hoverEvidenceSummary.missingCount} ({hoverEvidenceSummary.missingTypes})
              </div>
            )}
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => handleQuickEdit(hoverCard.activityId)}
              disabled={!canEdit || !onActivityClick}
              className="flex-1 rounded-md border border-cyan-500/40 px-2 py-1 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => handleQuickEvidence(hoverCard.activityId)}
              disabled={!onOpenEvidence}
              className="flex-1 rounded-md border border-slate-700/60 px-2 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-800/60 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Evidence
            </button>
            <button
              type="button"
              onClick={() => handleQuickHistory(hoverCard.activityId)}
              disabled={!onOpenHistory}
              className="flex-1 rounded-md border border-slate-700/60 px-2 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-800/60 disabled:cursor-not-allowed disabled:opacity-40"
            >
              History
            </button>
          </div>
        </div>
        )
      })()}

    </section>
  )
})
