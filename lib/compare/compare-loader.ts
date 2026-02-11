/**
 * Compare source loader (Phase 10 T10.1)
 * Load baseline (option_c) as reference, compare source (scenario A/B/C)
 * Calculate delta: added/removed/changed activities
 */

import type { ScheduleActivity } from "@/lib/ssot/schedule"
import type {
  ActivityDelta,
  CompareCollisionSeverity,
  CompareKpiSnapshot,
  CompareResult,
} from "./types"

function toMap(activities: ScheduleActivity[]): Map<string, ScheduleActivity> {
  const map = new Map<string, ScheduleActivity>()
  for (const a of activities) {
    if (a.activity_id) map.set(a.activity_id, a)
  }
  return map
}


function toDate(value: string | undefined): Date | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function delayMinutesForActivity(activity: ScheduleActivity): number {
  const start = toDate(activity.planned_start)
  const finish = toDate(activity.planned_finish)
  if (!start || !finish) return 0
  const ms = finish.getTime() - start.getTime()
  return ms > 0 ? Math.round(ms / 60000) : 0
}

function buildKpis(
  baseline: ScheduleActivity[],
  compare: ScheduleActivity[],
  changed: ActivityDelta[],
  baselineCollisions: number,
  compareCollisions: number,
  baselineConflictBySeverity: Partial<Record<CompareCollisionSeverity, number>>,
  compareConflictBySeverity: Partial<Record<CompareCollisionSeverity, number>>,
  asOf?: string
): CompareKpiSnapshot {
  const baselineDelayMinutes = baseline.reduce((sum, activity) => {
    return sum + delayMinutesForActivity(activity)
  }, 0)
  const compareDelayMinutes = compare.reduce((sum, activity) => {
    return sum + delayMinutesForActivity(activity)
  }, 0)

  const baselineWarn = baselineConflictBySeverity.warn ?? baselineCollisions
  const compareWarn = compareConflictBySeverity.warn ?? compareCollisions
  const baselineError = baselineConflictBySeverity.error ?? 0
  const compareError = compareConflictBySeverity.error ?? 0

  const changedIds = changed.map((item) => item.activity_id)

  return {
    totalDelayMinutes: {
      baseline: baselineDelayMinutes,
      compare: compareDelayMinutes,
      delta: compareDelayMinutes - baselineDelayMinutes,
    },
    collisionCountBySeverity: {
      error: {
        baseline: baselineError,
        compare: compareError,
        delta: compareError - baselineError,
      },
      warn: {
        baseline: baselineWarn,
        compare: compareWarn,
        delta: compareWarn - baselineWarn,
      },
    },
    evidenceRiskCount: {
      baseline: 0,
      compare: changedIds.length,
      delta: changedIds.length,
    },
    asOf: asOf ?? new Date().toISOString(),
    drilldownActivityIds: {
      totalDelayMinutes: changedIds,
      collisionBySeverity: {
        error: changedIds,
        warn: changedIds,
      },
      evidenceRiskCount: changedIds,
    },
  }
}

/**
 * Calculate delta between baseline and compare activities.
 * Baseline = SSOT (option_c). Compare = scenario A/B/C.
 */
export function calculateDelta(
  baseline: ScheduleActivity[],
  compare: ScheduleActivity[],
  baselineConflicts: number = 0,
  compareConflicts: number = 0,
  options?: {
    baselineConflictBySeverity?: Partial<Record<CompareCollisionSeverity, number>>
    compareConflictBySeverity?: Partial<Record<CompareCollisionSeverity, number>>
    asOf?: string
  }
): CompareResult {
  const baselineMap = toMap(baseline)
  const compareMap = toMap(compare)

  const added: ActivityDelta[] = []
  const removed: ActivityDelta[] = []
  const changed: ActivityDelta[] = []

  for (const [id, comp] of compareMap) {
    const base = baselineMap.get(id)
    if (!base) {
      added.push({ activity_id: id, kind: "added", compare: comp })
    } else if (
      base.planned_start !== comp.planned_start ||
      base.planned_finish !== comp.planned_finish
    ) {
      changed.push({
        activity_id: id,
        kind: "changed",
        baseline: base,
        compare: comp,
        startDiff: base.planned_start !== comp.planned_start
          ? { from: base.planned_start, to: comp.planned_start }
          : undefined,
        endDiff: base.planned_finish !== comp.planned_finish
          ? { from: base.planned_finish, to: comp.planned_finish }
          : undefined,
      })
    }
  }

  for (const [id, base] of baselineMap) {
    if (!compareMap.has(id)) {
      removed.push({ activity_id: id, kind: "removed", baseline: base })
    }
  }

  const totalShifted = changed.length
  const collisionsNew = Math.max(0, compareConflicts - baselineConflicts)

  return {
    added,
    removed,
    changed,
    kpis: buildKpis(
      baseline,
      compare,
      changed,
      baselineConflicts,
      compareConflicts,
      options?.baselineConflictBySeverity ?? {},
      options?.compareConflictBySeverity ?? {},
      options?.asOf
    ),
    summary: {
      addedCount: added.length,
      removedCount: removed.length,
      changedCount: changed.length,
      totalShifted,
      collisionsNew,
    },
  }
}
