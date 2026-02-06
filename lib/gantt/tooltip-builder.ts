/**
 * Enhanced Tooltip Builder for Gantt Chart
 * Provides detailed Before/After/Delta information for ghost bars
 */

import type { DateChange } from "@/lib/ssot/schedule"
import { diffUTCDays } from "@/lib/ssot/schedule"

export interface GhostBarTooltipData {
  activityId: string
  activityName?: string
  oldStart: string
  oldFinish: string
  newStart: string
  newFinish: string
  type: "what_if" | "reflow" | "weather" | "compare"
  metadata?: {
    reason?: string
    delay_days?: number
    confidence?: number
    affected_count?: number
    conflict_count?: number
  }
}

export function buildEnhancedGhostBarTooltip(data: GhostBarTooltipData): string {
  const deltaDays = diffUTCDays(data.oldStart, data.newStart)
  const durationBefore = diffUTCDays(data.oldStart, data.oldFinish)
  const durationAfter = diffUTCDays(data.newStart, data.newFinish)
  const durationChange = durationAfter - durationBefore

  const lines: string[] = []

  // Header
  lines.push(`╔═══════════════════════════════════════╗`)
  lines.push(`║  ${getTypeEmoji(data.type)} ${getTypeLabel(data.type).toUpperCase().padEnd(35)}║`)
  lines.push(`╚═══════════════════════════════════════╝`)
  lines.push("")

  // Activity Info
  lines.push(`📋 Activity: ${data.activityId}`)
  if (data.activityName) {
    lines.push(`   ${data.activityName}`)
  }
  lines.push("")

  // Original Plan Section
  lines.push(`━━━ 📅 Original Plan ━━━`)
  lines.push(`  Start:    ${formatDate(data.oldStart)}`)
  lines.push(`  Finish:   ${formatDate(data.oldFinish)}`)
  lines.push(`  Duration: ${durationBefore} days`)
  lines.push("")

  // Preview Section
  lines.push(`━━━ 🔮 Preview (${getTypeLabel(data.type)}) ━━━`)
  lines.push(`  Start:    ${formatDate(data.newStart)}`)
  lines.push(`  Finish:   ${formatDate(data.newFinish)}`)
  lines.push(`  Duration: ${durationAfter} days`)
  lines.push("")

  // Delta Section
  lines.push(`━━━ 📊 Changes (Δ) ━━━`)
  lines.push(`  Start Δ:    ${formatDelta(deltaDays)} days`)
  lines.push(`  Duration Δ: ${formatDelta(durationChange)} days`)
  lines.push("")

  // Metadata Section (What-If specific)
  if (data.metadata) {
    const m = data.metadata

    if (data.type === "what_if" && m.reason) {
      lines.push(`━━━ ℹ️  Scenario ━━━`)
      lines.push(`  Reason:     ${m.reason}`)
      if (m.delay_days !== undefined) {
        lines.push(`  Delay:      ${formatDelta(m.delay_days)} days`)
      }
      if (m.confidence !== undefined) {
        lines.push(`  Confidence: ${Math.round(m.confidence * 100)}%`)
      }
      lines.push("")
    }

    if (m.affected_count !== undefined || m.conflict_count !== undefined) {
      lines.push(`━━━ ⚠️  Impact ━━━`)
      if (m.affected_count !== undefined) {
        lines.push(`  Affected activities: ${m.affected_count}`)
      }
      if (m.conflict_count !== undefined) {
        const conflictColor = m.conflict_count > 0 ? "🔴" : "✅"
        lines.push(`  ${conflictColor} New conflicts: ${m.conflict_count}`)
      }
      lines.push("")
    }
  }

  // Footer Help
  lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  lines.push(`💡 This is a preview only`)
  lines.push(`   Click "Apply" to commit changes`)

  return lines.join("\n")
}

function getTypeEmoji(type: string): string {
  switch (type) {
    case "what_if":
      return "🔮"
    case "reflow":
      return "🔄"
    case "weather":
      return "🌦️"
    case "compare":
      return "📊"
    default:
      return "👻"
  }
}

function getTypeLabel(type: string): string {
  switch (type) {
    case "what_if":
      return "What-If Simulation"
    case "reflow":
      return "Reflow Preview"
    case "weather":
      return "Weather Delay"
    case "compare":
      return "Schedule Comparison"
    default:
      return "Preview"
  }
}

function formatDate(isoDate: string): string {
  const date = isoDate.slice(0, 10) // YYYY-MM-DD
  return date
}

function formatDelta(delta: number): string {
  if (delta === 0) return "±0"
  if (delta > 0) return `+${delta}`
  return `${delta}` // Already has minus sign
}

/**
 * Compact tooltip for simple ghost bars (when space is limited)
 */
export function buildCompactGhostBarTooltip(data: GhostBarTooltipData): string {
  const deltaDays = diffUTCDays(data.oldStart, data.newStart)
  const typeLabel = getTypeLabel(data.type)

  return `${getTypeEmoji(data.type)} ${typeLabel}
${data.activityId}
${formatDate(data.oldStart)} → ${formatDate(data.newStart)} (Δ ${formatDelta(deltaDays)} days)
${data.metadata?.reason || "Preview only"}`
}

/**
 * Helper to convert DateChange to GhostBarTooltipData
 */
export function dateChangeToTooltipData(
  change: DateChange,
  type: "what_if" | "reflow" | "weather" | "compare",
  metadata?: GhostBarTooltipData["metadata"]
): GhostBarTooltipData {
  return {
    activityId: change.activity_id,
    oldStart: change.old_start,
    oldFinish: change.old_finish,
    newStart: change.new_start,
    newFinish: change.new_finish,
    type,
    metadata,
  }
}
