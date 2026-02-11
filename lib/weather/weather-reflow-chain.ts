import type { ScheduleActivity } from "@/lib/ssot/schedule"
import { previewScheduleReflow } from "@/src/lib/reflow/schedule-reflow-manager"
import type { IsoDate } from "@/lib/ops/agi/types"
import type { WeatherDelayChange } from "@/lib/weather/weather-delay-preview"
import { diffUTCDays } from "@/lib/ssot/schedule"
import { applyBulkAnchors } from "@/lib/ops/agi/applyShift"

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

function buildWeatherDateChanges(
  beforeActivities: ScheduleActivity[],
  afterActivities: ScheduleActivity[],
  directIds: Set<string>
): WeatherDelayChange[] {
  const afterById = new Map<string, ScheduleActivity>()
  for (const activity of afterActivities) {
    if (!activity.activity_id) continue
    afterById.set(activity.activity_id, activity)
  }

  const changes: WeatherDelayChange[] = []
  for (const before of beforeActivities) {
    const activityId = before.activity_id
    if (!activityId || directIds.has(activityId)) continue
    const after = afterById.get(activityId)
    if (!after) continue
    if (
      before.planned_start === after.planned_start &&
      before.planned_finish === after.planned_finish
    ) {
      continue
    }

    changes.push({
      activity_id: activityId,
      old_start: before.planned_start,
      new_start: after.planned_start,
      old_finish: before.planned_finish,
      new_finish: after.planned_finish,
      delta_days: diffUTCDays(before.planned_start, after.planned_start),
      reason: "Propagated from weather delay",
    })
  }

  return changes
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
  const reflowResult = previewScheduleReflow({
    activities: lockedActivities,
    anchors: [{ activityId: pivot.activity_id, newStart: pivot.new_start as IsoDate }],
    options: {
      respectLocks: true,
      checkResourceConflicts: false,
    },
    mode: "shift",
  })
  const directIds = new Set(weatherChanges.map((c) => c.activity_id))
  let propagated: WeatherDelayChange[] = reflowResult.impact.changes
    .filter((change) => !directIds.has(change.activity_id))
    .map((change) => ({
      ...change,
      reason: "Propagated from weather delay",
    }))

  // Backward-compatible fallback: when dependency data is absent, retain pivot-based chain shift.
  if (propagated.length === 0) {
    const pivotShiftActivities = applyBulkAnchors({
      activities: lockedActivities,
      anchors: [{ activityId: pivot.activity_id, newStart: pivot.new_start as IsoDate }],
      includeLocked: false,
      strategy: "pivot_shift",
    })
    propagated = buildWeatherDateChanges(lockedActivities, pivotShiftActivities, directIds)
  }

  return {
    direct_changes: weatherChanges,
    propagated_changes: propagated,
    total_affected: weatherChanges.length + propagated.length,
  }
}
