"use client"

import { AlertsTriage } from "@/components/dashboard/alerts"
import type { ScheduleActivity } from "@/lib/ssot/schedule"

type AlertsSectionProps = {
  activities?: ScheduleActivity[]
}

export function AlertsSection({ activities = [] }: AlertsSectionProps) {
  return (
    <section id="alerts" aria-label="Alerts Triage">
      <AlertsTriage activities={activities} />
    </section>
  )
}
