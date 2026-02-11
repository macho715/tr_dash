import { describe, expect, it } from "vitest"
import { buildTideWindows, type TideDaySummary, type TideHourValue } from "@/lib/services/tideService"
import { composeDragTideGuidance } from "../gantt-chart.tide-guidance"

function buildHourly(overrides: Record<number, number>): TideHourValue[] {
  return Array.from({ length: 24 }, (_, hour) => ({
    hour,
    height: overrides[hour] ?? 1.0,
  }))
}

function buildDay(date: string, overrides: Record<number, number>): TideDaySummary {
  return {
    date,
    hourly: buildHourly(overrides),
    high: 2.1,
    highTime: "07:00",
    low: 0.8,
    lowTime: "15:00",
  }
}

describe("composeDragTideGuidance", () => {
  it("returns guidance with nearest SAFE and +1/+2d what-if for DANGER drag", () => {
    const windows = buildTideWindows([
      buildDay("2026-02-11", {
        6: 1.2,
        7: 1.2,
        8: 1.2,
        9: 1.2,
        10: 1.2,
        11: 1.2,
        12: 1.2,
        13: 1.2,
        14: 1.2,
        15: 1.2,
        16: 1.2,
        17: 1.2,
      }),
      buildDay("2026-02-12", {
        6: 1.9,
        7: 1.9,
        8: 1.9,
        9: 1.9,
        10: 1.9,
        11: 1.9,
        12: 1.9,
        13: 1.9,
        14: 1.9,
        15: 1.9,
        16: 1.9,
        17: 1.9,
      }),
      buildDay("2026-02-13", {
        6: 1.9,
        7: 1.9,
        8: 1.9,
        9: 1.9,
        10: 1.9,
        11: 1.9,
        12: 1.9,
        13: 1.9,
        14: 1.9,
        15: 1.9,
        16: 1.9,
        17: 1.9,
      }),
    ])

    const guidance = composeDragTideGuidance({
      task: {
        id: "A1000",
        name: "Drag target",
        start: new Date("2026-02-11T12:00:00Z"),
        end: new Date("2026-02-12T12:00:00Z"),
      },
      windows,
    })

    expect(guidance).not.toBeNull()
    expect(guidance?.dragSafety.status).toBe("DANGER")
    expect(guidance?.nearestSafe).not.toBeNull()
    expect(guidance?.nearestSafe?.safety.status).toBe("SAFE")
    expect(guidance?.whatIf).toHaveLength(2)
    expect(guidance?.whatIf.map((option) => option.shiftDays)).toEqual([1, 2])
  })

  it("returns null when drag result is SAFE", () => {
    const windows = buildTideWindows([
      buildDay("2026-02-11", {
        6: 1.9,
        7: 1.9,
        8: 1.9,
        9: 1.9,
        10: 1.9,
        11: 1.9,
        12: 1.9,
        13: 1.9,
        14: 1.9,
        15: 1.9,
        16: 1.9,
        17: 1.9,
      }),
    ])

    const guidance = composeDragTideGuidance({
      task: {
        id: "A1000",
        name: "Drag target",
        start: new Date("2026-02-11T08:00:00Z"),
        end: new Date("2026-02-11T10:00:00Z"),
      },
      windows,
    })

    expect(guidance).toBeNull()
  })

  it("returns DANGER guidance with nearestSafe null when no SAFE slot exists", () => {
    const windows = buildTideWindows([
      buildDay("2026-02-11", {
        6: 1.2,
        7: 1.2,
        8: 1.2,
        9: 1.2,
        10: 1.2,
        11: 1.2,
        12: 1.2,
        13: 1.2,
        14: 1.2,
        15: 1.2,
        16: 1.2,
        17: 1.2,
      }),
      buildDay("2026-02-12", {
        6: 1.2,
        7: 1.2,
        8: 1.2,
        9: 1.2,
        10: 1.2,
        11: 1.2,
        12: 1.2,
        13: 1.2,
        14: 1.2,
        15: 1.2,
        16: 1.2,
        17: 1.2,
      }),
    ])

    const guidance = composeDragTideGuidance({
      task: {
        id: "A1000",
        name: "Drag target",
        start: new Date("2026-02-11T08:00:00Z"),
        end: new Date("2026-02-11T11:00:00Z"),
      },
      windows,
      searchHorizonHours: 24,
    })

    expect(guidance).not.toBeNull()
    expect(guidance?.dragSafety.status).toBe("DANGER")
    expect(guidance?.nearestSafe).toBeNull()
    expect(guidance?.whatIf).toHaveLength(2)
  })
})
