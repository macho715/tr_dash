import { parseDateToNoonUtc, toUtcNoon } from "@/lib/ssot/schedule"
import type { ScheduleActivity, TRUnitId } from "@/lib/ssot/schedule"
import type { ViewMode } from "@/src/lib/stores/view-mode-store"

export const MILESTONE_LABELS = [
  "Load-out",
  "Sail-away",
  "Load-in",
  "Turning",
  "Jack-down",
] as const

export type MilestoneLabel = (typeof MILESTONE_LABELS)[number]
export type MilestoneStatus = "done" | "in-progress" | "pending"

const MILESTONE_PATTERNS: Record<MilestoneLabel, RegExp> = {
  "Load-out": /Loading of AGI TR Unit\s*\d+ on SPMT/i,
  "Sail-away": /Sail-away/i,
  "Load-in": /Load-in of AGI TR Unit\s*\d+/i,
  Turning: /Turning of AGI TR Unit\s*\d+/i,
  "Jack-down": /Jacking down of AGI TR Unit\s*\d+/i,
}

function getTrUnitId(voyageNumber: number): TRUnitId {
  return `TR-${voyageNumber}` as TRUnitId
}

function parseDateSafe(dateStr?: string | null): Date | null {
  if (!dateStr) return null
  const parsed = parseDateToNoonUtc(dateStr)
  if (!parsed || Number.isNaN(parsed.getTime())) return null
  return parsed
}

export function findMilestoneActivity(
  milestoneLabel: MilestoneLabel,
  voyageNumber: number,
  activities: ScheduleActivity[]
): ScheduleActivity | undefined {
  const trUnitId = getTrUnitId(voyageNumber)
  const pattern = MILESTONE_PATTERNS[milestoneLabel]

  return activities.find((activity) => {
    if (activity.tr_unit_id !== trUnitId) return false
    const name = activity.activity_name || ""
    return pattern.test(name)
  })
}

export function calculateMilestoneStatus(
  activity: ScheduleActivity | undefined,
  selectedDate: Date,
  viewMode: ViewMode = "live"
): MilestoneStatus {
  if (!activity) return "pending"

  const normalizedSelected = toUtcNoon(selectedDate)
  if (Number.isNaN(normalizedSelected.getTime())) return "pending"

  const actualStart = parseDateSafe(activity.actual_start)
  const actualFinish = parseDateSafe(activity.actual_finish)

  if (viewMode === "history") {
    if (actualFinish && normalizedSelected.getTime() >= actualFinish.getTime()) {
      return "done"
    }
    if (actualStart && normalizedSelected.getTime() >= actualStart.getTime()) {
      return "in-progress"
    }
  } else {
    if (actualFinish) return "done"
    if (actualStart) return "in-progress"
  }

  const plannedStart = parseDateSafe(activity.planned_start)
  const plannedFinish = parseDateSafe(activity.planned_finish)
  if (!plannedStart || !plannedFinish) return "pending"

  if (normalizedSelected.getTime() >= plannedFinish.getTime()) return "done"
  if (normalizedSelected.getTime() >= plannedStart.getTime()) return "in-progress"

  return "pending"
}

export function calculateMilestonesForVoyage(
  voyageNumber: number,
  activities: ScheduleActivity[],
  selectedDate: Date,
  viewMode: ViewMode = "live"
): { label: MilestoneLabel; status: MilestoneStatus }[] {
  return MILESTONE_LABELS.map((label) => {
    const activity = findMilestoneActivity(label, voyageNumber, activities)
    return {
      label,
      status: calculateMilestoneStatus(activity, selectedDate, viewMode),
    }
  })
}
