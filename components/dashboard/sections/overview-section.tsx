"use client"

import { OperationOverviewRibbon } from "@/components/dashboard/operation-overview"
import { MilestoneTracker } from "@/components/dashboard/milestone-tracker"
import { AgiScheduleUpdaterBar } from "@/components/dashboard/agi-schedule-updater-bar"
import { AgiOpsDock } from "@/components/ops/AgiOpsDock"
import type { ImpactReport, ScheduleActivity } from "@/lib/ssot/schedule"
import { voyages } from "@/lib/dashboard-data"

const UNIFIED_COMMAND_PALETTE_ENABLED =
  process.env.NEXT_PUBLIC_UNIFIED_COMMAND_PALETTE === "true"

type OverviewSectionProps = {
  activities: ScheduleActivity[]
  selectedVoyage: (typeof voyages)[number] | null
  onApplyActivities: (nextActivities: ScheduleActivity[], impactReport: ImpactReport | null) => void
  onSetActivities: (nextActivities: ScheduleActivity[]) => void
  onFocusActivity?: (activityId: string) => void
}

export function OverviewSection({
  activities,
  selectedVoyage,
  onApplyActivities,
  onSetActivities,
  onFocusActivity,
}: OverviewSectionProps) {
  return (
    <section id="overview" aria-label="Operation Overview" className="space-y-4">
      <OperationOverviewRibbon />
      <MilestoneTracker voyage={selectedVoyage} activities={activities} />
      {!UNIFIED_COMMAND_PALETTE_ENABLED ? (
        <div className="mt-6 space-y-6">
          <AgiOpsDock
            activities={activities}
            setActivities={onSetActivities}
            onFocusQuery={onFocusActivity}
            showBulkAnchors={false}
          />
          <AgiScheduleUpdaterBar
            activities={activities}
            onApplyActivities={onApplyActivities}
            onFocusActivity={onFocusActivity}
          />
        </div>
      ) : null}
    </section>
  )
}
