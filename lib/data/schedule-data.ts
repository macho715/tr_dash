/**
 * Schedule Data Loader
 *
 * option_c.json -> ScheduleActivity[]
 * Dependencies inferred from level2 + chronological order (FS).
 */

import type { Activity, ActivityType, GanttRow } from "@/lib/dashboard-data"
import type { AnchorType, ScheduleActivity } from "@/lib/ssot/schedule"
import { mapOptionCJsonToScheduleActivities } from "@/lib/ssot/utils/schedule-mapper"
import { inferDependencies } from "@/lib/utils/infer-dependencies"
import optionCDataRaw from "../../data/schedule/option_c.json"
import optionCv08Raw from "../../data/schedule/option_c_v0.8.0.json"

type OptionCSource = {
  activities?: Record<string, unknown>[]
  entities?: {
    activities?: Record<string, Record<string, unknown>>
  }
  contract?: { version?: string }
}

function hasActivitiesArray(source: OptionCSource | null | undefined): boolean {
  return Array.isArray(source?.activities) && source.activities.length > 0
}

function hasEntitiesActivities(source: OptionCSource | null | undefined): boolean {
  const entities = source?.entities
  if (!entities) return false
  const activities = entities.activities
  return typeof activities === "object" && activities !== null && Object.keys(activities).length > 0
}

function normalizeToActivitiesArray(source: OptionCSource): { activities: Record<string, unknown>[] } {
  // Contract v0.8.0 format: entities.activities (dictionary)
  if (hasEntitiesActivities(source)) {
    const activitiesDict = source.entities!.activities!
    const activitiesArray = Object.entries(activitiesDict).map(([id, activity]) => ({
      activity_id: id,
      ...activity
    }))
    return { activities: activitiesArray }
  }
  
  // Legacy format: activities (array)
  if (hasActivitiesArray(source)) {
    return { activities: source.activities! }
  }
  
  return { activities: [] }
}

let selectedSource: OptionCSource | null = null
const optionCv08 = optionCv08Raw as OptionCSource
const optionCLegacy = optionCDataRaw as OptionCSource

// Prefer option_c_v0.8.0.json (Contract SSOT with actuals) when it has entities; else option_c.json (pipeline/legacy)
if (hasEntitiesActivities(optionCv08) || hasActivitiesArray(optionCv08)) {
  selectedSource = optionCv08
  if (process.env.NODE_ENV !== "production") {
    const format = hasEntitiesActivities(optionCv08) ? "v0.8.0 (entities)" : "v0.8.0 (array)"
    console.log(`[SSOT] Using option_c_v0.8.0.json (${format})`)
  }
} else if (hasEntitiesActivities(optionCLegacy) || hasActivitiesArray(optionCLegacy)) {
  selectedSource = optionCLegacy
  if (process.env.NODE_ENV !== "production") {
    console.log("[SSOT] Using option_c.json (pipeline/legacy)")
  }
} else {
  selectedSource = { activities: [] }
  console.error(
    "[SSOT] No valid SSOT activities found in option_c.json or option_c_v0.8.0.json."
  )
}

const normalizedSource = normalizeToActivitiesArray(selectedSource)
const mapped = mapOptionCJsonToScheduleActivities(normalizedSource)
export const scheduleActivities: ScheduleActivity[] = inferDependencies(mapped)

function mapAnchorTypeToActivityType(anchorType: AnchorType | undefined): ActivityType {
  switch (anchorType) {
    case "LOADOUT":
      return "loadout"
    case "SAIL_AWAY":
      return "transport"
    case "BERTHING":
      return "loadin"
    case "LOADIN":
      return "loadin"
    case "TURNING":
      return "turning"
    case "JACKDOWN":
      return "jackdown"
    default:
      return "mobilization"
  }
}

function scheduleActivityToActivity(activity: ScheduleActivity): Activity | null {
  if (activity.activity_id === null) return null

  const activityType = mapAnchorTypeToActivityType(activity.anchor_type)
  const activityName = activity.activity_name || activity.activity_id
  const label = `${activity.activity_id}: ${activityName}`

  return {
    start: activity.planned_start,
    end: activity.planned_finish,
    type: activityType,
    label,
  }
}

export function scheduleActivitiesToGanttRows(
  activities: ScheduleActivity[]
): GanttRow[] {
  const rows: GanttRow[] = []
  const level1Groups = new Map<string, ScheduleActivity[]>()

  for (const activity of activities) {
    const key = activity.level1
    if (!level1Groups.has(key)) {
      level1Groups.set(key, [])
    }
    level1Groups.get(key)!.push(activity)
  }

  for (const [level1, level1Activities] of level1Groups.entries()) {
    const level1Summary = level1Activities.find(
      (activity) => activity.activity_id === null && activity.level2 === null
    )
    if (level1Summary) {
      rows.push({
        name: level1Summary.activity_name || level1,
        isHeader: true,
      })
    }

    const level2Groups = new Map<string | null, ScheduleActivity[]>()
    for (const activity of level1Activities) {
      const key = activity.level2
      if (!level2Groups.has(key)) {
        level2Groups.set(key, [])
      }
      level2Groups.get(key)!.push(activity)
    }

    for (const [level2, level2Activities] of level2Groups.entries()) {
      if (level2 === null) continue

      const level2Summary = level2Activities.find((activity) => activity.activity_id === null)
      const rowName = level2Summary
        ? level2Summary.activity_name || level2
        : level2 || level1

      const rowActivities: Activity[] = []
      for (const activity of level2Activities) {
        if (activity.activity_id !== null) {
          const converted = scheduleActivityToActivity(activity)
          if (converted) {
            rowActivities.push(converted)
          }
        }
      }

      if (rowActivities.length > 0 || level2Summary) {
        rows.push({
          name: rowName,
          isHeader: false,
          activities: rowActivities.length > 0 ? rowActivities : undefined,
        })
      }
    }
  }

  return rows
}
