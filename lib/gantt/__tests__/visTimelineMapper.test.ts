import { describe, it, expect } from "vitest"
import { ganttRowsToVisData } from "../visTimelineMapper"
import type { GanttRow } from "@/lib/dashboard-data"
import type { DateChange } from "@/lib/ssot/schedule"
import type { WeatherDelayChange } from "@/lib/weather/weather-delay-preview"

describe("ganttRowsToVisData", () => {
  it("maps GanttRow[] to groups and items", () => {
    const rows: GanttRow[] = [
      { name: "MOBILIZATION", isHeader: true },
      {
        name: "SPMT",
        isHeader: false,
        activities: [
          {
            start: "2026-01-26",
            end: "2026-01-26",
            type: "mobilization",
            label: "A1000: Mobilization of 1st set of SPMT",
          },
        ],
      },
    ]

    const result = ganttRowsToVisData(rows)

    expect(result.groups).toHaveLength(2)
    expect(result.groups[0]).toEqual({
      id: "group_0",
      content: "MOBILIZATION",
      order: 0,
    })
    expect(result.groups[1]).toEqual({
      id: "group_1",
      content: "SPMT",
      order: 1,
    })

    expect(result.items).toHaveLength(1)
    expect(result.items[0].id).toBe("A1000")
    expect(result.items[0].group).toBe("group_1")
    expect(result.items[0].content).toBe("A1000: Mobilization of 1st set of SPMT")
    expect(result.items[0].type).toBe("range")
    expect(result.items[0].start).toEqual(new Date(Date.UTC(2026, 0, 26)))
    // end <= start일 때 자동으로 1일 추가 (vis-timeline 표시를 위해)
    expect(result.items[0].end).toEqual(new Date(Date.UTC(2026, 0, 27)))
  })

  it("uses parseUTCDate for date consistency", () => {
    const rows: GanttRow[] = [
      {
        name: "Test",
        isHeader: false,
        activities: [
          {
            start: "2026-02-07",
            end: "2026-02-10",
            type: "mobilization",
            label: "A2000: Test activity",
          },
        ],
      },
    ]

    const result = ganttRowsToVisData(rows)

    expect(result.items[0].start.getUTCDate()).toBe(7)
    expect(result.items[0].start.getUTCMonth()).toBe(1)
    expect(result.items[0].start.getUTCFullYear()).toBe(2026)
    expect(result.items[0].end.getUTCDate()).toBe(10)
  })

  it("adds ghost bars when compareDelta has changed items (Task 8)", () => {
    const rows: GanttRow[] = [
      {
        name: "Test",
        isHeader: false,
        activities: [
          {
            start: "2026-02-07",
            end: "2026-02-10",
            type: "mobilization",
            label: "A2000: Test activity",
          },
        ],
      },
    ]
    const compareDelta = {
      added: [],
      removed: [],
      changed: [
        {
          activity_id: "A2000",
          kind: "changed" as const,
          compare: {
            activity_id: "A2000",
            activity_name: "Test",
            level1: "Test",
            level2: null,
            duration: 5,
            planned_start: "2026-02-08",
            planned_finish: "2026-02-13",
          },
        },
      ],
      kpis: {
        totalDelayMinutes: { baseline: 0, compare: 0, delta: 0 },
        collisionCountBySeverity: {
          error: { baseline: 0, compare: 0, delta: 0 },
          warn: { baseline: 0, compare: 0, delta: 0 },
        },
        evidenceRiskCount: { baseline: 0, compare: 0, delta: 0 },
        asOf: "2026-02-01T00:00:00.000Z",
        drilldownActivityIds: {
          totalDelayMinutes: ["A2000"],
          collisionBySeverity: { error: [], warn: [] },
          evidenceRiskCount: ["A2000"],
        },
      },
      summary: {
        addedCount: 0,
        removedCount: 0,
        changedCount: 1,
        totalShifted: 1,
        collisionsNew: 0,
      },
    }

    const result = ganttRowsToVisData(rows, compareDelta)

    expect(result.items).toHaveLength(2)
    expect(result.items[0].id).toBe("A2000")
    expect(result.items[1].id).toBe("ghost_A2000")
    expect(result.items[1].className).toBe("baseline-ghost")
    expect(result.items[1].start).toEqual(new Date(Date.UTC(2026, 1, 8)))
    expect(result.items[1].end).toEqual(new Date(Date.UTC(2026, 1, 13)))
  })

  it("adds reflow preview ghost bars when reflowPreview is provided", () => {
    const rows: GanttRow[] = [
      {
        name: "Test",
        isHeader: false,
        activities: [
          {
            start: "2026-02-07",
            end: "2026-02-10",
            type: "mobilization",
            label: "A3000: Test activity",
          },
        ],
      },
    ]
    const reflowPreview: DateChange[] = [
      {
        activity_id: "A3000",
        old_start: "2026-02-07",
        new_start: "2026-02-09",
        old_finish: "2026-02-10",
        new_finish: "2026-02-12",
        delta_days: 2,
      },
    ]

    const result = ganttRowsToVisData(rows, null, { reflowPreview })

    expect(result.items).toHaveLength(2)
    const ghost = result.items.find((item) => item.id === "reflow_ghost_A3000")
    expect(ghost).toBeTruthy()
    expect(ghost?.className).toBe("ghost-bar-reflow")
    expect(ghost?.start).toEqual(new Date(Date.UTC(2026, 1, 9)))
    expect(ghost?.end).toEqual(new Date(Date.UTC(2026, 1, 12)))
  })

  it("adds weather preview ghost bars when weatherPreview is provided", () => {
    const rows: GanttRow[] = [
      {
        name: "Test",
        isHeader: false,
        activities: [
          {
            start: "2026-02-07",
            end: "2026-02-10",
            type: "mobilization",
            label: "A4000: Test activity",
          },
        ],
      },
    ]
    const weatherPreview: WeatherDelayChange[] = [
      {
        activity_id: "A4000",
        old_start: "2026-02-07",
        new_start: "2026-02-09",
        old_finish: "2026-02-10",
        new_finish: "2026-02-12",
        delta_days: 2,
        reason: "Wave too high",
      },
    ]

    const result = ganttRowsToVisData(rows, null, { weatherPreview })

    const ghost = result.items.find((item) => item.id === "weather_ghost_A4000")
    expect(ghost).toBeTruthy()
    expect(ghost?.className).toBe("ghost-bar-weather")
    expect(ghost?.title).toContain("Wave too high")
  })

  it("adds weather propagated ghost bars when weatherPropagated is provided", () => {
    const rows: GanttRow[] = [
      {
        name: "Test",
        isHeader: false,
        activities: [
          {
            start: "2026-02-07",
            end: "2026-02-10",
            type: "mobilization",
            label: "A5000: Test activity",
          },
        ],
      },
    ]
    const weatherPropagated: WeatherDelayChange[] = [
      {
        activity_id: "A5000",
        old_start: "2026-02-07",
        new_start: "2026-02-09",
        old_finish: "2026-02-10",
        new_finish: "2026-02-12",
        delta_days: 2,
        reason: "Propagation",
      },
    ]

    const result = ganttRowsToVisData(rows, null, { weatherPropagated })

    const ghost = result.items.find((item) => item.id === "weather_prop_ghost_A5000")
    expect(ghost).toBeTruthy()
    expect(ghost?.className).toBe("ghost-bar-weather-propagated")
  })

  it("adds dual what-if ghost bars with impact metadata in title", () => {
    const rows: GanttRow[] = [
      {
        name: "Test",
        isHeader: false,
        activities: [
          {
            start: "2026-02-07",
            end: "2026-02-10",
            type: "mobilization",
            label: "A6000: Test activity",
          },
        ],
      },
    ]
    const reflowPreview = {
      changes: [
        {
          activity_id: "A6000",
          old_start: "2026-02-07",
          new_start: "2026-02-09",
          old_finish: "2026-02-10",
          new_finish: "2026-02-12",
          delta_days: 2,
        },
      ],
      metadata: {
        type: "what_if" as const,
        affected_count: 3,
        conflict_count: 1,
        scenario: {
          reason: "SPMT breakdown",
          delay_days: 2,
          confidence: 0.85,
        },
      },
    }

    const result = ganttRowsToVisData(rows, null, { reflowPreview })

    const oldGhost = result.items.find((item) => item.id === "reflow_ghost_old_A6000")
    const newGhost = result.items.find((item) => item.id === "reflow_ghost_new_A6000")
    expect(oldGhost?.className).toBe("ghost-bar-what-if-old")
    expect(newGhost?.className).toBe("ghost-bar-what-if-new")
    expect(newGhost?.title).toContain("Affected: 3 activities")
    expect(newGhost?.title).toContain("Conflicts: 1")
  })
})
