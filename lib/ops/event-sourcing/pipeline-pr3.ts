import type { PR3Report, EventLogItem, DerivedKPI, JsonPatchOp, ShiftRule } from "./types"
import { calcDerivedKPI } from "./kpi-calculator"

/**
 * PR#3 파이프라인: Derived KPI 계산
 */
export async function runPR3Pipeline(
  patchedOptionC: any,
  events: EventLogItem[],
  shiftRules?: ShiftRule[]
): Promise<PR3Report> {
  const timestamp = new Date().toISOString()
  const kpiResults: Record<string, DerivedKPI> = {}

  const eventsByActivity = new Map<string, EventLogItem[]>()
  for (const event of events) {
    const activityId = event.activity_id
    if (!eventsByActivity.has(activityId)) {
      eventsByActivity.set(activityId, [])
    }
    eventsByActivity.get(activityId)!.push(event)
  }

  for (const [activityId, activityEvents] of eventsByActivity.entries()) {
    const activity = patchedOptionC.entities?.activities?.[activityId]
    if (!activity) continue
    kpiResults[activityId] = calcDerivedKPI(activity, activityEvents, shiftRules)
  }

  const kpiPatches: JsonPatchOp[] = []
  for (const [activityId, kpi] of Object.entries(kpiResults)) {
    kpiPatches.push({
      op: "add",
      path: `/entities/activities/${activityId}/derived_kpi`,
      value: kpi,
    })
  }

  const variances = Object.values(kpiResults).map((kpi) => kpi.cal.variance_hr)
  const avgVarianceHr =
    variances.length > 0
      ? variances.reduce((sum, v) => sum + v, 0) / variances.length
      : 0

  const totalDelayHr = Object.values(kpiResults).reduce(
    (sum, kpi) => sum + kpi.cal.delay_cal_hr,
    0
  )

  const delayBreakdownTotal: Record<string, number> = {}
  for (const kpi of Object.values(kpiResults)) {
    for (const [tag, hours] of Object.entries(kpi.cal.delay_breakdown_hr)) {
      delayBreakdownTotal[tag] = (delayBreakdownTotal[tag] ?? 0) + hours
    }
  }

  const highVarianceAlerts = Object.entries(kpiResults)
    .filter(([, kpi]) => Math.abs(kpi.cal.variance_hr) >= 8)
    .map(([activityId, kpi]) => ({
      activity_id: activityId,
      variance_hr: kpi.cal.variance_hr,
      severity: (Math.abs(kpi.cal.variance_hr) >= 16
        ? "critical"
        : "high") as "high" | "critical",
    }))
    .sort((a, b) => Math.abs(b.variance_hr) - Math.abs(a.variance_hr))

  return {
    timestamp,
    total_activities_with_kpi: Object.keys(kpiResults).length,
    kpi_results: kpiResults,
    kpi_patches: kpiPatches,
    summary: {
      avg_variance_hr: avgVarianceHr,
      total_delay_hr: totalDelayHr,
      delay_breakdown_total: delayBreakdownTotal,
    },
    high_variance_alerts: highVarianceAlerts,
  }
}
