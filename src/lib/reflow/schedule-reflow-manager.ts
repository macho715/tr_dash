import type {
  DateChange,
  FreezeLockViolation,
  ImpactReport,
  ReflowOptions,
  ScheduleActivity,
  ScheduleConflict,
} from '@/lib/ssot/schedule'
import { diffUTCDays } from '@/lib/ssot/schedule'
import { applyBulkAnchors } from '@/lib/ops/agi/applyShift'
import { buildChanges } from '@/lib/ops/agi/adapters'
import type { IsoDate } from '@/lib/ops/agi/types'
import { detectResourceConflicts } from '@/lib/utils/detect-resource-conflicts'

export type ReflowPreviewDTO = {
  nextActivities: ScheduleActivity[]
  changes: Array<{
    activityId: string
    name: string
    beforeStart: string
    afterStart: string
    beforeFinish: string
    afterFinish: string
    voyageId?: string
    milestoneId?: string
    isLocked?: boolean
  }>
  collisions: ScheduleConflict[]
  impact: ImpactReport
  meta: {
    mode: 'shift' | 'bulk'
    anchors: Array<{ activityId: string; newStart: IsoDate }>
  }
}

type SchedulePreviewArgs = {
  activities: ScheduleActivity[]
  anchors: Array<{ activityId: string; newStart: IsoDate }>
  options?: ReflowOptions
  mode?: 'shift' | 'bulk'
}

function hasHardPin(activity: ScheduleActivity): boolean {
  return (activity.reflow_pins ?? []).some((pin) => {
    const strength = typeof pin.strength === 'string' ? pin.strength.toUpperCase() : ''
    const hardness = typeof pin.hardness === 'string' ? pin.hardness.toUpperCase() : ''
    return strength === 'HARD' || hardness === 'HARD'
  })
}

function hasHardLock(activity: ScheduleActivity): boolean {
  return typeof activity.lock_level === 'string' && activity.lock_level.toUpperCase() === 'HARD'
}

function collectFreezeLockViolations(
  activities: ScheduleActivity[],
  changes: DateChange[]
): FreezeLockViolation[] {
  const violations: FreezeLockViolation[] = []

  for (const change of changes) {
    if (change.old_start === change.new_start) continue

    const original = activities.find((activity) => activity.activity_id === change.activity_id)
    if (!original) continue

    if (original.actual_start || original.actual_finish) {
      violations.push({
        activity_id: change.activity_id,
        old_start: change.old_start,
        new_start: change.new_start,
        reason: 'actual_frozen',
        reason_label: 'actual.start/end 존재 activity 이동 시도',
      })
      continue
    }

    if (hasHardLock(original) || hasHardPin(original)) {
      violations.push({
        activity_id: change.activity_id,
        old_start: change.old_start,
        new_start: change.new_start,
        reason: 'hard_lock_or_pin',
        reason_label: 'lock_level=HARD 또는 pin=HARD 자동 조정 시도',
      })
    }
  }

  return violations
}

/** Client-safe canonical schedule reflow preview entrypoint. */
export function previewScheduleReflow({
  activities,
  anchors,
  options,
  mode = anchors.length > 1 ? 'bulk' : 'shift',
}: SchedulePreviewArgs): ReflowPreviewDTO {
  const respectLocks = options?.respectLocks ?? true
  const includeLocked = !respectLocks

  const next = applyBulkAnchors({
    activities,
    anchors,
    includeLocked,
  })

  return toReflowPreviewDTO({
    beforeActivities: activities,
    nextActivities: next,
    anchors,
    mode,
    options,
  })
}

export function toReflowPreviewDTO(args: {
  beforeActivities: ScheduleActivity[]
  nextActivities: ScheduleActivity[]
  anchors: Array<{ activityId: string; newStart: IsoDate }>
  mode: 'shift' | 'bulk'
  options?: ReflowOptions
}): ReflowPreviewDTO {
  const { beforeActivities, nextActivities, anchors, mode, options } = args
  const changes = buildChanges(beforeActivities, nextActivities)
  const collisions =
    options?.checkResourceConflicts === false ? [] : detectResourceConflicts(nextActivities)
  const impact: ImpactReport = {
    affected_count: changes.length,
    affected_ids: changes.map((change) => change.activityId),
    changes: changes.map((change) => ({
      activity_id: change.activityId,
      old_start: change.beforeStart,
      new_start: change.afterStart,
      old_finish: change.beforeFinish,
      new_finish: change.afterFinish,
      delta_days: diffUTCDays(change.beforeStart, change.afterStart),
    })),
    conflicts: collisions,
    freeze_lock_violations: collectFreezeLockViolations(
      beforeActivities,
      changes.map((change) => ({
        activity_id: change.activityId,
        old_start: change.beforeStart,
        new_start: change.afterStart,
        old_finish: change.beforeFinish,
        new_finish: change.afterFinish,
        delta_days: diffUTCDays(change.beforeStart, change.afterStart),
      }))
    ),
  }

  return {
    nextActivities,
    changes,
    collisions,
    impact,
    meta: {
      mode,
      anchors,
    },
  }
}

/** Canonical apply gate for Preview→Apply separation. */
export function applySchedulePreview(
  preview: { nextActivities: ScheduleActivity[] } | null,
  options: { canApply?: boolean } = {}
): ScheduleActivity[] | null {
  const canApply = options.canApply ?? true
  if (!preview || !canApply) {
    return null
  }
  return preview.nextActivities
}
