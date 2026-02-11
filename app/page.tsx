"use client"

import { useEffect, useMemo, useState, useRef } from "react"
import { DateProvider } from "@/lib/contexts/date-context"
import { DashboardHeader } from "@/components/dashboard/header"
import { StoryHeader } from "@/components/dashboard/StoryHeader"
import { type GanttChartHandle } from "@/components/dashboard/gantt-chart"
import type {
  HighlightFlags,
  TimelineView,
} from "@/components/dashboard/timeline-controls"
import { Footer } from "@/components/dashboard/footer"
import { BackToTop } from "@/components/dashboard/back-to-top"
import { VoyageFocusDrawer } from "@/components/dashboard/voyage-focus-drawer"
import { SectionNav } from "@/components/dashboard/section-nav"
import dynamic from "next/dynamic"
import { TrThreeColumnLayout } from "@/components/dashboard/layouts/tr-three-column-layout"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { NotesDecisions } from "@/components/dashboard/notes-decisions"

// Leaflet uses window - load MapPanelWrapper only on client
const MapPanelWrapper = dynamic(
  () => import("@/components/map/MapPanelWrapper").then((m) => m.MapPanelWrapper),
  { ssr: false }
)
import { WhyPanel } from "@/components/dashboard/WhyPanel"
import { ReflowPreviewPanel } from "@/components/dashboard/ReflowPreviewPanel"
import { WhatIfPanel, type WhatIfScenario, type WhatIfMetrics } from "@/components/ops/WhatIfPanel"
import { DetailPanel } from "@/components/detail/DetailPanel"
import { ApprovalModeBanner } from "@/components/approval/ApprovalModeBanner"
import { CompareModeBanner } from "@/components/compare/CompareModeBanner"
import { HistoryEvidencePanel, type HistoryEvidenceTab } from "@/components/history/HistoryEvidencePanel"
import { ReadinessPanel } from "@/components/dashboard/ReadinessPanel"
import { UnifiedCommandPalette } from "@/components/ops/UnifiedCommandPalette"
import { calculateSlack } from "@/lib/utils/slack-calc"
import { OverviewSection } from "@/components/dashboard/sections/overview-section"
import { KPISection } from "@/components/dashboard/sections/kpi-section"
import { AlertsSection } from "@/components/dashboard/sections/alerts-section"
import { VoyagesSection } from "@/components/dashboard/sections/voyages-section"
import { ScheduleSection } from "@/components/dashboard/sections/schedule-section"
import { GanttSection } from "@/components/dashboard/sections/gantt-section"
import { WaterTidePanel } from "@/components/dashboard/sections/water-tide-section"
import { WidgetErrorBoundary, WidgetErrorFallback } from "@/components/dashboard/WidgetErrorBoundary"
import { scheduleActivities } from "@/lib/data/schedule-data"
import { voyages, PROJECT_END_DATE } from "@/lib/dashboard-data"
import {
  runAgiOpsPipeline,
  createDefaultOpsState,
} from "@/lib/ops/agi-schedule/pipeline-runner"
import { runPipelineCheck } from "@/lib/ops/agi-schedule/pipeline-check"
import { detectResourceConflicts } from "@/lib/utils/detect-resource-conflicts"
import { calculateDelta } from "@/lib/compare/compare-loader"
import { reflowSchedule } from "@/lib/utils/schedule-reflow"
import { addUTCDays, dateToIsoUtc, parseUTCDate } from "@/lib/ssot/schedule"
import { appendHistoryEvent } from "@/lib/store/trip-store"
import { useViewModeOptional } from "@/src/lib/stores/view-mode-store"
import { weatherForecast, weatherLimits } from "@/lib/weather/weather-service"
import { buildWeatherDelayPreview } from "@/lib/weather/weather-delay-preview"
import { propagateWeatherDelays } from "@/lib/weather/weather-reflow-chain"
import type { Activity, ActivityState, OptionC } from "@/src/types/ssot"
import { calculateCurrentActivityForTR, calculateCurrentLocationForTR } from "@/src/lib/derived-calc"
import { checkEvidenceGate } from "@/src/lib/state-machine/evidence-gate"
import type {
  ImpactReport,
  ScheduleActivity,
  ScheduleConflict,
  SuggestedAction,
  FreezeLockViolation,
} from "@/lib/ssot/schedule"
import { mapSsotCollisionToScheduleConflict } from "@/src/lib/collision-card"

type SectionItem = {
  id: string
  label: string
  count?: number
}
type DetailTab = "detail" | "tide"

/** patchmain #11: ScrollSpy offset (header + summary bar height) */
const SCROLL_SPY_OFFSET = 120
const UNIFIED_COMMAND_PALETTE_ENABLED =
  process.env.NEXT_PUBLIC_UNIFIED_COMMAND_PALETTE === "true"

function parseVoyageDate(dateStr: string): Date {
  const monthMap: Record<string, number> = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  }
  const parts = dateStr.trim().split(" ")
  const month = monthMap[parts[0]]
  const day = parseInt(parts[1], 10)
  return new Date(Date.UTC(2026, month, day))
}

function findVoyageByActivityDate(
  activityStart: string,
  voyageList: typeof voyages
): (typeof voyages)[number] | null {
  const actDate = new Date(activityStart)
  for (const v of voyageList) {
    const loadOut = parseVoyageDate(v.loadOut)
    const jackDown = parseVoyageDate(v.jackDown)
    if (actDate >= loadOut && actDate <= jackDown) return v
  }
  return null
}

function findFirstActivityInVoyageRange(
  acts: ScheduleActivity[],
  voyage: (typeof voyages)[number]
): string | null {
  const loadOut = parseVoyageDate(voyage.loadOut)
  const jackDown = parseVoyageDate(voyage.jackDown)
  for (const a of acts) {
    if (!a.activity_id) continue
    const d = new Date(a.planned_start)
    if (d >= loadOut && d <= jackDown) return a.activity_id
  }
  return null
}

function normalizeTripMatchValue(value: string | undefined | null): string {
  if (!value) return ""
  return value.toLowerCase().replace(/[^a-z0-9]/g, "")
}

function matchTripIdForVoyage(
  voyage: (typeof voyages)[number] | null,
  tripList: { trip_id: string; name: string }[]
): string | null {
  if (!voyage || tripList.length === 0) return null
  const voyageNumber = String(voyage.voyage)
  const tokens = [
    normalizeTripMatchValue(`voyage ${voyageNumber}`),
    normalizeTripMatchValue(`voy ${voyageNumber}`),
    normalizeTripMatchValue(`trip ${voyageNumber}`),
    normalizeTripMatchValue(`tr ${voyageNumber}`),
    normalizeTripMatchValue(`tr unit ${voyageNumber}`),
    normalizeTripMatchValue(voyage.trUnit),
  ]
  const matched = tripList.find((trip) => {
    const normalizedName = normalizeTripMatchValue(trip.name)
    return tokens.some((token) => token && normalizedName.includes(token))
  })
  return matched?.trip_id ?? null
}

function getEvidenceTargetState(state: ActivityState): ActivityState {
  if (state === "in_progress") return "completed"
  if (state === "planned" || state === "ready" || state === "blocked") return "in_progress"
  return state
}

export default function Page() {
  const [activities, setActivities] = useState(scheduleActivities)
  const [activeSection, setActiveSection] = useState("overview")
  const [timelineView, setTimelineView] = useState<TimelineView>("Week")
  const [highlightFlags, setHighlightFlags] = useState<HighlightFlags>({
    delay: true,
    lock: false,
    constraint: true,
  })
  const [jumpDate, setJumpDate] = useState<string>("")
  const [jumpTrigger, setJumpTrigger] = useState(0)
  const [selectedVoyage, setSelectedVoyage] = useState<(typeof voyages)[number] | null>(null)
  const [selectedCollision, setSelectedCollision] = useState<ScheduleConflict | null>(null)
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null)
  const [focusedActivityId, setFocusedActivityId] = useState<string | null>(null)
  const [activeDetailTab, setActiveDetailTab] = useState<DetailTab>("tide")
  const [selectedTrId, setSelectedTrId] = useState<string | null>(null)
  const viewMode = useViewModeOptional()
  const conflicts = useMemo(() => detectResourceConflicts(activities), [activities])
  const baselineConflicts = useMemo(
    () => detectResourceConflicts(scheduleActivities).length,
    []
  )
  const baselineConflictBySeverity = useMemo(() => {
    const baseConflicts = detectResourceConflicts(scheduleActivities)
    return {
      error: baseConflicts.filter((c) => c.severity === "error").length,
      warn: baseConflicts.filter((c) => c.severity === "warn").length,
    }
  }, [])
  const compareConflictBySeverity = useMemo(() => ({
    error: conflicts.filter((c) => c.severity === "error").length,
    warn: conflicts.filter((c) => c.severity === "warn").length,
  }), [conflicts])
  const compareResult = useMemo(() => {
    if (viewMode?.state.mode !== "compare") return null
    return calculateDelta(scheduleActivities, activities, baselineConflicts, conflicts.length, {
      baselineConflictBySeverity,
      compareConflictBySeverity,
      asOf: new Date().toISOString(),
    })
  }, [
    activities,
    baselineConflictBySeverity,
    baselineConflicts,
    compareConflictBySeverity,
    conflicts.length,
    viewMode?.state.mode,
  ])
  const slackMap = useMemo(
    () => calculateSlack(activities, PROJECT_END_DATE),
    [activities]
  )
  // patchmain #1: single initializer only; do not duplicate
  const [ops, setOps] = useState(() =>
    createDefaultOpsState({ activities: scheduleActivities, projectEndDate: PROJECT_END_DATE })
  )
  const ganttRef = useRef<GanttChartHandle>(null)
  const evidenceRef = useRef<HTMLElement>(null)
  const detailPanelRef = useRef<HTMLDivElement>(null)
  const [evidenceTab, setEvidenceTab] = useState<HistoryEvidenceTab | null>(null)
  const [trips, setTrips] = useState<{ trip_id: string; name: string }[]>([])
  const [trs, setTrs] = useState<{ tr_id: string; name: string }[]>([])
  const [ssot, setSsot] = useState<OptionC | null>(null)
  const [ssotError, setSsotError] = useState<string | null>(null)
  const [reflowPreview, setReflowPreview] = useState<{
    changes: ImpactReport["changes"]
    conflicts: ImpactReport["conflicts"]
    nextActivities: ScheduleActivity[]
    scenario?: WhatIfScenario
    affected_count?: number
    conflict_count?: number
    freezeLockViolations?: FreezeLockViolation[]
  } | null>(null)
  const [whatIfMetrics, setWhatIfMetrics] = useState<WhatIfMetrics | null>(null)
  const [showWhatIfPanel, setShowWhatIfPanel] = useState(false)

  useEffect(() => {
    let cancelled = false
    
    fetch("/api/ssot")
      .then((r) => {
        if (!r.ok) throw new Error(`SSOT failed: ${r.status}`)
        return r.json()
      })
      .then((data: OptionC | null) => {
        if (cancelled) return
        
        setSsotError(null)
        if (data) {
          setSsot(data)
        }
        if (data?.entities?.trips) {
          setTrips(
            Object.values(data.entities.trips).map((t: { trip_id: string; name: string }) => ({
              trip_id: t.trip_id,
              name: t.name,
            }))
          )
        }
        if (data?.entities?.trs) {
          setTrs(
            Object.values(data.entities.trs).map((t: { tr_id: string; name: string }) => ({
              tr_id: t.tr_id,
              name: t.name,
            }))
          )
        }
      })
      .catch((e: unknown) => {
        if (cancelled) return
        const msg = e instanceof Error ? e.message : "SSOT load failed"
        setSsotError(msg)
      })
    
    return () => {
      cancelled = true
    }
  }, [])

  const findTrIdForActivity = (activityId: string): string | null => {
    if (!ssot?.entities?.activities) return null
    const activity = ssot.entities.activities[activityId]
    return activity?.tr_ids?.[0] ?? null
  }

  const storyHeaderActivity = useMemo<Activity | null>(() => {
    if (!ssot) return null
    if (selectedActivityId) {
      return ssot.entities.activities[selectedActivityId] ?? null
    }
    if (selectedTrId) {
      const activityId = calculateCurrentActivityForTR(ssot, selectedTrId)
      if (activityId) return ssot.entities.activities[activityId] ?? null
    }
    return null
  }, [ssot, selectedActivityId, selectedTrId])

  const storyHeaderTrId = useMemo(() => {
    return selectedTrId ?? storyHeaderActivity?.tr_ids?.[0] ?? null
  }, [selectedTrId, storyHeaderActivity])

  const storyHeaderData = useMemo(() => {
    if (!ssot || !storyHeaderTrId) {
      return {
        trId: storyHeaderTrId,
        where: undefined,
        whenWhat: undefined,
        evidence: undefined,
      }
    }

    const locationId = calculateCurrentLocationForTR(ssot, storyHeaderTrId)
    const locationName = locationId
      ? ssot.entities.locations[locationId]?.name ?? locationId
      : null
    const where = locationName ? `Now @ ${locationName}` : "Location —"

    const activity = storyHeaderActivity
    const activityTitle = activity?.title ?? activity?.activity_id ?? "—"
    const activityState = activity?.state ?? "—"
    const blockerCode =
      activity?.blocker_code && activity.blocker_code !== "none"
        ? activity.blocker_code
        : "none"
    const whenWhat = activity
      ? `${activityTitle} • ${activityState} • Blocker: ${blockerCode}`
      : "Schedule —"

    let evidence = "Evidence —"
    if (activity) {
      const targetState = getEvidenceTargetState(activity.state)
      const gateResult = checkEvidenceGate(activity, targetState, activity.state, ssot)
      const missingTypes = Array.from(
        new Set(gateResult.missing.map((missing) => missing.evidence_type))
      )
      const typesLabel = missingTypes.length > 0 ? missingTypes.join(", ") : "—"
      evidence = `Missing: ${gateResult.missing.length} | Types: ${typesLabel}`
    }

    return {
      trId: storyHeaderTrId,
      where,
      whenWhat,
      evidence,
    }
  }, [ssot, storyHeaderTrId, storyHeaderActivity])

  // Phase 2: Evidence 배지 variant 계산
  const evidenceBadgeVariant = useMemo(() => {
    if (!storyHeaderActivity || !ssot) return "secondary"
    
    const targetState = getEvidenceTargetState(storyHeaderActivity.state)
    const gateResult = checkEvidenceGate(
      storyHeaderActivity,
      targetState,
      storyHeaderActivity.state,
      ssot
    )
    
    if (gateResult.missing.length === 0) return "success"
    if (gateResult.missing.length <= 2) return "warning"
    return "destructive"
  }, [storyHeaderActivity, ssot])

  // Phase 3: 블록 클릭 핸들러
  const handleWhereClick = () => {
    const mapSection = document.getElementById("map")
    mapSection?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const handleWhenWhatClick = () => {
    if (!selectedActivityId) return
    setActiveDetailTab("detail")
    const detailSection = document.getElementById("detail")
    detailSection?.scrollIntoView({ behavior: "smooth", block: "start" })
    setFocusedActivityId(selectedActivityId)
  }

  const handleEvidenceClick = () => {
    if (!selectedActivityId) return
    evidenceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const handleTrSelect = (trId: string) => {
    setSelectedTrId(trId)
    
    // Activity 자동 선택
    if (ssot) {
      const activityId = calculateCurrentActivityForTR(ssot, trId)
      if (activityId) {
        setActiveDetailTab("detail")
        setSelectedActivityId(activityId)
        setFocusedActivityId(activityId)
        ganttRef.current?.scrollToActivity(activityId)
      }
    }
  }

  const handleApplyPreview = (nextActivities: ScheduleActivity[]) => {
    setActivities(nextActivities)
  }

  // Derive pipeline from activities (memoized)
  const pipelineResult = useMemo(
    () =>
      runPipelineCheck({
        activities,
        noticeDate: ops.notice.date,
        weatherDaysCount: ops.weather.days.length,
        projectEndDate: PROJECT_END_DATE,
      }),
    [activities, ops.notice.date, ops.weather.days.length]
  )

  // Update ops.pipeline when pipelineResult changes
  useEffect(() => {
    setOps((prev) => {
      // Only update if pipeline actually changed (avoid unnecessary re-renders)
      if (prev.pipeline === pipelineResult) return prev
      return {
        ...prev,
        pipeline: pipelineResult,
      }
    })
  }, [pipelineResult])

  useEffect(() => {
    if (!selectedVoyage || !ganttRef.current) return
    const activityId = findFirstActivityInVoyageRange(activities, selectedVoyage)
    if (activityId) ganttRef.current.scrollToActivity(activityId)
  }, [selectedVoyage, activities])

  // patchmain #2,#4: single source for section ids & nav; counts from actual data
  const sections: SectionItem[] = useMemo(
    () => [
      { id: "overview", label: "Overview" },
      { id: "kpi", label: "KPI", count: 6 },
      { id: "alerts", label: "Alerts", count: conflicts.length },
      { id: "voyages", label: "Voyages", count: voyages.length },
      { id: "schedule", label: "Schedule", count: activities.length },
      { id: "gantt", label: "Gantt" },
      { id: "water-tide", label: "Water Tide" },
    ],
    [activities.length, conflicts.length]
  )

  const sectionIds = useMemo(() => sections.map((s) => s.id), [sections])

  useEffect(() => {
    const handler = () => {
      const scrollPosition = window.scrollY + SCROLL_SPY_OFFSET
      let current = sectionIds[0]
      for (const id of sectionIds) {
        const el = document.getElementById(id)
        if (el && el.offsetTop <= scrollPosition) {
          current = id
        }
      }
      setActiveSection(current)
    }
    handler()
    window.addEventListener("scroll", handler)
    return () => window.removeEventListener("scroll", handler)
  }, [sectionIds])

  const handleActivityClick = (activityId: string, start: string) => {
    setWhatIfMetrics(null)
    setReflowPreview(null)
    setActiveDetailTab("detail")
    setSelectedActivityId(activityId)
    setFocusedActivityId(activityId)
    const trId = findTrIdForActivity(activityId)
    if (trId) setSelectedTrId(trId)
    const v = findVoyageByActivityDate(start, voyages)
    if (v) setSelectedVoyage(v)
    // Enable What-If panel when activity is selected
    const activity = activities.find(a => a.activity_id === activityId)
    setShowWhatIfPanel(Boolean(activity))
  }

  const handleOpsCommand = (cmd: Parameters<typeof runAgiOpsPipeline>[0]["command"]) => {
    const { nextActivities, nextOps } = runAgiOpsPipeline({
      activities,
      ops,
      command: cmd,
      projectEndDate: PROJECT_END_DATE,
    })
    setActivities(nextActivities)
    setOps(nextOps)
  }

  const focusTimelineActivity = (activityId: string) => {
    setActiveDetailTab("detail")
    setFocusedActivityId(activityId)
    setSelectedActivityId(activityId)
    const activity = activities.find((a) => a.activity_id === activityId)
    setShowWhatIfPanel(Boolean(activity))
    ganttRef.current?.scrollToActivity(activityId)
    const ganttSection = document.getElementById("gantt")
    ganttSection?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const handleViewInTimeline = (collision: ScheduleConflict, activityId?: string) => {
    const targetId = activityId ?? collision.activity_id
    if (!targetId) return
    focusTimelineActivity(targetId)
  }

  const handleJumpToEvidence = () => {
    setEvidenceTab("evidence")
    evidenceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const handleJumpToHistory = () => {
    setEvidenceTab("history")
    evidenceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const handleCollisionCardOpen = (params: {
    collisionId?: string
    conflict?: ScheduleConflict
    activityId?: string | null
  }) => {
    const mapped =
      params.collisionId && ssot?.collisions?.[params.collisionId]
        ? mapSsotCollisionToScheduleConflict(ssot.collisions[params.collisionId])
        : params.conflict ?? null
    if (!mapped) return

    const resolvedActivityId = params.activityId ?? mapped.activity_id ?? mapped.activity_ids?.[0] ?? null
    const normalized = resolvedActivityId ? { ...mapped, activity_id: resolvedActivityId } : mapped

    setSelectedCollision(normalized)
    if (resolvedActivityId) {
      setSelectedActivityId(resolvedActivityId)
      setFocusedActivityId(resolvedActivityId)
      ganttRef.current?.scrollToActivity(resolvedActivityId)
      setShowWhatIfPanel(true)
    }
  }

  const handleOpenWhyDetail = (collision: ScheduleConflict) => {
    const resolvedActivityId =
      (collision.activity_id && collision.activity_id.trim()) ||
      collision.activity_ids?.[0] ||
      null
    if (resolvedActivityId) {
      setSelectedActivityId(resolvedActivityId)
      setFocusedActivityId(resolvedActivityId)
    }
    detailPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
    detailPanelRef.current?.focus()
  }

  const openActivityFromGantt = (activityId: string) => {
    setActiveDetailTab("detail")
    const activity = activities.find((a) => a.activity_id === activityId)
    if (activity) {
      handleActivityClick(activityId, activity.planned_start)
      return
    }
    setSelectedActivityId(activityId)
    setFocusedActivityId(activityId)
  }

  const handleOpenEvidence = (activityId: string) => {
    openActivityFromGantt(activityId)
    setEvidenceTab("evidence")
    evidenceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const handleOpenHistory = (activityId: string) => {
    openActivityFromGantt(activityId)
    setEvidenceTab("history")
    evidenceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const handleActualUpdate = async (
    activityId: string,
    payload: { actualStart: string | null; actualEnd: string | null }
  ) => {
    if (!activityId || typeof activityId !== "string" || !activityId.trim()) {
      throw new Error("No activity selected. Select an activity from the Gantt or Map first.")
    }
    const response = await fetch(`/api/activities/${activityId}/actual`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actualStart: payload.actualStart,
        actualEnd: payload.actualEnd,
      }),
    })

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null
      throw new Error(data?.error || "Failed to update actual dates")
    }

    const data = (await response.json()) as {
      activity: Activity
      historyEvent?: { event_id: string }
      transition?: { success: boolean; blocker_code?: string; reason?: string }
      transitionEvent?: { event_id: string } | null
    }

    const actualStartIso = data.activity?.actual?.start_ts ?? payload.actualStart
    const actualEndIso = data.activity?.actual?.end_ts ?? payload.actualEnd
    const actualStartDate = actualStartIso ? actualStartIso.slice(0, 10) : undefined
    const actualEndDate = actualEndIso ? actualEndIso.slice(0, 10) : undefined

    setActivities((prev) =>
      prev.map((activity) => {
        if (activity.activity_id !== activityId) return activity
        const nextStatus = actualEndDate
          ? "done"
          : actualStartDate
            ? "in_progress"
            : activity.status
        return {
          ...activity,
          actual_start: actualStartDate,
          actual_finish: actualEndDate,
          status: nextStatus,
        }
      })
    )
    setReflowPreview(null)
    setWhatIfMetrics(null)

    setSsot((prev) => {
      if (!prev) return prev
      const nextActivities = {
        ...prev.entities.activities,
        [activityId]: data.activity,
      }
      const nextHistory = [
        ...(prev.history_events ?? []),
        ...(data.transitionEvent ? [data.transitionEvent as any] : []),
        ...(data.historyEvent ? [data.historyEvent as any] : []),
      ]
      return {
        ...prev,
        entities: {
          ...prev.entities,
          activities: nextActivities,
        },
        history_events: nextHistory,
      }
    })

    return { transition: data.transition }
  }

  const selectedTripId = viewMode?.state.selectedTripId ?? null
  const canApplyReflow = viewMode?.canApplyReflow ?? true
  const isLiveMode = viewMode?.state.mode ? viewMode.state.mode === "live" : true
  const tripIdFromVoyage = useMemo(
    () => matchTripIdForVoyage(selectedVoyage, trips),
    [selectedVoyage, trips]
  )
  const readinessTripId = selectedTripId ?? tripIdFromVoyage ?? null
  const weatherPreviewFull = useMemo(() => {
    if (!isLiveMode) return null
    const direct = buildWeatherDelayPreview(activities, weatherForecast, weatherLimits)
    if (direct.length === 0) return null
    return propagateWeatherDelays(activities, direct)
  }, [activities, isLiveMode])

  const handleApplyAction = (_collision: ScheduleConflict, action: SuggestedAction) => {
    if (action.kind !== "shift_activity") return
    const activityId = action.params?.activity_id as string | undefined
    const newStart = action.params?.new_start as string | undefined
    if (!activityId || !newStart) return

    try {
      const result = reflowSchedule(activities, activityId, newStart, {
        respectLocks: true,
        checkResourceConflicts: true,
      })
      setReflowPreview({
        changes: result.impact_report.changes,
        conflicts: result.impact_report.conflicts,
        nextActivities: result.activities,
        freezeLockViolations: result.impact_report.freeze_lock_violations ?? [],
      })
    } catch {
      setReflowPreview(null)
    }
  }

  const MAX_UNDO = 20
  const undoStackRef = useRef<ScheduleActivity[][]>([])
  const [undoCount, setUndoCount] = useState(0)

  const handleApplyPreviewFromWhy = (reason: string) => {
    if (!reflowPreview) return
    const stack = undoStackRef.current
    if (stack.length < MAX_UNDO) stack.push([...activities])
    setUndoCount(stack.length)
    setActivities(reflowPreview.nextActivities)
    setReflowPreview(null)
    // M2-PR3: audit trail — store reason for reflow apply in History
    appendHistoryEvent({
      event_type: "reflow_applied",
      message: reason,
      trip_id: trips[0]?.trip_id,
    })
  }

  const handleUndoLastApply = () => {
    const stack = undoStackRef.current
    if (stack.length === 0) return
    const previous = stack.pop()
    if (previous) {
      setActivities(previous)
      setUndoCount(stack.length)
    }
  }

  // What-If Simulation handlers
  const handleWhatIfSimulate = (scenario: WhatIfScenario) => {
    const activity = activities.find(a => a.activity_id === scenario.activity_id)
    if (!activity) return

    const baseDate = parseUTCDate(activity.planned_start.slice(0, 10))
    const newDate = addUTCDays(baseDate, scenario.delay_days)
    const newStart = dateToIsoUtc(newDate)

    try {
      const result = reflowSchedule(activities, scenario.activity_id, newStart, {
        respectLocks: true,
        checkResourceConflicts: true,
      })

      // Calculate metrics
      const affectedCount = result.impact_report.changes.length
      const totalDelay = scenario.delay_days
      const newConflicts = result.impact_report.conflicts.length
      
      // Calculate project ETA change (simplified - comparing last activity finish)
      const currentLastFinish = Math.max(
        ...activities.map(a => new Date(a.planned_finish).getTime())
      )
      const newLastFinish = Math.max(
        ...result.activities.map(a => new Date(a.planned_finish).getTime())
      )
      const etaChangeDays = Math.round(
        (newLastFinish - currentLastFinish) / (1000 * 60 * 60 * 24)
      )

      setWhatIfMetrics({
        affected_activities: affectedCount,
        total_delay_days: totalDelay,
        new_conflicts: newConflicts,
        project_eta_change: etaChangeDays,
      })

      setReflowPreview({
        changes: result.impact_report.changes,
        conflicts: result.impact_report.conflicts,
        nextActivities: result.activities,
        scenario,
        affected_count: affectedCount,
        conflict_count: newConflicts,
        freezeLockViolations: result.impact_report.freeze_lock_violations ?? [],
      })
    } catch (error) {
      console.error("What-If simulation failed:", error)
      setReflowPreview(null)
      setWhatIfMetrics(null)
    }
  }

  const handleWhatIfCancel = () => {
    setShowWhatIfPanel(false)
    setReflowPreview(null)
    setWhatIfMetrics(null)
  }

  useEffect(() => {
    const syncWaterTideHash = () => {
      if (window.location.hash !== "#water-tide") return
      setActiveDetailTab("tide")
      requestAnimationFrame(() => {
        document.getElementById("water-tide")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        })
      })
    }
    syncWaterTideHash()
    window.addEventListener("hashchange", syncWaterTideHash)
    return () => window.removeEventListener("hashchange", syncWaterTideHash)
  }, [])

  const handleCompareDrillDown = (activityIds: string[]) => {
    const targetId = activityIds[0]
    if (!targetId) return
    setSelectedActivityId(targetId)
    setFocusedActivityId(targetId)
    ganttRef.current?.scrollToActivity(targetId)
    const ganttSection = document.getElementById("gantt")
    ganttSection?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <DateProvider>
      <div className="relative z-10 flex min-h-screen w-full max-w-[1920px] flex-col mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 bg-card/95 border border-accent/20 rounded-lg px-3 py-2 text-sm font-medium text-foreground shadow-glow"
        >
          Skip to content
        </a>

        <DashboardHeader />
        {UNIFIED_COMMAND_PALETTE_ENABLED ? (
          <UnifiedCommandPalette
            activities={activities}
            setActivities={setActivities}
            onFocusActivity={focusTimelineActivity}
            viewMode={viewMode?.state.mode}
          />
        ) : null}
        {ssotError && (
          <div
            className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-2 text-sm text-amber-800 dark:text-amber-200"
            role="alert"
          >
            {ssotError}
          </div>
        )}
        <main id="main" tabIndex={-1} className="flex flex-1 flex-col min-h-0">
          <DashboardLayout
            trips={trips}
            trs={trs}
            onReflowPreview={() => setJumpTrigger((n) => n + 1)}
          >
            <ApprovalModeBanner activities={activities} />
            <CompareModeBanner compareResult={compareResult} onDrillDown={handleCompareDrillDown} />
                <StoryHeader
              trId={storyHeaderData.trId}
              where={storyHeaderData.where}
              whenWhat={storyHeaderData.whenWhat}
              evidence={storyHeaderData.evidence}
              trs={trs}
              onTrSelect={handleTrSelect}
              evidenceBadgeVariant={evidenceBadgeVariant}
              onWhereClick={handleWhereClick}
              onWhenWhatClick={handleWhenWhatClick}
              onEvidenceClick={handleEvidenceClick}
            />
                <OverviewSection
                  activities={activities}
                  selectedVoyage={selectedVoyage}
                  onApplyActivities={handleApplyPreview}
                  onSetActivities={setActivities}
                  onFocusActivity={(id) => ganttRef.current?.scrollToActivity(id)}
                />
            <SectionNav
              activeSection={activeSection}
              sections={sections}
              onSectionClick={(sectionId) => {
                if (sectionId === "water-tide") setActiveDetailTab("tide")
              }}
            />

            <div className="flex flex-1 flex-col min-h-0 space-y-6">
              <KPISection />
              <AlertsSection activities={activities} />
              <TrThreeColumnLayout
                mapSlot={
                  <div className="space-y-3">
                    <WidgetErrorBoundary
                      widgetName="Map"
                      fallback={
                        <WidgetErrorFallback
                          widgetName="Map"
                          onRetry={() => window.location.reload()}
                        />
                      }
                    >
                      <MapPanelWrapper
                        ssot={ssot}
                        selectedActivityId={selectedActivityId ?? selectedCollision?.activity_id ?? focusedActivityId ?? null}
                        onTrClick={(trId) => setSelectedTrId(trId)}
                        onActivitySelect={(activityId) => {
                          setActiveDetailTab("detail")
                          setSelectedActivityId(activityId)
                          setFocusedActivityId(activityId)
                          const trId = findTrIdForActivity(activityId)
                          if (trId) setSelectedTrId(trId)
                          ganttRef.current?.scrollToActivity?.(activityId)
                          const ganttSection = document.getElementById("gantt")
                          ganttSection?.scrollIntoView({ behavior: "smooth", block: "start" })
                        }}
                        onCollisionClick={(collisionId, activityId) =>
                          handleCollisionCardOpen({ collisionId, activityId })
                        }
                      />
                    </WidgetErrorBoundary>
                    <VoyagesSection
                      onSelectVoyage={setSelectedVoyage}
                      selectedVoyage={selectedVoyage}
                    />
                  </div>
                }
                timelineSlot={
                  <div className="flex flex-1 flex-col min-h-0">
                    <ScheduleSection />
                    <WidgetErrorBoundary
                      widgetName="Gantt"
                      fallback={
                        <WidgetErrorFallback
                          widgetName="Gantt"
                          onRetry={() => window.location.reload()}
                        />
                      }
                    >
                      <GanttSection
                      ganttRef={ganttRef}
                      activities={activities}
                      ssot={ssot}
                      view={timelineView}
                      onViewChange={setTimelineView}
                      highlightFlags={highlightFlags}
                      onHighlightFlagsChange={setHighlightFlags}
                      jumpDate={jumpDate}
                      onJumpDateChange={setJumpDate}
                      jumpTrigger={jumpTrigger}
                      onJumpRequest={() => setJumpTrigger((n) => n + 1)}
                      onActivityClick={handleActivityClick}
                      onActivityDeselect={() => {
                        setFocusedActivityId(null)
                        setSelectedActivityId(null)
                        setSelectedTrId(null)
                        setShowWhatIfPanel(false)
                        setWhatIfMetrics(null)
                        setReflowPreview(null)
                        setActiveDetailTab("tide")
                      }}
                      conflicts={conflicts}
                      onCollisionClick={(col) => {
                        handleCollisionCardOpen({ conflict: col, activityId: col.activity_id })
                      }}
                      focusedActivityId={focusedActivityId}
                      projectEndDate={PROJECT_END_DATE}
                      compareDelta={compareResult}
                      reflowPreview={
                        reflowPreview
                          ? {
                              changes: reflowPreview.changes,
                              metadata: reflowPreview.scenario
                                ? {
                                    type: "what_if" as const,
                                  scenario: {
                                    reason: reflowPreview.scenario.reason,
                                    confidence: reflowPreview.scenario.confidence,
                                    delay_days: reflowPreview.scenario.delay_days,
                                    activity_name: reflowPreview.scenario.activity_name,
                                  },
                                  affected_count: reflowPreview.affected_count,
                                  conflict_count: reflowPreview.conflict_count,
                                }
                              : undefined,
                            }
                          : null
                      }
                      weatherPreview={weatherPreviewFull?.direct_changes ?? null}
                      weatherPropagated={weatherPreviewFull?.propagated_changes ?? null}
                      weatherForecast={weatherForecast}
                      weatherLimits={weatherLimits}
                      weatherOverlayVisible={isLiveMode}
                      weatherOverlayOpacity={0.15}
                      onOpenEvidence={handleOpenEvidence}
                      onOpenHistory={handleOpenHistory}
                    />
                    </WidgetErrorBoundary>
                  </div>
                }
                detailSlot={
                  <div className="space-y-3">
                    <section id="water-tide" aria-label="Water Tide detail panel" className="space-y-3">
                      <div className="rounded-xl border border-accent/20 bg-card/80 p-1">
                        <div className="grid grid-cols-2 gap-1">
                          <button
                            type="button"
                            onClick={() => setActiveDetailTab("detail")}
                            className={
                              "rounded-lg px-3 py-2 text-xs font-semibold transition-colors " +
                              (activeDetailTab === "detail"
                                ? "bg-cyan-500/20 text-foreground"
                                : "text-muted-foreground hover:bg-accent/15 hover:text-foreground")
                            }
                          >
                            Detail
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveDetailTab("tide")}
                            className={
                              "rounded-lg px-3 py-2 text-xs font-semibold transition-colors " +
                              (activeDetailTab === "tide"
                                ? "bg-cyan-500/20 text-foreground"
                                : "text-muted-foreground hover:bg-accent/15 hover:text-foreground")
                            }
                          >
                            Tide
                          </button>
                        </div>
                      </div>

                      {activeDetailTab === "tide" ? (
                        <WaterTidePanel />
                      ) : (
                        <>
                          {showWhatIfPanel && (
                            <WhatIfPanel
                              activity={
                                selectedActivityId
                                  ? activities.find((a) => a.activity_id === selectedActivityId) ?? null
                                  : null
                              }
                              onSimulate={handleWhatIfSimulate}
                              onCancel={handleWhatIfCancel}
                              metrics={whatIfMetrics}
                              isSimulating={false}
                            />
                          )}
                          <div ref={detailPanelRef} tabIndex={-1} className="outline-none">
                            <DetailPanel
                              activity={
                                selectedActivityId
                                  ? activities.find((a) => a.activity_id === selectedActivityId) ?? null
                                  : null
                              }
                              slackResult={
                                selectedActivityId ? slackMap.get(selectedActivityId) ?? null : null
                              }
                              conflicts={conflicts}
                              onClose={() => {
                                setSelectedActivityId(null)
                                setActiveDetailTab("tide")
                              }}
                              onActualUpdate={handleActualUpdate}
                              onCollisionClick={(col) => {
                                handleCollisionCardOpen({ conflict: col, activityId: col.activity_id })
                              }}
                            />
                          </div>
                          <WhyPanel
                            collision={selectedCollision}
                            onClose={() => setSelectedCollision(null)}
                            onViewInTimeline={handleViewInTimeline}
                            onJumpToEvidence={handleJumpToEvidence}
                            onJumpToHistory={handleJumpToHistory}
                            onOpenWhyDetail={handleOpenWhyDetail}
                            onRelatedActivityClick={focusTimelineActivity}
                            onApplyAction={handleApplyAction}
                          />
                          {reflowPreview && (
                            <ReflowPreviewPanel
                              changes={reflowPreview.changes}
                              conflicts={reflowPreview.conflicts.map((c) => ({
                                message: c.message,
                                severity: c.severity,
                              }))}
                              onApply={handleApplyPreviewFromWhy}
                              onCancel={() => setReflowPreview(null)}
                              canApply={canApplyReflow}
                              isApprovalMode={viewMode?.state.mode === "approval"}
                              freezeLockViolations={reflowPreview.freezeLockViolations ?? []}
                            />
                          )}
                          {undoCount > 0 && (
                            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200 flex items-center justify-between gap-2">
                              <span>일정 적용됨.{undoCount > 1 ? ` 실행 취소 ${undoCount}회 가능.` : ""}</span>
                              <button
                                type="button"
                                onClick={handleUndoLastApply}
                                className="font-semibold text-cyan-300 hover:text-cyan-200 underline"
                              >
                                실행 취소{undoCount > 1 ? ` (${undoCount})` : ""}
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </section>
                  </div>
                }
              />
              <section
                id="evidence"
                ref={evidenceRef}
                aria-label="Verification"
                className="space-y-3"
              >
                <HistoryEvidencePanel
                  selectedActivityId={
                    selectedActivityId ?? selectedCollision?.activity_id ?? null
                  }
                  requestedTab={evidenceTab}
                  onTabChange={setEvidenceTab}
                />
                <ReadinessPanel ssot={ssot} tripId={readinessTripId} />
                <NotesDecisions />
              </section>
            </div>
          </DashboardLayout>

          <Footer />
          <BackToTop />
          {selectedVoyage && (
            <VoyageFocusDrawer
              voyage={selectedVoyage}
              onClose={() => setSelectedVoyage(null)}
            />
          )}
        </main>
      </div>
    </DateProvider>
  )
}
