import type { ScheduleActivity, AnchorType } from "@/lib/ssot/schedule"
import type { CompareResult } from "@/lib/compare/types"
import type { DateChange } from "@/lib/ssot/schedule"
import type { WeatherDelayChange } from "@/lib/weather/weather-delay-preview"
import { parseUTCDate, addUTCDays } from "@/lib/ssot/schedule"
import type { VisGroup, VisItem } from "@/lib/gantt/visTimelineMapper"
import type { SlackResult } from "@/lib/utils/slack-calc"
import type { EventLogItem } from "@/lib/ops/event-sourcing/types"
import {
  activityToEnhancedGanttItems,
  type EventOverlayOptions,
} from "@/lib/gantt/event-sourcing-mapper"

type Filters = {
  criticalOnly: boolean
  blockedOnly: boolean
}

export type GroupedVisData = {
  groups: VisGroup[]
  items: VisItem[]
  activityIdToGroupId: Map<string, string>
  parentGroupIds: Set<string>
}

const PHASE_LABELS: Record<AnchorType, string> = {
  LOADOUT: "Loadout",
  SAIL_AWAY: "Sail Away",
  BERTHING: "Berthing",
  LOADIN: "Load-in",
  TURNING: "Turning",
  JACKDOWN: "Jackdown",
}

const PHASE_ORDER: Record<string, number> = {
  Loadout: 1,
  "Sail Away": 2,
  Berthing: 3,
  "Load-in": 3,
  Turning: 4,
  Jackdown: 5,
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
}

function extractTrFromLevel(level?: string | null) {
  if (!level) return null
  const match = /TR\s*Unit\s*(\d+)/i.exec(level)
  if (!match) return null
  return `TR Unit ${match[1]}`
}

function getTrSortKey(label: string) {
  const match = /(\d+)/.exec(label)
  if (match) return Number(match[1])
  return Number.MAX_SAFE_INTEGER
}

function mapAnchorToType(anchor?: AnchorType) {
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

export function getPhaseLabel(activity: ScheduleActivity) {
  if (activity.anchor_type && PHASE_LABELS[activity.anchor_type]) {
    return PHASE_LABELS[activity.anchor_type]
  }
  return activity.level1 || "Phase"
}

export function getTrLabel(activity: ScheduleActivity) {
  if (activity.tr_unit_id) {
    return activity.tr_unit_id.replace("TR-", "TR Unit ")
  }
  const extracted = extractTrFromLevel(activity.level1)
  if (extracted) return extracted
  return activity.level1 || "TR Unknown"
}

export function getDatePhaseLabel(activity: ScheduleActivity) {
  const date = activity.planned_start || "Unknown Date"
  const phase = getPhaseLabel(activity)
  return `${date} | ${phase}`
}

export function applyGanttFilters(
  activities: ScheduleActivity[],
  filters: Filters,
  slackMap: Map<string, SlackResult>
) {
  if (!filters.criticalOnly && !filters.blockedOnly) return activities
  return activities.filter((activity) => {
    if (!activity.activity_id) return true
    const isCritical = slackMap.get(activity.activity_id)?.slackDays === 0
    const isBlocked = activity.status === "blocked"
    if (filters.criticalOnly && !isCritical) return false
    if (filters.blockedOnly && !isBlocked) return false
    return true
  })
}

function buildLabel(activity: ScheduleActivity) {
  return `${activity.activity_id}: ${activity.activity_name}`
}

function ensureEndAfterStart(start: Date, end: Date) {
  if (end.getTime() <= start.getTime()) {
    return addUTCDays(start, 1)
  }
  return end
}

export function buildGroupedVisData(params: {
  activities: ScheduleActivity[]
  compareDelta?: CompareResult | null
  reflowPreview?:
    | {
        changes: DateChange[]
        metadata?: import("@/lib/gantt/visTimelineMapper").GhostBarMetadata
      }
    | DateChange[]
    | null
  weatherPreview?: WeatherDelayChange[] | null
  weatherPropagated?: WeatherDelayChange[] | null
  collapsedGroupIds?: Set<string>
  eventLogByActivity?: Map<string, EventLogItem[]>
  eventOverlay?: EventOverlayOptions
}): GroupedVisData {
  const {
    activities,
    compareDelta,
    reflowPreview,
    weatherPreview,
    weatherPropagated,
    collapsedGroupIds = new Set<string>(),
    eventLogByActivity,
    eventOverlay,
  } = params

  // Build TR → Date+Phase structure (2 levels instead of 3)
  const trMap = new Map<string, Map<string, ScheduleActivity[]>>()

  for (const activity of activities) {
    if (!activity.activity_id) continue
    const tr = getTrLabel(activity)
    const datePhase = getDatePhaseLabel(activity)
    if (!trMap.has(tr)) trMap.set(tr, new Map())
    const dateMap = trMap.get(tr)!
    if (!dateMap.has(datePhase)) dateMap.set(datePhase, [])
    dateMap.get(datePhase)!.push(activity)
  }

  const groups: VisGroup[] = []
  const items: VisItem[] = []
  const activityIdToGroupId = new Map<string, string>()
  const parentGroupIds = new Set<string>()
  let order = 0

  const sortedTrs = Array.from(trMap.keys()).sort((a, b) => getTrSortKey(a) - getTrSortKey(b))
  
  for (const tr of sortedTrs) {
    const trId = `tr_${slugify(tr)}`
    const dateMap = trMap.get(tr) ?? new Map()
    const datePhaseIds: string[] = []
    
    const trGroup: VisGroup = {
      id: trId,
      content: tr,
      order: order++,
      nestedGroups: datePhaseIds,
      showNested: !collapsedGroupIds.has(trId),
      level: 0, // TR = Level 0
    }
    parentGroupIds.add(trId)
    groups.push(trGroup)

    // Calculate TR summary dates (earliest start, latest finish)
    const allActivitiesInTr: ScheduleActivity[] = []
    for (const acts of dateMap.values()) {
      allActivitiesInTr.push(...acts)
    }
    
    if (allActivitiesInTr.length > 0) {
      const trStarts = allActivitiesInTr
        .map(a => a.planned_start)
        .filter(Boolean)
        .sort()
      const trFinishes = allActivitiesInTr
        .map(a => a.planned_finish)
        .filter(Boolean)
        .sort()
      
      if (trStarts.length > 0 && trFinishes.length > 0) {
        const trStart = parseUTCDate(trStarts[0])
        const trEnd = parseUTCDate(trFinishes[trFinishes.length - 1])
        const activityCount = allActivitiesInTr.length
        
        // Add summary item for collapsed TR group
        items.push({
          id: `summary_${trId}`,
          group: trId,
          content: `${tr} (${activityCount} activities)`,
          start: trStart,
          end: ensureEndAfterStart(trStart, trEnd),
          type: "range",
          className: "gantt-tr-summary",
          title: `${tr}: ${trStarts[0]} ~ ${trFinishes[trFinishes.length - 1]} (${activityCount} activities)`,
        })
      }
    }

    // Sort by date (extract date part before " | ")
    const sortedDates = Array.from(dateMap.keys()).sort((a, b) => {
      const dateA = a.split(" | ")[0]
      const dateB = b.split(" | ")[0]
      return dateA.localeCompare(dateB)
    })

    for (const datePhase of sortedDates) {
      const datePhaseId = `date_${slugify(tr)}_${slugify(datePhase)}`
      datePhaseIds.push(datePhaseId)
      
      const datePhaseGroup: VisGroup = {
        id: datePhaseId,
        content: datePhase,
        order: order++,
        level: 1, // Date+Phase = Level 1
      }
      groups.push(datePhaseGroup)

      const acts = dateMap.get(datePhase) ?? []
      for (const activity of acts) {
        const activityId = activity.activity_id
        if (!activityId) continue
        activityIdToGroupId.set(activityId, datePhaseId)
        
        const start = parseUTCDate(activity.planned_start)
        const end = ensureEndAfterStart(start, parseUTCDate(activity.planned_finish))
        const typeClass = `gantt-type-${mapAnchorToType(activity.anchor_type)}`
        items.push({
          id: activityId,
          group: datePhaseId, // Activities directly under Date+Phase
          content: buildLabel(activity),
          start,
          end,
          type: "range",
          className: typeClass,
          title: buildLabel(activity),
        })
      }
    }
  }

  if (eventLogByActivity && eventOverlay) {
    const hasOverlay =
      Boolean(eventOverlay.showActual) ||
      Boolean(eventOverlay.showHold) ||
      Boolean(eventOverlay.showMilestone)
    if (hasOverlay) {
      for (const activity of activities) {
        if (!activity.activity_id) continue
        const events = eventLogByActivity.get(activity.activity_id)
        if (!events || events.length === 0) continue
        const groupId = activityIdToGroupId.get(activity.activity_id)
        if (!groupId) continue
        const overlayItems = activityToEnhancedGanttItems(activity, events, groupId, {
          showPlan: false,
          showActual: eventOverlay.showActual,
          showHold: eventOverlay.showHold,
          showMilestone: eventOverlay.showMilestone,
        })
        if (overlayItems.length > 0) {
          items.push(...overlayItems)
        }
      }
    }
  }

  if (compareDelta?.changed?.length) {
    for (const d of compareDelta.changed) {
      if (!d.compare) continue
      const groupId = activityIdToGroupId.get(d.activity_id)
      if (!groupId) continue
      const start = parseUTCDate(d.compare.planned_start)
      const end = ensureEndAfterStart(start, parseUTCDate(d.compare.planned_finish))
      items.push({
        id: `ghost_${d.activity_id}`,
        group: groupId,
        content: `(Compare) ${d.activity_id}`,
        start,
        end,
        type: "range",
        className: "baseline-ghost",
        title: `Compare: baseline position for ${d.activity_id}`,
      })
    }
  }

  const reflowChanges = Array.isArray(reflowPreview)
    ? reflowPreview
    : reflowPreview?.changes || null
  const reflowMetadata = Array.isArray(reflowPreview) ? undefined : reflowPreview?.metadata

  if (reflowChanges?.length) {
    for (const change of reflowChanges) {
      const groupId = activityIdToGroupId.get(change.activity_id)
      if (!groupId) continue
      if (change.old_start === change.new_start && change.old_finish === change.new_finish) {
        continue
      }
      const start = parseUTCDate(change.new_start)
      const end = ensureEndAfterStart(start, parseUTCDate(change.new_finish))
      const isWhatIf = reflowMetadata?.type === "what_if"
      const className = isWhatIf ? "ghost-bar-what-if" : "ghost-bar-reflow"
      let title = `Reflow preview: ${change.old_start} → ${change.new_start}`
      if (isWhatIf && reflowMetadata?.scenario) {
        const { reason, delay_days, confidence } = reflowMetadata.scenario
        title = `What-If: ${reason || "Manual delay"} (${delay_days && delay_days > 0 ? "+" : ""}${delay_days} days, ${Math.round((confidence || 0) * 100)}% confidence)`
      }
      items.push({
        id: `reflow_ghost_${change.activity_id}`,
        group: groupId,
        content: isWhatIf ? `(What-If) ${change.activity_id}` : `(Reflow) ${change.activity_id}`,
        start,
        end,
        type: "range",
        className,
        title,
      })
    }
  }

  if (weatherPreview?.length) {
    for (const change of weatherPreview) {
      const groupId = activityIdToGroupId.get(change.activity_id)
      if (!groupId) continue
      if (change.old_start === change.new_start && change.old_finish === change.new_finish) {
        continue
      }
      const start = parseUTCDate(change.new_start)
      const end = ensureEndAfterStart(start, parseUTCDate(change.new_finish))
      const reason = change.reason ? ` — ${change.reason}` : ""
      items.push({
        id: `weather_ghost_${change.activity_id}`,
        group: groupId,
        content: `(Weather) ${change.activity_id}`,
        start,
        end,
        type: "range",
        className: "ghost-bar-weather",
        title: `Weather delay: ${change.old_start} → ${change.new_start}${reason}`,
      })
    }
  }

  if (weatherPropagated?.length) {
    for (const change of weatherPropagated) {
      const groupId = activityIdToGroupId.get(change.activity_id)
      if (!groupId) continue
      if (change.old_start === change.new_start && change.old_finish === change.new_finish) {
        continue
      }
      const start = parseUTCDate(change.new_start)
      const end = ensureEndAfterStart(start, parseUTCDate(change.new_finish))
      const reason = change.reason ? ` — ${change.reason}` : ""
      items.push({
        id: `weather_prop_ghost_${change.activity_id}`,
        group: groupId,
        content: `(WX Prop) ${change.activity_id}`,
        start,
        end,
        type: "range",
        className: "ghost-bar-weather-propagated",
        title: `Weather propagated: ${change.old_start} → ${change.new_start}${reason}`,
      })
    }
  }

  return { groups, items, activityIdToGroupId, parentGroupIds }
}
