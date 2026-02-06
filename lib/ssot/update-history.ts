import { writeFile } from "fs/promises"
import { existsSync, readFileSync } from "fs"
import path from "path"
import type { HistoryEvent, OptionC } from "@/src/types/ssot"

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

export async function appendHistoryEventToSsot(input: {
  eventType: string
  entityRef: { entity_type: string; entity_id: string }
  details?: Record<string, unknown>
  actor?: string
}): Promise<{ ssotPath: string; historyEvent: HistoryEvent }> {
  const candidate = findSsotCandidate()
  if (!candidate) {
    throw new Error("SSOT file not found")
  }

  const ssot = candidate.data
  const historyEvent: HistoryEvent = {
    event_id: `HE_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    ts: new Date().toISOString(),
    actor: input.actor ?? "user",
    event_type: input.eventType,
    entity_ref: input.entityRef,
    details: input.details ?? {},
  }

  ssot.history_events = [...(ssot.history_events ?? []), historyEvent]
  await writeFile(candidate.path, `${JSON.stringify(ssot, null, 2)}\n`, "utf-8")

  return { ssotPath: candidate.path, historyEvent }
}

export async function setHistoryEventDeleted(input: {
  eventId: string
  deleted: boolean
  actor?: string
  reason?: string
}): Promise<{ ssotPath: string; event: HistoryEvent }> {
  const candidate = findSsotCandidate()
  if (!candidate) {
    throw new Error("SSOT file not found")
  }

  const ssot = candidate.data
  const events = ssot.history_events ?? []
  const index = events.findIndex((e) => e.event_id === input.eventId)
  if (index === -1) {
    throw new Error("History event not found")
  }

  const target = events[index]
  const nextEvent: HistoryEvent = {
    ...target,
    deleted: input.deleted,
    deleted_by: input.deleted ? input.actor ?? "user" : undefined,
    deleted_at: input.deleted ? new Date().toISOString() : undefined,
    details: {
      ...(target.details ?? {}),
      deleted_reason: input.reason ?? target.details?.deleted_reason,
    },
  }

  const nextEvents = [...events]
  nextEvents[index] = nextEvent
  ssot.history_events = nextEvents

  await writeFile(candidate.path, `${JSON.stringify(ssot, null, 2)}\n`, "utf-8")

  return { ssotPath: candidate.path, event: nextEvent }
}
