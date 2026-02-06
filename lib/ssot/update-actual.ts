import { writeFile } from "fs/promises"
import { existsSync, readFileSync } from "fs"
import path from "path"
import type { Activity, HistoryEvent, OptionC } from "@/src/types/ssot"
import { transitionState } from "@/src/lib/state-machine/transition"

type ActualUpdateInput = {
  activityId: string
  actualStart?: string | null
  actualEnd?: string | null
  actor?: string
}

export type ActualUpdateResult = {
  ssotPath: string
  activity: Activity
  historyEvent: HistoryEvent
  transition?: { success: boolean; blocker_code?: string; reason?: string }
  transitionEvent?: HistoryEvent
}

type SsotCandidate = {
  path: string
  data: OptionC
}

const SSOT_CANDIDATES = [
  "data/schedule/option_c_v0.8.0.json",
  "data/schedule/option_c.json",
  "tests/fixtures/option_c_baseline.json",
  "option_c.json",
]

function findSsotCandidate(): SsotCandidate | null {
  const root = process.cwd()
  for (const rel of SSOT_CANDIDATES) {
    const targetPath = path.join(root, rel)
    if (!existsSync(targetPath)) continue
    try {
      const raw = readFileSync(targetPath, "utf-8")
      const data = JSON.parse(raw) as OptionC
      const activities = data?.entities?.activities
      if (!activities || typeof activities !== "object" || Array.isArray(activities)) {
        continue
      }
      if (Object.keys(activities).length === 0) continue
      return { path: targetPath, data }
    } catch {
      continue
    }
  }
  return null
}

function buildActualHistoryEvent(
  activityId: string,
  actor: string,
  actualStart: string | null,
  actualEnd: string | null
): HistoryEvent {
  const ts = new Date().toISOString()
  return {
    event_id: `HE_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    ts,
    actor,
    event_type: "actual_changed",
    entity_ref: {
      entity_type: "activity",
      entity_id: activityId,
    },
    details: {
      message: `Actual dates updated: ${actualStart ?? "--"} -> ${actualEnd ?? "--"}`,
      actual_start_ts: actualStart,
      actual_end_ts: actualEnd,
    },
  }
}

export async function updateActualDates({
  activityId,
  actualStart,
  actualEnd,
  actor = "user",
}: ActualUpdateInput): Promise<ActualUpdateResult> {
  const candidate = findSsotCandidate()
  if (!candidate) {
    throw new Error("SSOT file not found")
  }

  const ssot = candidate.data
  const activity = ssot.entities?.activities?.[activityId]
  if (!activity) {
    throw new Error(`Activity not found: ${activityId}`)
  }

  const nextActual = { ...activity.actual }
  if (actualStart !== undefined) nextActual.start_ts = actualStart
  if (actualEnd !== undefined) nextActual.end_ts = actualEnd

  const nextActivity: Activity = {
    ...activity,
    actual: nextActual,
  }

  let transitionResult: ActualUpdateResult["transition"]
  let transitionEvent: HistoryEvent | undefined
  if (actualEnd !== undefined && actualEnd !== null && activity.state === "in_progress") {
    const transition = transitionState(nextActivity, "completed", actor, { ssot })
    transitionResult = {
      success: transition.success,
      blocker_code: transition.blocker_code,
      reason: transition.history_event?.details?.reason,
    }
    if (transition.success) {
      transitionEvent = transition.history_event
      ssot.history_events = [...(ssot.history_events ?? []), transition.history_event]
    }
  }

  ssot.entities.activities[activityId] = nextActivity

  const historyEvent = buildActualHistoryEvent(
    activityId,
    actor,
    nextActual.start_ts,
    nextActual.end_ts
  )
  ssot.history_events = [...(ssot.history_events ?? []), historyEvent]

  await writeFile(candidate.path, `${JSON.stringify(ssot, null, 2)}\n`, "utf-8")

  return {
    ssotPath: candidate.path,
    activity: nextActivity,
    historyEvent,
    transition: transitionResult,
    transitionEvent,
  }
}
