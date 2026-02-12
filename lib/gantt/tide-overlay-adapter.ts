import type { VisItem } from "@/lib/gantt/visTimelineMapper"
import type { TideWindow } from "@/lib/services/tideService"

export interface TideBackgroundAdapterOptions {
  groupId: string
  viewStart: Date
  viewEnd: Date
  idPrefix?: string
}

function clipRange(
  rangeStart: Date,
  rangeEnd: Date,
  viewStart: Date,
  viewEnd: Date
): { start: Date; end: Date } | null {
  const startMs = Math.max(rangeStart.getTime(), viewStart.getTime())
  const endMs = Math.min(rangeEnd.getTime(), viewEnd.getTime())
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return null
  }
  return {
    start: new Date(startMs),
    end: new Date(endMs),
  }
}

function toStatusClass(status: TideWindow["status"]): string {
  if (status === "SAFE") return "tide-safe"
  if (status === "DANGER") return "tide-danger"
  return "tide-closed"
}

export function tideWindowsToVisBackgroundItems(
  windows: TideWindow[],
  options: TideBackgroundAdapterOptions
): VisItem[] {
  const { groupId, viewStart, viewEnd, idPrefix = "tide_bg_" } = options
  const items: VisItem[] = []

  for (const window of windows) {
    const hourIso = String(window.hour).padStart(2, "0")
    const hourStart = new Date(`${window.date}T${hourIso}:00:00.000Z`)
    const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000)
    const clipped = clipRange(hourStart, hourEnd, viewStart, viewEnd)
    if (!clipped) continue

    items.push({
      id: `${idPrefix}${window.date}_${window.hour}`,
      group: groupId,
      content: "",
      start: clipped.start,
      end: clipped.end,
      type: "background",
      className: toStatusClass(window.status),
      title: `${window.date} ${hourIso}:00 ${window.status}`,
    })
  }

  return items
}
