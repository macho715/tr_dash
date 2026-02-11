import type { HistoryEvent } from "@/src/types/ssot"

export const HISTORY_SOFT_DELETED_EVENT_TYPE = "history_soft_deleted"
export const HISTORY_RESTORED_EVENT_TYPE = "history_restored"

export function isHistoryTombstoneEvent(event: HistoryEvent): boolean {
  return (
    event.event_type === HISTORY_SOFT_DELETED_EVENT_TYPE ||
    event.event_type === HISTORY_RESTORED_EVENT_TYPE
  )
}

function parseTargetEventId(event: HistoryEvent): string | null {
  const candidate = event.details?.target_event_id
  return typeof candidate === "string" && candidate.length > 0 ? candidate : null
}

export function composeHistoryEventsWithDeletionState(events: HistoryEvent[]): HistoryEvent[] {
  const tombstoneByTargetId = new Map<string, { deleted: boolean; actor?: string; ts?: string; reason?: string }>()

  for (const event of events) {
    if (!isHistoryTombstoneEvent(event)) continue
    const targetEventId = parseTargetEventId(event)
    if (!targetEventId) continue

    const deleted =
      typeof event.details?.deleted === "boolean"
        ? event.details.deleted
        : event.event_type === HISTORY_SOFT_DELETED_EVENT_TYPE

    const actor = typeof event.details?.actor === "string" ? event.details.actor : event.actor
    const tsRaw = typeof event.details?.ts === "string" ? event.details.ts : event.ts
    const ts = typeof tsRaw === "string" && tsRaw.length > 0 ? tsRaw : ""
    const reason = typeof event.details?.reason === "string" ? event.details.reason : undefined

    tombstoneByTargetId.set(targetEventId, { deleted, actor, ts, reason })
  }

  return events
    .filter((event) => !isHistoryTombstoneEvent(event))
    .map((event) => {
      const deletion = tombstoneByTargetId.get(event.event_id)
      if (!deletion) return event

      return {
        ...event,
        deleted: deletion.deleted,
        deleted_by: deletion.deleted ? deletion.actor : undefined,
        deleted_at: deletion.deleted ? deletion.ts : undefined,
        details: {
          ...(event.details ?? {}),
          deleted_reason: deletion.deleted ? deletion.reason : undefined,
        },
      }
    })
}
