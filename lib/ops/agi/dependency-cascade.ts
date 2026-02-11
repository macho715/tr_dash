import type {
  FreezeLockViolation,
  ScheduleActivity,
  ScheduleDependency,
} from "@/lib/ssot/schedule";
import { addUTCDays, calculateFinishDate, dateToIsoUtc, parseUTCDate } from "@/lib/ssot/schedule";
import type { IsoDate } from "./types";

type DependencyEdge = {
  predecessorId: string;
  successorId: string;
  type: ScheduleDependency["type"];
  lagDays: number;
};

export interface CascadeAnchor {
  activityId: string;
  newStart: IsoDate;
}

export interface CascadeDataError {
  kind: "data_error";
  code: "missing_predecessor";
  successor_id: string;
  predecessor_id: string;
  message: string;
}

export interface CascadeDiagnostics {
  impacted_count: number;
  anchor_count: number;
  blocked_by_freeze_lock: number;
  data_errors: CascadeDataError[];
}

export interface SimulateDependencyCascadeParams {
  activities: ScheduleActivity[];
  anchors: CascadeAnchor[];
  includeLocked: boolean;
  respectFreeze?: boolean;
}

export interface SimulateDependencyCascadeResult {
  nextActivities: ScheduleActivity[];
  violations: FreezeLockViolation[];
  diagnostics: CascadeDiagnostics;
}

function normalizeIsoDate(value: string): IsoDate {
  return value.slice(0, 10) as IsoDate;
}

function getActivityId(activity: ScheduleActivity): string | null {
  return activity.activity_id ?? null;
}

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

function isFreezeBlocked(activity: ScheduleActivity): boolean {
  return Boolean(activity.actual_start || activity.actual_finish);
}

function buildSuccessorMap(
  activities: ScheduleActivity[],
  byId: Map<string, ScheduleActivity>
): { successors: Map<string, DependencyEdge[]>; dataErrors: CascadeDataError[] } {
  const successors = new Map<string, DependencyEdge[]>();
  const dataErrors: CascadeDataError[] = [];

  for (const successor of activities) {
    const successorId = getActivityId(successor);
    if (!successorId) continue;
    const deps = successor.depends_on ?? [];

    for (const dep of deps) {
      const predecessorId = dep.predecessorId;
      if (!byId.has(predecessorId)) {
        dataErrors.push({
          kind: "data_error",
          code: "missing_predecessor",
          successor_id: successorId,
          predecessor_id: predecessorId,
          message: `Missing predecessor ${predecessorId} referenced by ${successorId}`,
        });
        continue;
      }

      const edge: DependencyEdge = {
        predecessorId,
        successorId,
        type: dep.type,
        lagDays: dep.lagDays,
      };
      if (!successors.has(predecessorId)) {
        successors.set(predecessorId, []);
      }
      successors.get(predecessorId)!.push(edge);
    }
  }

  for (const [predecessorId, edges] of successors.entries()) {
    edges.sort((a, b) => {
      const succA = byId.get(a.successorId);
      const succB = byId.get(b.successorId);
      if (!succA || !succB) return a.successorId.localeCompare(b.successorId);
      if (succA.planned_start !== succB.planned_start) {
        return succA.planned_start.localeCompare(succB.planned_start);
      }
      if (a.successorId !== b.successorId) {
        return a.successorId.localeCompare(b.successorId);
      }
      if (a.type !== b.type) {
        return a.type.localeCompare(b.type);
      }
      return a.lagDays - b.lagDays;
    });
    successors.set(predecessorId, edges);
  }

  return { successors, dataErrors };
}

function computeRequiredStart(
  predecessor: ScheduleActivity,
  successor: ScheduleActivity,
  edge: DependencyEdge
): IsoDate {
  const lagDays = Number.isFinite(edge.lagDays) ? edge.lagDays : 0;
  const predecessorStart = parseUTCDate(normalizeIsoDate(predecessor.planned_start));
  const predecessorFinish = parseUTCDate(normalizeIsoDate(predecessor.planned_finish));
  const successorDuration = Math.max(1, Math.ceil(successor.duration ?? 1));

  if (edge.type === "FS") {
    return dateToIsoUtc(addUTCDays(predecessorFinish, lagDays)) as IsoDate;
  }

  if (edge.type === "SS") {
    return dateToIsoUtc(addUTCDays(predecessorStart, lagDays)) as IsoDate;
  }

  if (edge.type === "FF") {
    const requiredFinish = addUTCDays(predecessorFinish, lagDays);
    return dateToIsoUtc(addUTCDays(requiredFinish, -(successorDuration - 1))) as IsoDate;
  }

  const requiredFinish = addUTCDays(predecessorStart, lagDays);
  return dateToIsoUtc(addUTCDays(requiredFinish, -(successorDuration - 1))) as IsoDate;
}

function sortAnchors(
  anchors: CascadeAnchor[],
  byId: Map<string, ScheduleActivity>
): CascadeAnchor[] {
  return [...anchors].sort((a, b) => {
    const actA = byId.get(a.activityId);
    const actB = byId.get(b.activityId);
    const startA = actA?.planned_start ?? "9999-12-31";
    const startB = actB?.planned_start ?? "9999-12-31";
    if (startA !== startB) return startA.localeCompare(startB);
    return a.activityId.localeCompare(b.activityId);
  });
}

export function simulateDependencyCascade(
  params: SimulateDependencyCascadeParams
): SimulateDependencyCascadeResult {
  const respectFreeze = params.respectFreeze ?? true;
  const originalById = new Map<string, ScheduleActivity>();
  const nextById = new Map<string, ScheduleActivity>();

  for (const activity of params.activities) {
    const activityId = getActivityId(activity);
    if (!activityId) continue;
    originalById.set(activityId, activity);
    nextById.set(activityId, { ...activity });
  }

  const { successors, dataErrors } = buildSuccessorMap(params.activities, nextById);
  const violations: FreezeLockViolation[] = [];
  const violationKeys = new Set<string>();

  const recordViolation = (
    activity: ScheduleActivity,
    oldStart: string,
    newStart: string,
    reason: FreezeLockViolation["reason"]
  ) => {
    const activityId = activity.activity_id ?? "";
    const key = `${activityId}|${oldStart}|${newStart}|${reason}`;
    if (violationKeys.has(key)) return;
    violationKeys.add(key);
    violations.push({
      activity_id: activityId,
      old_start: oldStart,
      new_start: newStart,
      reason,
      reason_label:
        reason === "actual_frozen"
          ? "actual.start/end 존재 activity 이동 시도"
          : "lock_level=HARD 또는 pin=HARD 자동 조정 시도",
    });
  };

  const attemptMove = (activityId: string, requestedStart: IsoDate): boolean => {
    const activity = nextById.get(activityId);
    if (!activity) return false;
    const oldStart = normalizeIsoDate(activity.planned_start);
    if (requestedStart === oldStart) return false;

    if (respectFreeze && isFreezeBlocked(activity)) {
      recordViolation(activity, oldStart, requestedStart, "actual_frozen");
      return false;
    }

    const isHardLocked = hasHardLock(activity) || hasHardPin(activity);
    const isSoftLocked = Boolean(activity.is_locked);
    if (!params.includeLocked && (isHardLocked || isSoftLocked)) {
      recordViolation(activity, oldStart, requestedStart, "hard_lock_or_pin");
      return false;
    }

    const duration = Math.max(1, Math.ceil(activity.duration ?? 1));
    const nextFinish = calculateFinishDate(requestedStart, duration);
    activity.planned_start = requestedStart;
    activity.planned_finish = nextFinish;

    return true;
  };

  const sortedAnchors = sortAnchors(params.anchors, nextById);
  const queue: string[] = [];

  for (const anchor of sortedAnchors) {
    const moved = attemptMove(anchor.activityId, normalizeIsoDate(anchor.newStart));
    if (moved) {
      queue.push(anchor.activityId);
    }
  }

  while (queue.length > 0) {
    const predecessorId = queue.shift()!;
    const predecessor = nextById.get(predecessorId);
    if (!predecessor) continue;
    const edges = successors.get(predecessorId) ?? [];

    for (const edge of edges) {
      const successor = nextById.get(edge.successorId);
      if (!successor) continue;

      const requiredStart = computeRequiredStart(predecessor, successor, edge);
      const currentStart = normalizeIsoDate(successor.planned_start);
      if (requiredStart <= currentStart) continue;

      const moved = attemptMove(edge.successorId, requiredStart);
      if (moved) {
        queue.push(edge.successorId);
      }
    }
  }

  const nextActivities = params.activities.map((activity) => {
    const activityId = getActivityId(activity);
    if (!activityId) return activity;
    return nextById.get(activityId) ?? activity;
  });

  const impactedCount = nextActivities.reduce((count, activity) => {
    const activityId = getActivityId(activity);
    if (!activityId) return count;
    const original = originalById.get(activityId);
    if (!original) return count;
    return normalizeIsoDate(original.planned_start) !== normalizeIsoDate(activity.planned_start)
      ? count + 1
      : count;
  }, 0);

  return {
    nextActivities,
    violations,
    diagnostics: {
      impacted_count: impactedCount,
      anchor_count: sortedAnchors.length,
      blocked_by_freeze_lock: violations.length,
      data_errors: dataErrors,
    },
  };
}
