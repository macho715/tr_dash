import type { ScheduleActivity } from "@/lib/ssot/schedule"
import { reflowSchedule } from "@/lib/utils/schedule-reflow"
import type { WeatherDelayChange } from "@/lib/weather/weather-delay-preview"

export interface WeatherReflowChainResult {
  direct_changes: WeatherDelayChange[]
  propagated_changes: WeatherDelayChange[]
  total_affected: number
}

function withActualsLocked(activities: ScheduleActivity[]): ScheduleActivity[] {
  return activities.map((activity) => {
    if (activity.actual_start || activity.actual_finish) {
      if (activity.is_locked) return activity
      return { ...activity, is_locked: true }
    }
    return activity
  })
}

export function propagateWeatherDelays(
  activities: ScheduleActivity[],
  weatherChanges: WeatherDelayChange[]
): WeatherReflowChainResult {
  if (weatherChanges.length === 0) {
    return { direct_changes: [], propagated_changes: [], total_affected: 0 }
  }

  const sorted = [...weatherChanges].sort((a, b) => {
    const byDate = a.new_start.localeCompare(b.new_start)
    if (byDate !== 0) return byDate
    return a.activity_id.localeCompare(b.activity_id)
  })
  const pivot = sorted[0]
  const lockedActivities = withActualsLocked(activities)
  const reflowResult = reflowSchedule(
    lockedActivities,
    pivot.activity_id,
    pivot.new_start,
    {
      respectLocks: true,
      checkResourceConflicts: false,
    }
  )
  const directIds = new Set(weatherChanges.map((c) => c.activity_id))
  const propagated = reflowResult.impact_report.changes
    .filter((change) => !directIds.has(change.activity_id))
    .map((change) => ({
      ...change,
      reason: "Propagated from weather delay",
    }))

  return {
    direct_changes: weatherChanges,
    propagated_changes: propagated,
    total_affected: weatherChanges.length + propagated.length,
  }
}
