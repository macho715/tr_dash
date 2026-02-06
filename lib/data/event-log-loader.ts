import type { EventLogItem } from "@/lib/ops/event-sourcing/types"

const CACHE_KEY = "event_log_cache"
const CACHE_TS_KEY = "event_log_cache_ts"
const CACHE_TTL_HOURS = 1

export async function loadEventLog(): Promise<Map<string, EventLogItem[]>> {
  if (typeof window === "undefined") return new Map()

  if (isEventLogCacheValid()) {
    const cached = localStorage.getItem(CACHE_KEY)
    if (cached) {
      try {
        const events = JSON.parse(cached) as EventLogItem[]
        return groupEventsByActivity(events)
      } catch {
        // fallthrough to fetch
      }
    }
  }

  try {
    const response = await fetch("/data/event-logs/sample_events.json", {
      cache: "no-store",
    })
    if (!response.ok) throw new Error(`Failed to load event log: ${response.status}`)
    const events = (await response.json()) as EventLogItem[]
    cacheEventLog(events)
    return groupEventsByActivity(events)
  } catch (error) {
    console.error("Failed to load event log:", error)
    return new Map()
  }
}

export function groupEventsByActivity(
  events: EventLogItem[]
): Map<string, EventLogItem[]> {
  const map = new Map<string, EventLogItem[]>()
  for (const event of events) {
    const activityId = event.activity_id
    if (!activityId) continue
    if (!map.has(activityId)) {
      map.set(activityId, [])
    }
    map.get(activityId)!.push(event)
  }
  return map
}

export function cacheEventLog(events: EventLogItem[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(CACHE_KEY, JSON.stringify(events))
  localStorage.setItem(CACHE_TS_KEY, new Date().toISOString())
}

export function isEventLogCacheValid(): boolean {
  if (typeof window === "undefined") return false
  const cacheTs = localStorage.getItem(CACHE_TS_KEY)
  if (!cacheTs) return false
  const cacheDate = new Date(cacheTs)
  const diffHours =
    (Date.now() - cacheDate.getTime()) / (1000 * 60 * 60)
  return diffHours < CACHE_TTL_HOURS
}
