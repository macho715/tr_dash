import { describe, expect, it } from "vitest"
import {
  buildShiftDayWhatIf,
  buildTideWindows,
  findNearestSafeSlot,
  summarizeTideCoverage,
  validateTaskSafety,
  type TideDaySummary,
  type TideHourValue,
} from "@/lib/services/tideService"

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

describe("tideService", () => {
  describe("buildTideWindows", () => {
    it("marks below-threshold work hour as DANGER", () => {
      const windows = buildTideWindows([buildDay("2026-02-11", { 6: 1.79, 7: 1.79 })])
      const hour6 = windows.find((window) => window.date === "2026-02-11" && window.hour === 6)
      expect(hour6?.status).toBe("DANGER")
    })

    it("keeps single high hour as DANGER when it is not consecutive", () => {
      const windows = buildTideWindows([buildDay("2026-02-11", { 8: 1.9, 9: 1.0 })])
      const hour8 = windows.find((window) => window.date === "2026-02-11" && window.hour === 8)
      expect(hour8?.status).toBe("DANGER")
    })

    it("marks consecutive 2+ hours as SAFE", () => {
      const windows = buildTideWindows([
        buildDay("2026-02-11", {
          8: 1.9,
          9: 1.95,
          10: 1.6,
        }),
      ])

      const hour8 = windows.find((window) => window.date === "2026-02-11" && window.hour === 8)
      const hour9 = windows.find((window) => window.date === "2026-02-11" && window.hour === 9)
      expect(hour8?.status).toBe("SAFE")
      expect(hour9?.status).toBe("SAFE")
      expect(hour8?.safeRunId).toBeTruthy()
      expect(hour8?.safeRunId).toBe(hour9?.safeRunId)
    })

    it("marks non-work-window hours as CLOSED", () => {
      const windows = buildTideWindows([buildDay("2026-02-11", { 4: 2.2 })])
      const hour4 = windows.find((window) => window.date === "2026-02-11" && window.hour === 4)
      expect(hour4?.status).toBe("CLOSED")
    })
  })

  describe("validateTaskSafety", () => {
    const windows = buildTideWindows([
      buildDay("2026-02-11", {
        6: 1.6,
        7: 1.9,
        8: 1.9,
        9: 1.9,
        10: 1.4,
        16: 1.95,
        17: 1.95,
      }),
      buildDay("2026-02-12", {
        6: 1.5,
        7: 1.5,
      }),
    ])

    it("returns SAFE when all covered work-window hours are SAFE", () => {
      const result = validateTaskSafety(
        {
          id: "T-SAFE",
          name: "Safe task",
          start: new Date("2026-02-11T07:00:00Z"),
          end: new Date("2026-02-11T09:00:00Z"),
        },
        windows
      )

      expect(result.status).toBe("SAFE")
      expect(result.safeHours).toBe(2)
      expect(result.dangerHours).toBe(0)
      expect(result.reasons).toEqual(["ALL_WORK_WINDOW_HOURS_SAFE"])
    })

    it("returns DANGER when at least one covered work-window hour is DANGER", () => {
      const result = validateTaskSafety(
        {
          id: "T-DANGER",
          name: "Danger task",
          start: new Date("2026-02-11T06:00:00Z"),
          end: new Date("2026-02-11T08:00:00Z"),
        },
        windows
      )

      expect(result.status).toBe("DANGER")
      expect(result.safeHours).toBe(1)
      expect(result.dangerHours).toBe(1)
      expect(result.reasons).toEqual(["HAS_DANGER_HOURS"])
    })

    it("returns CLOSED when task has no covered work-window hour", () => {
      const result = validateTaskSafety(
        {
          id: "T-CLOSED",
          name: "Closed task",
          start: new Date("2026-02-11T00:00:00Z"),
          end: new Date("2026-02-11T04:00:00Z"),
        },
        windows
      )

      expect(result.status).toBe("CLOSED")
      expect(result.coveredHours).toBe(0)
      expect(result.closedHours).toBeGreaterThan(0)
      expect(result.reasons).toEqual(["NO_WORK_WINDOW_HOURS"])
    })

    it("aggregates multi-day task windows correctly", () => {
      const result = validateTaskSafety(
        {
          id: "T-MULTI",
          name: "Multi-day task",
          start: new Date("2026-02-11T16:00:00Z"),
          end: new Date("2026-02-12T07:00:00Z"),
        },
        windows
      )

      expect(result.status).toBe("DANGER")
      expect(result.safeHours).toBe(2)
      expect(result.dangerHours).toBe(1)
      expect(result.coveredHours).toBe(3)
    })
  })

  it("summarizes task coverage by status", () => {
    const windows = buildTideWindows([
      buildDay("2026-02-11", {
        6: 1.9,
        7: 1.9,
      }),
    ])

    const summary = summarizeTideCoverage(
      [
        {
          id: "A",
          name: "safe",
          start: new Date("2026-02-11T06:00:00Z"),
          end: new Date("2026-02-11T08:00:00Z"),
        },
        {
          id: "B",
          name: "closed",
          start: new Date("2026-02-11T00:00:00Z"),
          end: new Date("2026-02-11T02:00:00Z"),
        },
      ],
      windows
    )

    expect(summary).toEqual({
      safe: 1,
      danger: 0,
      closed: 1,
      total: 2,
    })
  })

  describe("advanced suggestions", () => {
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

    it("finds nearest safe slot for danger task", () => {
      const suggestion = findNearestSafeSlot(
        {
          id: "A1000",
          name: "Danger task",
          start: new Date("2026-02-11T12:00:00Z"),
          end: new Date("2026-02-12T12:00:00Z"),
        },
        windows
      )

      expect(suggestion).not.toBeNull()
      expect(suggestion?.shiftHours).toBe(6)
      expect(suggestion?.safety.status).toBe("SAFE")
    })

    it("builds +1/+2 day what-if statuses", () => {
      const whatIf = buildShiftDayWhatIf(
        {
          id: "A1000",
          name: "Danger task",
          start: new Date("2026-02-11T12:00:00Z"),
          end: new Date("2026-02-12T12:00:00Z"),
        },
        windows,
        [1, 2]
      )

      expect(whatIf).toHaveLength(2)
      expect(whatIf[0].shiftDays).toBe(1)
      expect(whatIf[0].safety.status).toBe("SAFE")
      expect(whatIf[1].shiftDays).toBe(2)
      expect(whatIf[1].safety.status).toBe("SAFE")
    })
  })
})
