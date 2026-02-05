import type { ScheduleActivity } from "@/lib/ssot/schedule"
import { addUTCDays, parseDateToNoonUtc } from "@/lib/ssot/schedule"
import type { EventLogItem } from "@/lib/ops/event-sourcing/types"
import { pairHoldResume } from "@/lib/ops/event-sourcing/kpi-calculator"
import type { VisItem } from "@/lib/gantt/visTimelineMapper"

export type EventOverlayOptions = {
  showPlan?: boolean
  showActual?: boolean
  showHold?: boolean
  showMilestone?: boolean
}

type ActualWindow = { start: string; end: string }

export function getActualWindow(events: EventLogItem[]): ActualWindow | null {
  const starts = events
    .filter((event) => event.state === "START")
    .sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime())
  const ends = events
    .filter((event) => event.state === "END")
    .sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime())
  const startEvent = starts[0]
  const endEvent = ends[ends.length - 1]
  if (!startEvent || !endEvent) return null
  return { start: startEvent.ts, end: endEvent.ts }
}

export function activityToEnhancedGanttItems(
  activity: ScheduleActivity,
  events: EventLogItem[],
  groupId: string,
  options: EventOverlayOptions = {}
): VisItem[] {
  if (!activity.activity_id) return []
  const {
    showPlan = true,
    showActual = false,
    showHold = false,
    showMilestone = false,
  } = options

  const items: VisItem[] = []
  const activityId = activity.activity_id

  if (showPlan) {
    const start = parseDateToNoonUtc(activity.planned_start) ?? new Date(activity.planned_start)
    let end = parseDateToNoonUtc(activity.planned_finish) ?? new Date(activity.planned_finish)
    end = ensureEndAfterStart(start, end)

    items.push({
      id: activityId,
      group: groupId,
      content: activity.activity_name || activityId,
      start,
      end,
      type: "range",
      className: `plan-bar ${getPlanClass(activity)}`.trim(),
      title: activity.activity_name || activityId,
    })
  }

  if (showActual) {
    const actualWindow = getActualWindow(events)
    if (actualWindow) {
      const start = toEventDate(actualWindow.start)
      let end = toEventDate(actualWindow.end)
      end = ensureEndAfterStart(start, end)

      const varianceClass = getVarianceClass(activity, actualWindow)
      items.push({
        id: `actual__${activityId}`,
        group: groupId,
        content: "",
        start,
        end,
        type: "range",
        className: `actual-bar ${varianceClass}`.trim(),
        title: `Actual: ${actualWindow.start} → ${actualWindow.end}`,
      })
    }
  }

  if (showHold) {
    const holdPairs = pairHoldResume(
      events.filter((event) => event.state === "HOLD" || event.state === "RESUME")
    )
    for (const pair of holdPairs) {
      const start = toEventDate(pair.hold.ts)
      let end = toEventDate(pair.resume.ts)
      end = ensureEndAfterStart(start, end)
      const reasonTag = (pair.hold.reason_tag || "OTHER").toLowerCase()
      items.push({
        id: `hold__${activityId}__${pair.hold.event_id}`,
        group: groupId,
        content: "",
        start,
        end,
        type: "background",
        className: `hold-bar hold-${reasonTag}`,
        title: `HOLD: ${pair.hold.reason_tag || "OTHER"}`,
      })
    }
  }

  if (showMilestone) {
    const milestones = events.filter((event) => event.event_type === "MILESTONE")
    for (const milestone of milestones) {
      const start = toEventDate(milestone.ts)
      const state = milestone.state.toLowerCase()
      items.push({
        id: `milestone__${activityId}__${milestone.event_id}`,
        group: groupId,
        content: getMilestoneSymbol(milestone.state),
        start,
        end: start,
        type: "point",
        className: `milestone-${state}`,
        title: `${milestone.phase}: ${milestone.state} (${milestone.ts})`,
      })
    }
  }

  return items
}

function toEventDate(ts: string): Date {
  const parsed = parseDateToNoonUtc(ts)
  if (parsed) return parsed
  const fallback = new Date(ts)
  if (Number.isNaN(fallback.getTime())) {
    return new Date()
  }
  return fallback
}

function ensureEndAfterStart(start: Date, end: Date): Date {
  if (end.getTime() <= start.getTime()) {
    return addUTCDays(start, 1)
  }
  return end
}

function getVarianceClass(
  activity: ScheduleActivity,
  actual: ActualWindow
): string {
  const plannedStart = parseDateToNoonUtc(activity.planned_start)
  const plannedEnd = parseDateToNoonUtc(activity.planned_finish)
  if (!plannedStart || !plannedEnd) return ""

  const plannedHours = calcHours(plannedStart, plannedEnd)
  const actualHours = calcHours(new Date(actual.start), new Date(actual.end))
  const variance = actualHours - plannedHours
  if (variance > 0.01) return "variance-positive"
  if (variance < -0.01) return "variance-negative"
  return ""
}

function calcHours(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60)
}

function getPlanClass(activity: ScheduleActivity): string {
  if (!activity.anchor_type) return ""
  return `gantt-type-${mapAnchorToType(activity.anchor_type)}`
}

function mapAnchorToType(anchor: ScheduleActivity["anchor_type"]): string {
  switch (anchor) {
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

function getMilestoneSymbol(state: EventLogItem["state"]): string {
  switch (state) {
    case "ARRIVE":
      return "A"
    case "DEPART":
      return "D"
    case "APPROVED":
      return "OK"
    case "REJECTED":
      return "X"
    default:
      return "M"
  }
}
