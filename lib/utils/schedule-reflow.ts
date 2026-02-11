/**
 * Schedule Reflow Engine
 *
 * Anchor-based schedule recalculation. Uses applyBulkAnchors for shift propagation.
 * README: lib/utils/schedule-reflow.ts
 */

import type {
  ScheduleActivity,
  ReflowResult,
  ReflowOptions,
  ImpactReport,
  DateChange,
  FreezeLockViolation,
} from "@/lib/ssot/schedule";
import type { IsoDate } from "@/lib/ops/agi/types";
import { diffUTCDays } from "@/lib/ssot/schedule";
import { applyBulkAnchors } from "@/lib/ops/agi/applyShift";
import { buildChanges } from "@/lib/ops/agi/adapters";
import { detectResourceConflicts } from "@/lib/utils/detect-resource-conflicts";

/**
 * @deprecated Use `previewScheduleReflow` from `src/lib/reflow/schedule-reflow-manager`.
 * This wrapper is retained for backward compatibility.
 */

function hasHardPin(activity: ScheduleActivity): boolean {
  return (activity.reflow_pins ?? []).some((pin) => {
    const strength = typeof pin.strength === "string" ? pin.strength.toUpperCase() : "";
    const hardness = typeof pin.hardness === "string" ? pin.hardness.toUpperCase() : "";
    return strength === "HARD" || hardness === "HARD";
  });
}

function hasHardLock(activity: ScheduleActivity): boolean {
  return typeof activity.lock_level === "string" && activity.lock_level.toUpperCase() === "HARD";
}

function collectFreezeLockViolations(
  activities: ScheduleActivity[],
  changes: DateChange[]
): FreezeLockViolation[] {
  const violations: FreezeLockViolation[] = [];

  for (const change of changes) {
    if (change.old_start === change.new_start) continue;

    const original = activities.find((activity) => activity.activity_id === change.activity_id);
    if (!original) continue;

    if (original.actual_start || original.actual_finish) {
      violations.push({
        activity_id: change.activity_id,
        old_start: change.old_start,
        new_start: change.new_start,
        reason: "actual_frozen",
        reason_label: "actual.start/end 존재 activity 이동 시도",
      });
      continue;
    }

    if (hasHardLock(original) || hasHardPin(original)) {
      violations.push({
        activity_id: change.activity_id,
        old_start: change.old_start,
        new_start: change.new_start,
        reason: "hard_lock_or_pin",
        reason_label: "lock_level=HARD 또는 pin=HARD 자동 조정 시도",
      });
    }
  }

  return violations;
}

export function reflowSchedule(
  activities: ScheduleActivity[],
  anchorId: string,
  newStart: string,
  options?: ReflowOptions
): ReflowResult {
  const respectLocks = options?.respectLocks ?? true;
  const includeLocked = !respectLocks;
  const nextActivities = applyBulkAnchors({
    activities,
    anchors: [{ activityId: anchorId, newStart: newStart as IsoDate }],
    includeLocked,
    strategy: "pivot_shift",
  });

  const changes = buildChanges(activities, nextActivities);
  const dateChanges: DateChange[] = changes.map((change) => ({
    activity_id: change.activityId,
    old_start: change.beforeStart,
    new_start: change.afterStart,
    old_finish: change.beforeFinish,
    new_finish: change.afterFinish,
    delta_days: diffUTCDays(change.beforeStart, change.afterStart),
  }));

  const conflicts =
    options?.checkResourceConflicts === false ? [] : detectResourceConflicts(nextActivities);

  const impact_report: ImpactReport = {
    affected_count: dateChanges.length,
    affected_ids: dateChanges.map((change) => change.activity_id),
    changes: dateChanges,
    conflicts,
    freeze_lock_violations: collectFreezeLockViolations(activities, dateChanges),
  };

  return { activities: nextActivities, impact_report };
}
