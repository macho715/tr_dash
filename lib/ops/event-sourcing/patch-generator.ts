import type { Activity } from "@/src/types/ssot"
import type {
  EventLogItem,
  JsonPatchOp,
  PatchValidationResult,
  ValidationError,
} from "./types"

/**
 * Event -> JSON Patch operations 생성
 *
 * 핵심 규칙:
 * 1. plan.* 절대 수정 금지
 * 2. START/END -> actual.* 갱신
 * 3. HOLD/RESUME -> blocker.* 갱신
 * 4. MILESTONE -> history_events 추가
 */
export function generatePatchesForEvent(
  event: EventLogItem,
  activityId: string,
  currentActivity: Activity
): JsonPatchOp[] {
  const patches: JsonPatchOp[] = []
  const basePath = `/entities/activities/${activityId}`

  switch (event.state) {
    case "START": {
      patches.push({
        op: getPatchOp(currentActivity?.actual, "start_ts"),
        path: `${basePath}/actual/start_ts`,
        value: event.ts,
      })
      patches.push({
        op: "replace",
        path: `${basePath}/state`,
        value: "in_progress",
      })
      break
    }
    case "END": {
      patches.push({
        op: getPatchOp(currentActivity?.actual, "end_ts"),
        path: `${basePath}/actual/end_ts`,
        value: event.ts,
      })
      patches.push({
        op: "replace",
        path: `${basePath}/actual/progress_pct`,
        value: 100,
      })
      patches.push({
        op: "replace",
        path: `${basePath}/state`,
        value: "done",
      })
      break
    }
    case "HOLD": {
      const holdState = event.reason_tag === "WEATHER" ? "blocked" : "paused"
      patches.push({
        op: "replace",
        path: `${basePath}/state`,
        value: holdState,
      })
      if (event.reason_tag) {
        patches.push({
          op: "replace",
          path: `${basePath}/blocker_code`,
          value: event.reason_tag,
        })
        patches.push({
          op: "replace",
          path: `${basePath}/blocker_detail`,
          value: {
            hold_start_ts: event.ts,
            reason: event.note || event.reason_tag,
            eta_to_clear: null,
          },
        })
      }
      break
    }
    case "RESUME": {
      patches.push({
        op: "replace",
        path: `${basePath}/state`,
        value: "in_progress",
      })
      patches.push({
        op: "replace",
        path: `${basePath}/blocker_code`,
        value: null,
      })
      const currentBlockerDetail = (currentActivity as any)?.blocker_detail
      if (currentBlockerDetail) {
        patches.push({
          op: "replace",
          path: `${basePath}/blocker_detail/hold_end_ts`,
          value: event.ts,
        })
      }
      break
    }
    case "ARRIVE":
    case "DEPART": {
      const historyEvent = {
        event_id: event.event_id,
        ts: event.ts,
        actor: event.actor || "system",
        event_type: "milestone",
        entity_ref: {
          entity_type: "activity",
          entity_id: activityId,
        },
        details: {
          phase: event.phase,
          state: event.state,
          note: event.note,
          site: event.site,
        },
      }

      const historyEvents = (currentActivity as any)?.history_events
      if (!Array.isArray(historyEvents)) {
        patches.push({
          op: "add",
          path: `${basePath}/history_events`,
          value: [],
        })
      }

      patches.push({
        op: "add",
        path: `${basePath}/history_events/-`,
        value: historyEvent,
      })
      break
    }
    default:
      break
  }

  const eventLogRefs = (currentActivity as any)?.event_log_refs
  if (!Array.isArray(eventLogRefs)) {
    patches.push({
      op: "add",
      path: `${basePath}/event_log_refs`,
      value: [],
    })
  }
  patches.push({
    op: "add",
    path: `${basePath}/event_log_refs/-`,
    value: event.event_id,
  })

  return patches
}

/**
 * 전체 이벤트 로그 -> JSON Patch 배열
 */
export function generateAllPatches(
  events: EventLogItem[],
  resolutions: Map<string, string>,
  currentState: any
): JsonPatchOp[] {
  const allPatches: JsonPatchOp[] = []
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime()
  )

  const activityState = new Map<string, any>()

  for (const event of sortedEvents) {
    const activityId = resolutions.get(event.event_id)
    if (!activityId) continue
    const activity = currentState.entities?.activities?.[activityId]
    if (!activity) continue

    if (!activityState.has(activityId)) {
      activityState.set(activityId, cloneActivity(activity))
    }

    const currentActivity = activityState.get(activityId) as Activity
    const patches = generatePatchesForEvent(event, activityId, currentActivity)
    allPatches.push(...patches)

    applyPatchesToActivityState(currentActivity, activityId, patches)
  }

  return allPatches
}

/**
 * JSON Patch 검증 (plan 수정 금지)
 */
export function validatePatches(patches: JsonPatchOp[]): PatchValidationResult {
  const errors: ValidationError[] = []
  const forbiddenPaths: string[] = []
  const addForbiddenPath = (path: string) => {
    if (!forbiddenPaths.includes(path)) {
      forbiddenPaths.push(path)
    }
  }

  for (const patch of patches) {
    if (patch.path.includes("/plan/")) {
      addForbiddenPath(patch.path)
      errors.push({
        severity: "error",
        code: "FORBIDDEN_PLAN_MODIFICATION",
        message: `Attempt to modify plan: ${patch.path}`,
        events: [],
        details: {
          patch,
          hint: "plan.* fields are immutable - only actual.* can be modified",
        },
      })
    }

    if (patch.path.includes("/duration_min")) {
      addForbiddenPath(patch.path)
      errors.push({
        severity: "error",
        code: "FORBIDDEN_DURATION_MODIFICATION",
        message: `Attempt to modify duration_min: ${patch.path}`,
        events: [],
        details: { patch },
      })
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    forbidden_paths: forbiddenPaths,
  }
}

/**
 * Patch 통계 생성
 */
export function generatePatchStatistics(patches: JsonPatchOp[]): {
  total: number
  by_operation: Record<string, number>
  by_field: Record<string, number>
  affected_activities: Set<string>
} {
  const by_operation: Record<string, number> = {}
  const by_field: Record<string, number> = {}
  const affected_activities = new Set<string>()

  for (const patch of patches) {
    by_operation[patch.op] = (by_operation[patch.op] ?? 0) + 1

    const field = patch.path.split("/").pop() || "unknown"
    by_field[field] = (by_field[field] ?? 0) + 1

    const match = patch.path.match(/\/entities\/activities\/([^/]+)/)
    if (match) {
      affected_activities.add(match[1])
    }
  }

  return {
    total: patches.length,
    by_operation,
    by_field,
    affected_activities,
  }
}

function getPatchOp(
  parent: Record<string, unknown> | undefined,
  key: string
): "add" | "replace" {
  if (!parent) return "add"
  return Object.prototype.hasOwnProperty.call(parent, key) ? "replace" : "add"
}

function cloneActivity(activity: Activity): Activity {
  return JSON.parse(JSON.stringify(activity)) as Activity
}

function applyPatchesToActivityState(
  activity: any,
  activityId: string,
  patches: JsonPatchOp[]
): void {
  const prefix = `/entities/activities/${activityId}/`
  for (const patch of patches) {
    if (!patch.path.startsWith(prefix)) continue
    const relativePath = patch.path.slice(prefix.length)
    const parts = relativePath.split("/").filter(Boolean)
    applyPatchToObject(activity, parts, patch)
  }
}

function applyPatchToObject(
  target: any,
  parts: string[],
  patch: JsonPatchOp
): void {
  if (!target) return
  const lastIndex = parts.length - 1
  let cursor = target
  for (let i = 0; i < lastIndex; i += 1) {
    const key = parts[i]
    if (cursor[key] == null || typeof cursor[key] !== "object") {
      cursor[key] = {}
    }
    cursor = cursor[key]
  }
  const lastKey = parts[lastIndex]
  if (patch.op === "add" || patch.op === "replace") {
    if (lastKey === "-") {
      if (Array.isArray(cursor)) {
        cursor.push((patch as { value: unknown }).value)
      }
      return
    }
    cursor[lastKey] = (patch as { value: unknown }).value
  } else if (patch.op === "remove") {
    delete cursor[lastKey]
  }
}
