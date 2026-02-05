import type { OptionC, Activity } from "@/src/types/ssot"
import type { PR1Report, PR2Report, EventLogItem, JsonPatchOp } from "./types"
import {
  generateAllPatches,
  generatePatchStatistics,
  validatePatches,
} from "./patch-generator"
import { resolveActivityId } from "./activity-resolver"

/**
 * PR#2 파이프라인: JSON Patch 생성
 */
export async function runPR2Pipeline(
  pr1Report: PR1Report,
  events: EventLogItem[],
  optionC: OptionC
): Promise<PR2Report> {
  const timestamp = new Date().toISOString()

  const activityMap = buildActivityMap(optionC)
  const resolutions = new Map<string, string>()

  for (const event of events) {
    const resolution = resolveActivityId(event, activityMap)
    if (resolution.resolvedId) {
      resolutions.set(event.event_id, resolution.resolvedId)
    }
  }

  const patches = generateAllPatches(events, resolutions, optionC)
  const validation = validatePatches(patches)

  if (!validation.valid) {
    throw new Error(`Patch validation failed: ${validation.errors.length} errors`)
  }

  const stats = generatePatchStatistics(patches)

  return {
    timestamp,
    total_operations: patches.length,
    validation_result: validation,
    patch_file: {
      schema: "https://datatracker.ietf.org/doc/html/rfc6902",
      generated_at: timestamp,
      source: {
        pr1_report_id: pr1Report.timestamp,
        events_count: events.length,
        linked_events_count: resolutions.size,
      },
      operations: patches,
    },
    operations_by_type: stats.by_operation,
    affected_activities: stats.affected_activities.size,
    statistics: {
      by_field: stats.by_field,
      avg_operations_per_activity:
        stats.affected_activities.size > 0
          ? patches.length / stats.affected_activities.size
          : 0,
    },
  }
}

export function applyPatches(
  optionC: OptionC,
  patches: JsonPatchOp[]
): { success: boolean; document: OptionC; errors: unknown[] } {
  try {
    const document = JSON.parse(JSON.stringify(optionC)) as OptionC

    for (const patch of patches) {
      const pathParts = patch.path.split("/").filter((p) => p.length > 0)
      let target: any = document

      for (let i = 0; i < pathParts.length - 1; i += 1) {
        target = target?.[pathParts[i]]
        if (target == null) break
      }

      const lastKey = pathParts[pathParts.length - 1]

      if (patch.op === "add" || patch.op === "replace") {
        if (lastKey === "-") {
          const arrayPath = pathParts.slice(0, -1)
          let arr: any = document
          for (const part of arrayPath) {
            arr = arr?.[part]
          }
          if (Array.isArray(arr)) {
            arr.push((patch as { value: unknown }).value)
          }
        } else if (target) {
          target[lastKey] = (patch as { value: unknown }).value
        }
      } else if (patch.op === "remove" && target) {
        delete target[lastKey]
      }
    }

    return {
      success: true,
      document,
      errors: [],
    }
  } catch (error) {
    return {
      success: false,
      document: optionC,
      errors: [error],
    }
  }
}

function buildActivityMap(optionC: OptionC): Map<string, Activity> {
  const activities = optionC.entities?.activities ?? {}
  const map = new Map<string, Activity>()
  for (const [id, activity] of Object.entries(activities)) {
    if (!activity) continue
    map.set(id, activity)
  }
  return map
}
