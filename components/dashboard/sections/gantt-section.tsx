"use client"

import type { Ref } from "react"
import { GanttChart, type GanttChartHandle } from "@/components/dashboard/gantt-chart"
import type { HighlightFlags, TimelineView } from "@/components/dashboard/timeline-controls"
import type { DateChange, ScheduleActivity, ScheduleConflict } from "@/lib/ssot/schedule"
import type { WeatherDelayChange } from "@/lib/weather/weather-delay-preview"
import type { WeatherForecastData, WeatherLimits } from "@/lib/weather/weather-service"
import type { CompareResult } from "@/lib/compare/types"
import type { GhostBarMetadata } from "@/lib/gantt/visTimelineMapper"
import type { OptionC } from "@/src/types/ssot"

type GanttSectionProps = {
  ganttRef: Ref<GanttChartHandle>
  activities: ScheduleActivity[]
  ssot?: OptionC | null
  view: TimelineView
  onViewChange: (view: TimelineView) => void
  highlightFlags: HighlightFlags
  onHighlightFlagsChange: (flags: HighlightFlags) => void
  jumpDate: string
  onJumpDateChange: (value: string) => void
  jumpTrigger: number
  onJumpRequest: () => void
  onActivityClick?: (activityId: string, start: string) => void
  onActivityDeselect?: () => void
  conflicts?: ScheduleConflict[]
  onCollisionClick?: (conflict: ScheduleConflict) => void
  focusedActivityId?: string | null
  compareDelta?: CompareResult | null
  reflowPreview?: {
    changes: DateChange[]
    metadata?: GhostBarMetadata
  } | DateChange[] | null
  weatherPreview?: WeatherDelayChange[] | null
  weatherPropagated?: WeatherDelayChange[] | null
  weatherForecast?: WeatherForecastData
  weatherLimits?: WeatherLimits
  weatherOverlayVisible?: boolean
  weatherOverlayOpacity?: number
  projectEndDate: string
  onOpenEvidence?: (activityId: string) => void
  onOpenHistory?: (activityId: string) => void
  /** Drag-to-Edit: called when user drags an activity bar to a new date */
  onDragMove?: (activityId: string, newStart: string) => void
}

export function GanttSection({
  ganttRef,
  activities,
  ssot,
  view,
  onViewChange,
  highlightFlags,
  onHighlightFlagsChange,
  jumpDate,
  onJumpDateChange,
  jumpTrigger,
  onJumpRequest,
  onActivityClick,
  onActivityDeselect,
  conflicts,
  onCollisionClick,
  focusedActivityId,
  compareDelta,
  reflowPreview,
  weatherPreview,
  weatherPropagated,
  weatherForecast,
  weatherLimits,
  weatherOverlayVisible,
  weatherOverlayOpacity,
  projectEndDate,
  onOpenEvidence,
  onOpenHistory,
  onDragMove,
}: GanttSectionProps) {
  return (
    <section id="gantt" aria-label="Gantt Chart" className="flex flex-1 flex-col min-h-0">
      <GanttChart
        ref={ganttRef}
        activities={activities}
        ssot={ssot}
        view={view}
        onViewChange={onViewChange}
        highlightFlags={highlightFlags}
        onHighlightFlagsChange={onHighlightFlagsChange}
        jumpDate={jumpDate}
        onJumpDateChange={onJumpDateChange}
        jumpTrigger={jumpTrigger}
        onJumpRequest={onJumpRequest}
        onActivityClick={onActivityClick}
        onActivityDeselect={onActivityDeselect}
        conflicts={conflicts}
        onCollisionClick={onCollisionClick}
        focusedActivityId={focusedActivityId}
        compareDelta={compareDelta}
        reflowPreview={reflowPreview}
        weatherPreview={weatherPreview}
        weatherPropagated={weatherPropagated}
        weatherForecast={weatherForecast}
        weatherLimits={weatherLimits}
        weatherOverlayVisible={weatherOverlayVisible}
        weatherOverlayOpacity={weatherOverlayOpacity}
        projectEndDate={projectEndDate}
        onOpenEvidence={onOpenEvidence}
        onOpenHistory={onOpenHistory}
        onDragMove={onDragMove}
      />
    </section>
  )
}
