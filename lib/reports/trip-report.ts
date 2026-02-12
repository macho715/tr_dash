/**
 * Trip Report generation (patchm1 §3.7, patchm2 AC4)
 * Deterministic: same input → same output (sort fixed)
 */

import type { OptionC, TripReport, TripReportMilestone, TripCloseout } from '@/src/types/ssot'

function buildCompareKpiSummary(
  ssot: OptionC,
  tripId: string,
  delayMinutes: number,
  requiredTotal: number,
  providedTotal: number
): TripReport['compare_kpi_summary'] {
  const trip = ssot.entities?.trips?.[tripId]
  const tripActivityIds = trip?.activity_ids ?? []
  const activities = ssot.entities?.activities ?? {}

  const collisionBySeverity = {
    blocking: 0,
    warning: 0,
    info: 0,
  }

  for (const activityId of tripActivityIds) {
    const severity = activities[activityId]?.calc?.collision_severity_max
    if (severity === 'blocking') collisionBySeverity.blocking += 1
    if (severity === 'warning') collisionBySeverity.warning += 1
    if (severity === 'info') collisionBySeverity.info += 1
  }

  const baselineDelay = trip?.calc?.delay_minutes ?? 0
  const compareMissing = Math.max(0, requiredTotal - providedTotal)

  return {
    total_delay_minutes: {
      baseline: baselineDelay,
      compare: delayMinutes,
      delta: delayMinutes - baselineDelay,
    },
    collision_count_by_severity: {
      blocking: { baseline: 0, compare: collisionBySeverity.blocking, delta: collisionBySeverity.blocking },
      warning: { baseline: 0, compare: collisionBySeverity.warning, delta: collisionBySeverity.warning },
      info: { baseline: 0, compare: collisionBySeverity.info, delta: collisionBySeverity.info },
    },
    evidence_risk_delta: {
      baseline_missing: 0,
      compare_missing: compareMissing,
      delta: compareMissing,
    },
    as_of: new Date().toISOString(),
  }
}

export function generateTripReport(
  tripId: string,
  closeout: TripCloseout | null,
  ssot: OptionC
): TripReport {
  const trip = ssot.entities?.trips?.[tripId]
  const activities = ssot.entities?.activities ?? {}
  const tripActivityIds = trip?.activity_ids ?? []
  const milestones: TripReportMilestone[] = []
  let delayMinutes = 0
  const delayReasonCodes: string[] = closeout?.delay_reason_codes ?? []

  for (const activityId of tripActivityIds) {
    const act = activities[activityId]
    if (!act) continue
    const plannedStart = act.plan?.start_ts ?? null
    const plannedEnd = act.plan?.end_ts ?? null
    const actualStart = act.actual?.start_ts ?? null
    const actualEnd = act.actual?.end_ts ?? null
    const deltaMinutes = actualEnd && plannedEnd
      ? Math.round((new Date(actualEnd).getTime() - new Date(plannedEnd).getTime()) / 60000)
      : 0
    milestones.push({
      name: act.title ?? act.activity_id ?? activityId,
      planned_ts: plannedStart ?? '',
      actual_ts: actualStart ?? actualEnd,
      delta_minutes: deltaMinutes,
    })
  }
  delayMinutes = closeout?.delay_details?.reduce((s, d) => s + d.minutes, 0)
    ?? trip?.calc?.delay_minutes
    ?? milestones.reduce((s, m) => s + Math.max(0, m.delta_minutes), 0)

  milestones.sort((a, b) => a.planned_ts.localeCompare(b.planned_ts))

  const evidenceItems = Object.values(ssot.entities?.evidence_items ?? {})
  const linkedToTrip = evidenceItems.filter((e) => e.linked_to?.trip_id === tripId || e.linked_to?.activity_id && tripActivityIds.includes(e.linked_to.activity_id))
  const requiredTotal = tripActivityIds.reduce((sum, id) => {
    const act = activities[id]
    return sum + (act?.evidence_required?.reduce((s, r) => s + r.min_count, 0) ?? 0)
  }, 0)
  const providedTotal = linkedToTrip.length

  return {
    report_id: `RPT_${tripId}`,
    trip_id: tripId,
    tr_id: trip?.tr_ids?.[0] ?? '',
    generated_at: new Date().toISOString(),
    baseline_id: trip?.baseline_id_at_start ?? undefined,
    milestones,
    delay_minutes: delayMinutes,
    delay_reason_codes: delayReasonCodes.length ? delayReasonCodes : undefined,
    evidence_completeness: {
      required_total: requiredTotal,
      provided_total: providedTotal,
      missing: requiredTotal > providedTotal ? [] : undefined,
    },
    narrative_closeout_id: closeout?.closeout_id,
    compare_kpi_summary: buildCompareKpiSummary(
      ssot,
      tripId,
      delayMinutes,
      requiredTotal,
      providedTotal
    ),
  }
}

export function tripReportToMarkdown(report: TripReport): string {
  const lines: string[] = []
  lines.push(`# Trip Report: ${report.trip_id}`)
  lines.push('')
  lines.push(`Generated: ${report.generated_at}`)
  lines.push('')
  lines.push('## Milestones')
  lines.push('')
  for (const m of report.milestones) {
    lines.push(`- **${m.name}**: planned ${m.planned_ts} | actual ${m.actual_ts ?? '—'} | Δ${m.delta_minutes}m`)
  }
  lines.push('')
  lines.push(`## Delay: ${report.delay_minutes} minutes`)
  if (report.delay_reason_codes?.length) {
    lines.push(`Reasons: ${report.delay_reason_codes.join(', ')}`)
  }
  lines.push('')
  if (report.evidence_completeness) {
    lines.push(`## Evidence: ${report.evidence_completeness.provided_total}/${report.evidence_completeness.required_total}`)
  }
  if (report.compare_kpi_summary) {
    lines.push('')
    lines.push('## Compare KPI Summary')
    lines.push(`- Total Delay Δ: ${report.compare_kpi_summary.total_delay_minutes.delta}m (baseline ${report.compare_kpi_summary.total_delay_minutes.baseline}m → compare ${report.compare_kpi_summary.total_delay_minutes.compare}m)`)
    lines.push(`- Blocking Collisions Δ: ${report.compare_kpi_summary.collision_count_by_severity.blocking.delta}`)
    lines.push(`- Warning Collisions Δ: ${report.compare_kpi_summary.collision_count_by_severity.warning.delta}`)
    lines.push(`- Evidence Risk Δ: ${report.compare_kpi_summary.evidence_risk_delta.delta}`)
    lines.push(`- As-of: ${report.compare_kpi_summary.as_of}`)
  }
  lines.push('')
  return lines.join('\n')
}

export function tripReportToJson(report: TripReport): string {
  return JSON.stringify(report, null, 2)
}
