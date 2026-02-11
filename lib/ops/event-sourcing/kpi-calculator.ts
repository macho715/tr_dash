import type { Activity } from "@/src/types/ssot"
import type {
  EventLogItem,
  DerivedKPI,
  ShiftRule,
  CalendarTrackKPI,
  WorkdayTrackKPI,
  ReasonTag,
} from "./types"

const ZERO_DELAY_BREAKDOWN: Record<ReasonTag | "OTHER", number> = {
  WEATHER: 0,
  TIDE: 0,
  BERTH_OCCUPIED: 0,
  PTW: 0,
  HM: 0,
  MWS: 0,
  CERT: 0,
  RESOURCE: 0,
  OTHER: 0,
}

/**
 * Calendar Track KPI 계산
 */
export function calcCalendarKPI(
  activity: Activity,
  events: EventLogItem[]
): CalendarTrackKPI {
  const startEvent = getFirstEvent(events, "START")
  const endEvent = getLastEvent(events, "END")

  const plannedDuration = activity.plan?.duration_min
  const plannedDurationHr =
    typeof plannedDuration === "number" ? plannedDuration / 60 : 0

  if (!startEvent || !endEvent) {
    return {
      actual_duration_hr: 0,
      planned_duration_hr: plannedDurationHr,
      variance_hr: 0,
      delay_cal_hr: 0,
      delay_breakdown_hr: { ...ZERO_DELAY_BREAKDOWN },
    }
  }

  const actualDurationHr = calcHours(startEvent.ts, endEvent.ts)

  const holdPairs = pairHoldResume(
    events.filter((event) => event.state === "HOLD" || event.state === "RESUME")
  )

  const delayCalHr = holdPairs.reduce(
    (sum, pair) => sum + calcHours(pair.hold.ts, pair.resume.ts),
    0
  )

  const delayBreakdown: Record<ReasonTag | "OTHER", number> = {
    ...ZERO_DELAY_BREAKDOWN,
  }
  for (const pair of holdPairs) {
    const tag = pair.hold.reason_tag || "OTHER"
    delayBreakdown[tag] = (delayBreakdown[tag] ?? 0) +
      calcHours(pair.hold.ts, pair.resume.ts)
  }

  return {
    actual_duration_hr: actualDurationHr,
    planned_duration_hr: plannedDurationHr,
    variance_hr: actualDurationHr - plannedDurationHr,
    delay_cal_hr: delayCalHr,
    delay_breakdown_hr: delayBreakdown,
  }
}

/**
 * Workday Track KPI 계산 (선택적)
 */
export function calcWorkdayKPI(
  activity: Activity,
  events: EventLogItem[],
  shiftRules: ShiftRule[]
): WorkdayTrackKPI {
  const startEvent = getFirstEvent(events, "START")
  const endEvent = getLastEvent(events, "END")

  if (!startEvent || !endEvent) {
    return {
      workday_duration: 0,
      workday_efficiency: 0,
    }
  }

  const rule = shiftRules.find(
    (r) =>
      r.site === events[0]?.site &&
      isDateInRange(startEvent.ts, r.valid_from, r.valid_to)
  )

  if (!rule) {
    return {
      workday_duration: 0,
      workday_efficiency: 0,
    }
  }

  const workdayDuration = calcWorkdayDuration(
    startEvent.ts,
    endEvent.ts,
    rule
  )
  const actualCalHr = calcHours(startEvent.ts, endEvent.ts)

  return {
    workday_duration: workdayDuration,
    workday_efficiency: actualCalHr > 0 ? workdayDuration / actualCalHr : 0,
  }
}

/**
 * 통합 KPI 계산
 */
export function calcDerivedKPI(
  activity: Activity,
  events: EventLogItem[],
  shiftRules?: ShiftRule[]
): DerivedKPI {
  const cal = calcCalendarKPI(activity, events)
  const wd = shiftRules
    ? calcWorkdayKPI(activity, events, shiftRules)
    : { workday_duration: 0, workday_efficiency: 0 }

  return { cal, wd }
}

// ============================================================================
// Helpers
// ============================================================================

export function calcHours(start: string, end: string): number {
  const d1 = new Date(start)
  const d2 = new Date(end)
  return (d2.getTime() - d1.getTime()) / (1000 * 60 * 60)
}

export function pairHoldResume(
  events: EventLogItem[]
): Array<{ hold: EventLogItem; resume: EventLogItem }> {
  const pairs: Array<{ hold: EventLogItem; resume: EventLogItem }> = []
  const sorted = [...events].sort(
    (a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime()
  )

  let pendingHold: EventLogItem | null = null
  for (const event of sorted) {
    if (event.state === "HOLD") {
      pendingHold = event
      continue
    }
    if (event.state === "RESUME" && pendingHold) {
      pairs.push({ hold: pendingHold, resume: event })
      pendingHold = null
    }
  }

  return pairs
}

function getFirstEvent(
  events: EventLogItem[],
  state: EventLogItem["state"]
): EventLogItem | undefined {
  return [...events]
    .filter((event) => event.state === state)
    .sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime())[0]
}

function getLastEvent(
  events: EventLogItem[],
  state: EventLogItem["state"]
): EventLogItem | undefined {
  const matches = events
    .filter((event) => event.state === state)
    .sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime())
  return matches[matches.length - 1]
}

function calcWorkdayDuration(
  _start: string,
  _end: string,
  _rule: ShiftRule
): number {
  return 0
}

function isDateInRange(ts: string, from: string, to: string): boolean {
  const date = new Date(ts)
  const fromDate = new Date(from)
  const toDate = new Date(to)
  return date >= fromDate && date <= toDate
}
