import type { AnchorType, ScheduleActivity, TRUnitId } from "@/lib/ssot/schedule"

export function mapOptionCToScheduleActivity(
  raw: Record<string, unknown>,
  _index?: number
): ScheduleActivity {
  const activityName = typeof raw.activity_name === "string" ? raw.activity_name : 
    (typeof raw.title === "string" ? raw.title : "")
  const level2 = typeof raw.level2 === "string" ? raw.level2 : null
  const activityId =
    typeof raw.activity_id === "string" || raw.activity_id === null ? raw.activity_id : null

  const isSummary = activityId === null
  
  // Contract v0.8.0: Use tr_unit_id field directly if available
  let trUnitId: TRUnitId | undefined
  if (typeof raw.tr_unit_id === "string" && raw.tr_unit_id) {
    // Convert "TR_01" format to "TR-1" format
    const match = raw.tr_unit_id.match(/TR[_-](\d+)/i)
    if (match) {
      const num = parseInt(match[1], 10)
      trUnitId = `TR-${num}` as TRUnitId
    } else if (raw.tr_unit_id === "MOBILIZATION" || raw.tr_unit_id === "DEMOBILIZATION") {
      // Keep as-is for special TR types
      trUnitId = raw.tr_unit_id as TRUnitId
    }
  }
  
  // Fallback: Extract from activity name
  if (!trUnitId) {
    trUnitId = extractTRUnitId(activityName)
  }
  
  const anchorType = extractAnchorType(activityName, level2)
  const resourceTags = extractResourceTags(activityName)
  const voyageId = trUnitId ? extractVoyageId(trUnitId) : undefined

  // Contract v0.8.0: dates in plan.start_ts / plan.end_ts (ISO 8601 timestamps)
  // Legacy: dates in planned_start / planned_finish (YYYY-MM-DD)
  let plannedStart = ""
  let plannedFinish = ""
  let duration = 0
  let actualStart: string | undefined
  let actualFinish: string | undefined

  if (typeof raw.plan === "object" && raw.plan !== null) {
    // Contract v0.8.0 format
    const plan = raw.plan as Record<string, unknown>
    // Extract date part from ISO timestamp: "2026-01-26T00:00:00+04:00" -> "2026-01-26"
    plannedStart = typeof plan.start_ts === "string" ? plan.start_ts.split("T")[0] : ""
    plannedFinish = typeof plan.end_ts === "string" ? plan.end_ts.split("T")[0] : ""
    duration = typeof plan.duration_min === "number" ? Math.ceil(plan.duration_min / 1440) : 0
  } else {
    // Legacy format
    plannedStart = typeof raw.planned_start === "string" ? raw.planned_start : ""
    plannedFinish = typeof raw.planned_finish === "string" ? raw.planned_finish : ""
    duration = typeof raw.duration === "number" ? raw.duration : 0
  }

  if (typeof raw.actual === "object" && raw.actual !== null) {
    const actual = raw.actual as Record<string, unknown>
    actualStart = typeof actual.start_ts === "string" ? actual.start_ts.split("T")[0] : undefined
    actualFinish = typeof actual.end_ts === "string" ? actual.end_ts.split("T")[0] : undefined
  } else {
    actualStart = typeof raw.actual_start === "string" ? raw.actual_start : undefined
    actualFinish = typeof raw.actual_finish === "string" ? raw.actual_finish : undefined
  }

  const status = normalizeStatus(raw.status) ?? (typeof raw.state === "string"
    ? mapStateToStatus(raw.state)
    : undefined)

  const dependsOn = Array.isArray(raw.depends_on)
    ? (raw.depends_on as ScheduleActivity["depends_on"])
    : undefined
  const constraint = typeof raw.constraint === "object" && raw.constraint !== null
    ? (raw.constraint as ScheduleActivity["constraint"])
    : undefined
  const calendar = typeof raw.calendar === "object" && raw.calendar !== null
    ? (raw.calendar as ScheduleActivity["calendar"])
    : undefined
  const lockLevel = typeof raw.lock_level === "string" ? raw.lock_level : undefined
  const reflowPins = Array.isArray(raw.reflow_pins)
    ? (raw.reflow_pins as ScheduleActivity["reflow_pins"])
    : undefined

  return {
    activity_id: activityId,
    activity_name: activityName,
    level1: typeof raw.level1 === "string" ? raw.level1 : "",
    level2,
    duration,
    planned_start: plannedStart,
    planned_finish: plannedFinish,
    actual_start: actualStart,
    actual_finish: actualFinish,
    status,
    depends_on: dependsOn,
    constraint,
    calendar,
    voyage_id: typeof raw.voyage_id === "string" ? raw.voyage_id : voyageId,
    milestone_id: typeof raw.milestone_id === "string" ? raw.milestone_id : undefined,
    resource_tags: Array.isArray(raw.resource_tags)
      ? (raw.resource_tags as string[])
      : resourceTags.length > 0
        ? resourceTags
        : undefined,
    is_locked: typeof raw.is_locked === "boolean" ? raw.is_locked : undefined,
    lock_level: lockLevel,
    reflow_pins: reflowPins,
    _is_summary: isSummary,
    tr_unit_id: trUnitId,
    anchor_type: anchorType,
  }
}

function mapStateToStatus(state: string): ScheduleActivity["status"] | undefined {
  switch (state) {
    case "completed":
      return "done"
    case "in_progress":
      return "in_progress"
    case "blocked":
      return "blocked"
    default:
      return "planned"
  }
}

function normalizeStatus(value: unknown): ScheduleActivity["status"] | undefined {
  if (value === "planned" || value === "in_progress" || value === "blocked" || value === "done") {
    return value
  }
  return undefined
}

export function mapOptionCJsonToScheduleActivities(optionCData: {
  activities: Record<string, unknown>[]
}): ScheduleActivity[] {
  return optionCData.activities.map((raw, index) => mapOptionCToScheduleActivity(raw, index))
}

function extractTRUnitId(name: string): TRUnitId | undefined {
  const match = name.match(/TR\s*Unit\s*(\d+)/i)
  if (!match) return undefined

  const num = parseInt(match[1], 10)
  if (num >= 1 && num <= 7) {
    return `TR-${num}` as TRUnitId
  }
  return undefined
}

function extractAnchorType(name: string, level2: string | null): AnchorType | undefined {
  const lower = name.toLowerCase()
  const level2Lower = level2 ? level2.toLowerCase() : ""

  if (lower.includes("load-out") || lower.includes("loadout") || level2Lower.includes("loadout")) {
    return "LOADOUT"
  }
  if (lower.includes("sail") || lower.includes("lct") || level2Lower.includes("transport")) {
    return "SAIL_AWAY"
  }
  if (lower.includes("berth") || lower.includes("arrival")) {
    return "BERTHING"
  }
  if (lower.includes("load-in") || lower.includes("loadin")) {
    return "LOADIN"
  }
  if (lower.includes("turning")) {
    return "TURNING"
  }
  if (lower.includes("jack") || lower.includes("jd")) {
    return "JACKDOWN"
  }

  return undefined
}

function extractResourceTags(name: string): string[] {
  const tags: string[] = []
  const lower = name.toLowerCase()

  if (lower.includes("crane")) {
    tags.push("CRANE")
  }
  if (lower.includes("forklift")) {
    if (lower.includes("5t") || lower.includes("5 t") || lower.includes("5-ton")) {
      tags.push("FORKLIFT_5T")
    }
    if (lower.includes("10t") || lower.includes("10 t") || lower.includes("10-ton")) {
      tags.push("FORKLIFT_10T")
    }
    if (!tags.some((tag) => tag.includes("FORKLIFT"))) {
      tags.push("FORKLIFT")
    }
  }
  if (lower.includes("spmt")) {
    tags.push("SPMT")
  }

  return tags
}

function extractVoyageId(trUnitId: TRUnitId): string | undefined {
  const match = trUnitId.match(/TR-(\d+)/)
  if (!match) return undefined
  return `V${match[1]}`
}
