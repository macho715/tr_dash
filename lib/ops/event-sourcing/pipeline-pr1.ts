import type { OptionC, Activity } from "@/src/types/ssot"
import type {
  EventLogItem,
  PR1Report,
  ValidationResult,
} from "./types"
import {
  resolveActivityId,
  autoMatchActivityId,
} from "./activity-resolver"
import { runAllGates } from "./validators"

type ParsedRow = Record<string, string>

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (char === "\"") {
      const next = line[i + 1]
      if (inQuotes && next === "\"") {
        current += "\""
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (char === "," && !inQuotes) {
      result.push(current)
      current = ""
      continue
    }
    current += char
  }
  result.push(current)
  return result
}

export function parseEventLogCsv(csv: string): EventLogItem[] {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0)
  if (lines.length === 0) return []
  const headerLine = lines[0].replace(/^\uFEFF/, "")
  const headers = parseCsvLine(headerLine).map((h) => h.trim())
  const rows: ParsedRow[] = []

  for (const line of lines.slice(1)) {
    const values = parseCsvLine(line)
    const row: ParsedRow = {}
    for (let i = 0; i < headers.length; i += 1) {
      row[headers[i]] = values[i] ?? ""
    }
    rows.push(row)
  }

  return rows.map((row) => ({
    event_id: row.event_id,
    trip_id: row.trip_id,
    tr_unit: row.tr_unit || undefined,
    site: row.site as EventLogItem["site"],
    asset: row.asset,
    event_type: row.event_type as EventLogItem["event_type"],
    phase: row.phase as EventLogItem["phase"],
    state: row.state as EventLogItem["state"],
    ts: row.ts,
    activity_id: row.activity_id,
    reason_tag: row.reason_tag ? (row.reason_tag as EventLogItem["reason_tag"]) : undefined,
    actor: row.actor || undefined,
    note: row.note || undefined,
  }))
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

function generateAliasSuggestions(
  events: EventLogItem[],
  activities: Map<string, Activity>
): PR1Report["suggested_aliases"] {
  const suggestions = new Map<string, { to: string; confidence: number; reason: string }>()
  for (const event of events) {
    if (activities.has(event.activity_id)) continue
    const autoMatch = autoMatchActivityId(event, activities)
    if (!autoMatch.activityId || autoMatch.confidence < 0.7) continue
    const key = `${event.activity_id}|${autoMatch.activityId}`
    const existing = suggestions.get(key)
    if (!existing || autoMatch.confidence > existing.confidence) {
      suggestions.set(key, {
        to: autoMatch.activityId,
        confidence: autoMatch.confidence,
        reason: autoMatch.reason,
      })
    }
  }

  return Array.from(suggestions.entries()).map(([key, value]) => {
    const [from, to] = key.split("|")
    return { from, to, confidence: value.confidence, reason: value.reason }
  })
}

export async function runPR1Pipeline(
  eventsCsv: string,
  optionC: OptionC
): Promise<PR1Report> {
  const events = parseEventLogCsv(eventsCsv)
  const activityMap = buildActivityMap(optionC)
  const validationResults: ValidationResult[] = runAllGates(events)

  let linkedCount = 0
  const unlinkedEvents: PR1Report["unlinked_events"] = []

  for (const event of events) {
    const resolution = resolveActivityId(event, activityMap)
    if (resolution.resolvedId) {
      linkedCount += 1
    } else {
      const autoMatch = autoMatchActivityId(event, activityMap)
      unlinkedEvents.push({
        event_id: event.event_id,
        activity_id: event.activity_id,
        suggested_activity_id: autoMatch.activityId,
        confidence_score: autoMatch.confidence,
        reason: autoMatch.reason,
      })
    }
  }

  const totalEvents = events.length
  const unlinkedCount = totalEvents - linkedCount
  const matchingRate = totalEvents > 0 ? linkedCount / totalEvents : 0

  return {
    timestamp: new Date().toISOString(),
    total_events: totalEvents,
    linked_count: linkedCount,
    unlinked_count: unlinkedCount,
    matching_rate: matchingRate,
    validation_results: validationResults,
    unlinked_events: unlinkedEvents,
    suggested_aliases: generateAliasSuggestions(events, activityMap),
  }
}
