/**
 * GanttRow[] → vis-timeline { groups, items } mapper
 *
 * SSOT: option_c.json → scheduleActivitiesToGanttRows → ganttRowsToVisData
 * Date parsing: parseUTCDate (lib/ssot/schedule.ts) for consistency.
 * Task 8: compareDelta → baseline ghost bars (className: baseline-ghost)
 */

import type { GanttRow } from "@/lib/dashboard-data"
import { parseUTCDate, addUTCDays } from "@/lib/ssot/schedule"
import type { CompareResult } from "@/lib/compare/types"
import type { DateChange } from "@/lib/ssot/schedule"
import type { WeatherDelayChange } from "@/lib/weather/weather-delay-preview"

export interface VisGroup {
  id: string
  content: string
  order?: number
  nestedGroups?: string[]
  showNested?: boolean
  level?: number
}

export interface VisItem {
  id: string
  group: string
  content: string
  start: Date
  end: Date
  type: "range" | "background" | "point"
  className?: string
  title?: string
}

export interface VisTimelineData {
  groups: VisGroup[]
  items: VisItem[]
}

export interface GhostBarMetadata {
  type: "reflow" | "what_if" | "baseline" | "drag" | "weather"
  affected_count?: number
  conflict_count?: number
  scenario?: {
    reason?: string
    confidence?: number
    delay_days?: number
    activity_name?: string
  }
}

export interface GanttVisOptions {
  reflowPreview?: {
    changes: DateChange[]
    metadata?: GhostBarMetadata
  } | DateChange[] | null
  baselinePreview?: DateChange[] | null
  weatherPreview?: WeatherDelayChange[] | null
  weatherPropagated?: WeatherDelayChange[] | null
}

type CompareCacheKey = CompareResult | null

const visTimelineDataCache = new WeakMap<
  GanttRow[],
  Map<CompareCacheKey, Map<string, VisTimelineData>>
>()

const ROW_CACHE_LIMIT = 200
const rowCache = new Map<
  string,
  { group: VisGroup; items: VisItem[]; activityIds: string[] }
>()

function buildRowCacheKey(row: GanttRow, rowIdx: number): string {
  const base = `${rowIdx}|${row.isHeader ? "H" : "R"}|${row.name}`
  if (row.isHeader || !row.activities || row.activities.length === 0) return base
  const activityKey = row.activities
    .map((activity) => `${activity.label}|${activity.start}|${activity.end}|${activity.type}`)
    .join("||")
  return `${base}|${activityKey}`
}

function setRowCache(
  key: string,
  value: { group: VisGroup; items: VisItem[]; activityIds: string[] }
) {
  if (rowCache.has(key)) return
  rowCache.set(key, value)
  if (rowCache.size > ROW_CACHE_LIMIT) {
    const firstKey = rowCache.keys().next().value
    if (firstKey) rowCache.delete(firstKey)
  }
}

/**
 * Extract activity_id from label (format: "A1000: Activity name")
 */
function extractActivityId(label: string): string {
  const colonIdx = label.indexOf(":")
  return colonIdx >= 0 ? label.slice(0, colonIdx).trim() : label
}

/**
 * Map GanttRow[] to vis-timeline groups and items.
 * Uses parseUTCDate for date consistency (Bug #1 prevention).
 * Task 8: When compareDelta has changed items with compare, adds ghost bars (baseline-ghost).
 */
export function ganttRowsToVisData(
  rows: GanttRow[],
  compareDelta?: CompareResult | null,
  options?: GanttVisOptions
): VisTimelineData {
  const groups: VisGroup[] = []
  const items: VisItem[] = []
  const activityIdToGroupId = new Map<string, string>()

  for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
    const row = rows[rowIdx]
    const rowKey = buildRowCacheKey(row, rowIdx)
    const cachedRow = rowCache.get(rowKey)
    if (cachedRow) {
      groups.push(cachedRow.group)
      items.push(...cachedRow.items)
      for (const activityId of cachedRow.activityIds) {
        activityIdToGroupId.set(activityId, cachedRow.group.id)
      }
      continue
    }

    const groupId = `group_${rowIdx}`
    const group: VisGroup = {
      id: groupId,
      content: row.name,
      order: rowIdx,
    }
    groups.push(group)

    const rowItems: VisItem[] = []
    const activityIds: string[] = []

    if (!row.isHeader) {
      const rowActivities = row.activities ?? []
      for (const activity of rowActivities) {
        const activityId = extractActivityId(activity.label)
        activityIdToGroupId.set(activityId, groupId)
        activityIds.push(activityId)
        const start = parseUTCDate(activity.start)
        let end = parseUTCDate(activity.end)
        if (end.getTime() <= start.getTime()) {
          end = addUTCDays(start, 1)
        }
        const typeClass = `gantt-type-${activity.type}`

        rowItems.push({
          id: activityId,
          group: groupId,
          content: activity.label,
          start,
          end,
          type: "range",
          className: typeClass,
          title: activity.label,
        })
      }
    }

    if (rowItems.length > 0) {
      items.push(...rowItems)
    }
    setRowCache(rowKey, { group, items: rowItems, activityIds })
  }

  if (compareDelta?.changed?.length) {
    for (const d of compareDelta.changed) {
      if (!d.compare) continue
      const groupId = activityIdToGroupId.get(d.activity_id)
      if (!groupId) continue
      const start = parseUTCDate(d.compare.planned_start)
      let end = parseUTCDate(d.compare.planned_finish)
      if (end.getTime() <= start.getTime()) end = addUTCDays(start, 1)
      items.push({
        id: `ghost_${d.activity_id}`,
        group: groupId,
        content: `(Compare) ${d.activity_id}`,
        start,
        end,
        type: "range",
        className: "baseline-ghost",
        title: `Compare: baseline position for ${d.activity_id}`,
      })
    }
  }

  // Ghost bars for reflow preview (supports both old and new format)
  const reflowChanges = Array.isArray(options?.reflowPreview)
    ? options.reflowPreview
    : options?.reflowPreview?.changes || null
  const reflowMetadata = Array.isArray(options?.reflowPreview)
    ? undefined
    : options?.reflowPreview?.metadata

  if (reflowChanges?.length) {
    for (const change of reflowChanges) {
      const groupId = activityIdToGroupId.get(change.activity_id)
      if (!groupId) continue
      if (
        change.old_start === change.new_start &&
        change.old_finish === change.new_finish
      ) {
        continue
      }
      const start = parseUTCDate(change.new_start)
      let end = parseUTCDate(change.new_finish)
      if (end.getTime() <= start.getTime()) end = addUTCDays(start, 1)

      // Determine ghost bar type and styling
      const isWhatIf = reflowMetadata?.type === "what_if"
      const className = isWhatIf ? "ghost-bar-what-if" : "ghost-bar-reflow"
      
      // Enhanced tooltip with Before/After/Delta information
      let title = `Reflow preview: ${change.old_start} → ${change.new_start}`
      if (isWhatIf && reflowMetadata?.scenario) {
        const { reason, delay_days, confidence } = reflowMetadata.scenario
        const deltaDays = delay_days || 0
        const affectedCount = reflowMetadata.affected_count
        const conflictCount = reflowMetadata.conflict_count
        
        // Build detailed tooltip
        const lines = [
          `╔═══════════════════════════════════════╗`,
          `║  🔮 WHAT-IF SIMULATION                 ║`,
          `╚═══════════════════════════════════════╝`,
          ``,
          `📋 Activity: ${change.activity_id}`,
          ``,
          `━━━ 📅 Original Plan ━━━`,
          `  Start:  ${change.old_start}`,
          `  Finish: ${change.old_finish}`,
          ``,
          `━━━ 🔮 Preview (What-If) ━━━`,
          `  Start:  ${change.new_start}`,
          `  Finish: ${change.new_finish}`,
          ``,
          `━━━ 📊 Changes (Δ) ━━━`,
          `  Δ ${deltaDays > 0 ? '+' : ''}${deltaDays} days`,
          ``,
          `━━━ ℹ️  Scenario ━━━`,
          `  Reason: ${reason || "Manual delay"}`,
          `  Confidence: ${Math.round((confidence || 0) * 100)}%`,
        ]
        
        if (affectedCount !== undefined || conflictCount !== undefined) {
          lines.push(``, `━━━ ⚠️  Impact ━━━`)
          if (affectedCount !== undefined) {
            lines.push(`  Affected: ${affectedCount} activities`)
          }
          if (conflictCount !== undefined) {
            const icon = conflictCount > 0 ? '🔴' : '✅'
            lines.push(`  ${icon} Conflicts: ${conflictCount}`)
          }
        }
        
        lines.push(
          ``,
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
          `💡 This is a preview only`,
          `   Click "Apply" to commit changes`
        )
        
        title = lines.join('\n')
      }

      if (isWhatIf) {
        const oldStart = parseUTCDate(change.old_start)
        let oldEnd = parseUTCDate(change.old_finish)
        if (oldEnd.getTime() <= oldStart.getTime()) oldEnd = addUTCDays(oldStart, 1)
        items.push({
          id: `reflow_ghost_old_${change.activity_id}`,
          group: groupId,
          content: `(What-If Before) ${change.activity_id}`,
          start: oldStart,
          end: oldEnd,
          type: "range",
          className: "ghost-bar-what-if-old",
          title: `Original: ${change.old_start} → ${change.old_finish}`,
        })
        items.push({
          id: `reflow_ghost_new_${change.activity_id}`,
          group: groupId,
          content: `(What-If After) ${change.activity_id}`,
          start,
          end,
          type: "range",
          className: "ghost-bar-what-if-new",
          title,
        })
      } else {
        items.push({
          id: `reflow_ghost_${change.activity_id}`,
          group: groupId,
          content: `(Reflow) ${change.activity_id}`,
          start,
          end,
          type: "range",
          className,
          title,
        })
      }
    }
  }

  // Ghost bars for baseline comparison
  if (options?.baselinePreview?.length) {
    for (const change of options.baselinePreview) {
      const groupId = activityIdToGroupId.get(change.activity_id)
      if (!groupId) continue
      if (
        change.old_start === change.new_start &&
        change.old_finish === change.new_finish
      ) {
        continue
      }
      const start = parseUTCDate(change.old_start)
      let end = parseUTCDate(change.old_finish)
      if (end.getTime() <= start.getTime()) end = addUTCDays(start, 1)

      items.push({
        id: `baseline_ghost_${change.activity_id}`,
        group: groupId,
        content: `(Baseline) ${change.activity_id}`,
        start,
        end,
        type: "range",
        className: "ghost-bar-baseline",
        title: `Baseline: ${change.old_start} → ${change.old_finish}`,
      })
    }
  }

  // Ghost bars for weather delay preview
  if (options?.weatherPreview?.length) {
    for (const change of options.weatherPreview) {
      const groupId = activityIdToGroupId.get(change.activity_id)
      if (!groupId) continue
      if (
        change.old_start === change.new_start &&
        change.old_finish === change.new_finish
      ) {
        continue
      }
      const start = parseUTCDate(change.new_start)
      let end = parseUTCDate(change.new_finish)
      if (end.getTime() <= start.getTime()) end = addUTCDays(start, 1)

      const reason = change.reason ? ` — ${change.reason}` : ""
      items.push({
        id: `weather_ghost_${change.activity_id}`,
        group: groupId,
        content: `(Weather) ${change.activity_id}`,
        start,
        end,
        type: "range",
        className: "ghost-bar-weather",
        title: `Weather delay: ${change.old_start} → ${change.new_start}${reason}`,
      })
    }
  }

  // Ghost bars for weather-propagated changes
  if (options?.weatherPropagated?.length) {
    for (const change of options.weatherPropagated) {
      const groupId = activityIdToGroupId.get(change.activity_id)
      if (!groupId) continue
      if (
        change.old_start === change.new_start &&
        change.old_finish === change.new_finish
      ) {
        continue
      }
      const start = parseUTCDate(change.new_start)
      let end = parseUTCDate(change.new_finish)
      if (end.getTime() <= start.getTime()) end = addUTCDays(start, 1)

      const reason = change.reason ? ` — ${change.reason}` : ""
      items.push({
        id: `weather_prop_ghost_${change.activity_id}`,
        group: groupId,
        content: `(WX Prop) ${change.activity_id}`,
        start,
        end,
        type: "range",
        className: "ghost-bar-weather-propagated",
        title: `Weather propagated: ${change.old_start} → ${change.new_start}${reason}`,
      })
    }
  }

  return { groups, items }
}

/**
 * Cached mapper for stable rows/compareDelta references.
 * Uses WeakMap to avoid retaining unused row arrays.
 */
export function ganttRowsToVisDataCached(
  rows: GanttRow[],
  compareDelta?: CompareResult | null,
  options?: GanttVisOptions
): VisTimelineData {
  const compareKey = compareDelta ?? null
  
  // Create cache key from options
  const reflowChanges = Array.isArray(options?.reflowPreview)
    ? options.reflowPreview
    : options?.reflowPreview?.changes || null
  const reflowMetadata = Array.isArray(options?.reflowPreview)
    ? undefined
    : options?.reflowPreview?.metadata
  const reflowKey = JSON.stringify({
    changes: reflowChanges,
    metadata: reflowMetadata,
    baseline: options?.baselinePreview || null,
    weather: options?.weatherPreview || null,
    weatherProp: options?.weatherPropagated || null
  })
  
  let compareMap = visTimelineDataCache.get(rows)
  if (!compareMap) {
    compareMap = new Map<CompareCacheKey, Map<string, VisTimelineData>>()
    visTimelineDataCache.set(rows, compareMap)
  }
  let reflowMap = compareMap.get(compareKey)
  if (!reflowMap) {
    reflowMap = new Map<string, VisTimelineData>()
    compareMap.set(compareKey, reflowMap)
  }
  const cached = reflowMap.get(reflowKey)
  if (cached) return cached
  const result = ganttRowsToVisData(rows, compareDelta, options)
  reflowMap.set(reflowKey, result)
  return result
}
