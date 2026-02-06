import type { EventLogItem, ValidationResult, ValidationError } from "./types"

/**
 * QA Gate 1: START/END Pair 닫힘
 */
export function validatePairClosure(events: EventLogItem[]): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []

  const byActivity = groupBy(events, (e) => e.activity_id)

  for (const [activityId, activityEvents] of byActivity.entries()) {
    const starts = activityEvents.filter((e) => e.state === "START")
    const ends = activityEvents.filter((e) => e.state === "END")

    if (starts.length !== ends.length) {
      errors.push({
        severity: "error",
        code: "UNPAIRED_STATE_CHANGE",
        message: `Activity ${activityId}: ${starts.length} START(s) but ${ends.length} END(s)`,
        events: [...starts, ...ends].map((e) => e.event_id),
        details: {
          activity_id: activityId,
          start_count: starts.length,
          end_count: ends.length,
        },
      })
    }

    // 순서 검증
    for (let i = 0; i < Math.min(starts.length, ends.length); i += 1) {
      if (new Date(starts[i].ts) >= new Date(ends[i].ts)) {
        errors.push({
          severity: "error",
          code: "REVERSED_TIMESTAMPS",
          message: `START after END in activity ${activityId}`,
          events: [starts[i].event_id, ends[i].event_id],
        })
      }
    }
  }

  return {
    valid: errors.length === 0,
    gate: "pair_closure",
    errors,
    warnings,
  }
}

/**
 * QA Gate 2: HOLD/RESUME 닫힘
 */
export function validateHoldClosure(events: EventLogItem[]): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []

  const byActivity = groupBy(events, (e) => e.activity_id)

  for (const [activityId, activityEvents] of byActivity.entries()) {
    const holds = activityEvents.filter((e) => e.state === "HOLD")
    const resumes = activityEvents.filter((e) => e.state === "RESUME")

    if (holds.length > resumes.length) {
      const unclosed = holds.slice(resumes.length)
      warnings.push({
        severity: "warning",
        code: "UNCLOSED_HOLD",
        message: `Activity ${activityId}: ${holds.length - resumes.length} unclosed HOLD(s)`,
        events: unclosed.map((e) => e.event_id),
        details: {
          activity_id: activityId,
          unclosed_holds: unclosed.map((h) => ({
            event_id: h.event_id,
            reason_tag: h.reason_tag,
            ts: h.ts,
          })),
        },
      })
    }

    // reason_tag 필수 검증
    for (const hold of holds) {
      if (!hold.reason_tag) {
        errors.push({
          severity: "error",
          code: "HOLD_MISSING_REASON_TAG",
          message: `HOLD event without reason_tag: ${hold.event_id}`,
          events: [hold.event_id],
        })
      }
    }
  }

  return {
    valid: errors.length === 0,
    gate: "hold_closure",
    errors,
    warnings,
  }
}

/**
 * QA Gate 3: MILESTONE 오용 방지
 */
export function validateMilestoneUsage(events: EventLogItem[]): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []

  const milestones = events.filter((e) => e.event_type === "MILESTONE")

  for (const milestone of milestones) {
    if (milestone.state === "START" || milestone.state === "END") {
      errors.push({
        severity: "error",
        code: "MILESTONE_AS_DURATION",
        message: `MILESTONE event using START/END: ${milestone.event_id}`,
        events: [milestone.event_id],
        details: {
          phase: milestone.phase,
          state: milestone.state,
          hint: "Use ARRIVE/DEPART instead",
        },
      })
    }
  }

  return {
    valid: errors.length === 0,
    gate: "milestone_usage",
    errors,
    warnings,
  }
}

/**
 * QA Gate 4: Timestamp 순서
 */
export function validateTimestampOrder(events: EventLogItem[]): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []

  for (const event of events) {
    const parsed = new Date(event.ts)
    if (Number.isNaN(parsed.getTime())) {
      errors.push({
        severity: "error",
        code: "INVALID_ISO8601_TIMESTAMP",
        message: `Invalid timestamp: ${event.ts}`,
        events: [event.event_id],
      })
    }
  }

  return {
    valid: errors.length === 0,
    gate: "timestamp_order",
    errors,
    warnings,
  }
}

/**
 * 통합 검증
 */
export function runAllGates(events: EventLogItem[]): ValidationResult[] {
  return [
    validatePairClosure(events),
    validateHoldClosure(events),
    validateMilestoneUsage(events),
    validateTimestampOrder(events),
  ]
}

// ============================================================================
// Helper
// ============================================================================

function groupBy<T, K>(array: T[], keyFn: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>()
  for (const item of array) {
    const key = keyFn(item)
    if (!map.has(key)) {
      map.set(key, [])
    }
    map.get(key)!.push(item)
  }
  return map
}
