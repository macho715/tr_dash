import type { ScheduleConflict, SuggestedAction } from "@/lib/ssot/schedule"
import type { Collision } from "@/src/types/ssot"

const KIND_TO_TYPE: Record<string, ScheduleConflict["type"]> = {
  resource_overallocated: "RESOURCE",
  dependency_cycle: "DEPENDENCY_CYCLE",
  constraint_violation: "CONSTRAINT",
  baseline_violation: "CONSTRAINT",
}

const SEVERITY_TO_LEVEL: Record<string, ScheduleConflict["severity"]> = {
  blocking: "error",
  warning: "warn",
  info: "warn",
}

const ROOT_CAUSE_LABELS: Record<string, string> = {
  PTW_MISSING: "PTW 미확보로 시작 불가",
  CERT_MISSING: "필수 인증 누락으로 작업 진행 불가",
  DEPENDENCY_CYCLE: "선후행 순환으로 일정 확정 불가",
  RESOURCE_OVERALLOCATED: "자원 중복 배정으로 동시 수행 불가",
}

function toSuggestedActions(actions: Collision["suggested_actions"]): SuggestedAction[] {
  return (actions ?? []).map((action) => ({
    kind: action.kind,
    label: action.label,
    params: action.params,
  }))
}

function readRootCauseCode(collision: Collision): string | undefined {
  const raw = collision.details?.root_cause_code
  return typeof raw === "string" && raw.length > 0 ? raw : undefined
}

export function getCollisionHeadline(collision: Pick<ScheduleConflict, "message" | "root_cause_code">) {
  if (collision.root_cause_code && ROOT_CAUSE_LABELS[collision.root_cause_code]) {
    return ROOT_CAUSE_LABELS[collision.root_cause_code]
  }
  return collision.message
}

export function mapSsotCollisionToScheduleConflict(collision: Collision): ScheduleConflict {
  const rootCauseCode = readRootCauseCode(collision)
  const kind = collision.kind
  const activityIds = collision.activity_ids ?? []
  const resourceIds = collision.resource_ids ?? []
  const startRaw = collision.details?.time_range?.start
  const endRaw = collision.details?.time_range?.end
  const timeRange = {
    start: typeof startRaw === "string" ? startRaw : null,
    end: typeof endRaw === "string" ? endRaw : null,
  }

  return {
    collision_id: collision.collision_id,
    kind,
    type: KIND_TO_TYPE[kind] ?? "CONSTRAINT",
    activity_id: activityIds[0] ?? "",
    activity_ids: activityIds,
    related_activity_ids: activityIds,
    message: collision.message,
    severity: SEVERITY_TO_LEVEL[collision.severity] ?? "warn",
    root_cause_code: rootCauseCode,
    resource_ids: resourceIds,
    resource: resourceIds[0],
    time_range: timeRange,
    overlapStart: timeRange.start ?? undefined,
    overlapEnd: timeRange.end ?? undefined,
    suggested_actions: toSuggestedActions(collision.suggested_actions),
    details: collision.details,
  }
}
