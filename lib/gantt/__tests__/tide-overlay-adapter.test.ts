import { describe, expect, it } from "vitest"
import { tideWindowsToVisBackgroundItems } from "@/lib/gantt/tide-overlay-adapter"
import type { TideWindow } from "@/lib/services/tideService"

const windows: TideWindow[] = [
  {
    date: "2026-02-11",
    hour: 6,
    height: 1.9,
    status: "SAFE",
    inWorkWindow: true,
    safeRunId: "run-1",
  },
  {
    date: "2026-02-11",
    hour: 7,
    height: 1.4,
    status: "DANGER",
    inWorkWindow: true,
  },
  {
    date: "2026-02-11",
    hour: 8,
    height: 0.9,
    status: "CLOSED",
    inWorkWindow: false,
  },
]

describe("tideWindowsToVisBackgroundItems", () => {
  it("maps windows to vis background items with tide classes", () => {
    const items = tideWindowsToVisBackgroundItems(windows, {
      groupId: "group_1",
      viewStart: new Date("2026-02-11T05:00:00Z"),
      viewEnd: new Date("2026-02-11T10:00:00Z"),
    })

    expect(items).toHaveLength(3)
    expect(items[0].type).toBe("background")
    expect(items[0].group).toBe("group_1")
    expect(items[0].className).toBe("tide-safe")
    expect(items[1].className).toBe("tide-danger")
    expect(items[2].className).toBe("tide-closed")
  })

  it("clips background item range to current view", () => {
    const items = tideWindowsToVisBackgroundItems(windows, {
      groupId: "group_1",
      viewStart: new Date("2026-02-11T06:30:00Z"),
      viewEnd: new Date("2026-02-11T07:30:00Z"),
    })

    expect(items).toHaveLength(2)
    expect(items[0].start.toISOString()).toBe("2026-02-11T06:30:00.000Z")
    expect(items[0].end.toISOString()).toBe("2026-02-11T07:00:00.000Z")
    expect(items[1].start.toISOString()).toBe("2026-02-11T07:00:00.000Z")
    expect(items[1].end.toISOString()).toBe("2026-02-11T07:30:00.000Z")
  })

  it("returns empty list when view window does not overlap", () => {
    const items = tideWindowsToVisBackgroundItems(windows, {
      groupId: "group_1",
      viewStart: new Date("2026-02-12T00:00:00Z"),
      viewEnd: new Date("2026-02-12T04:00:00Z"),
    })

    expect(items).toEqual([])
  })
})
