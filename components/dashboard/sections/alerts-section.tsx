"use client"

import { AlertsTriage, type AlertNavigateSectionId } from "@/components/dashboard/alerts"
import type { ScheduleActivity } from "@/lib/ssot/schedule"

type AlertsSectionProps = {
  activities?: ScheduleActivity[]
  onSelectVoyageNo?: (voyageNo: number) => void
  onNavigateSection?: (sectionId: AlertNavigateSectionId) => void
}

export function AlertsSection({
  activities = [],
  onSelectVoyageNo,
  onNavigateSection,
}: AlertsSectionProps) {
  return (
    <section id="alerts" aria-label="Alerts Triage">
      <AlertsTriage
        activities={activities}
        onSelectVoyageNo={onSelectVoyageNo}
        onNavigateSection={onNavigateSection}
      />
    </section>
  )
}
