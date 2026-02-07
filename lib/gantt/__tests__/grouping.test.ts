import { describe, it, expect } from "vitest"
import type { ScheduleActivity } from "@/lib/ssot/schedule"
import { applyGanttFilters, buildGroupedVisData } from "@/lib/gantt/grouping"
import type { SlackResult } from "@/lib/utils/slack-calc"
import { parseUTCDate } from "@/lib/ssot/schedule"

function makeActivity(partial: Partial<ScheduleActivity>): ScheduleActivity {
  return {
    activity_id: "A100",
    activity_name: "Test",
    level1: "Voyage 1: TR Unit 1",
    level2: "Phase 1",
    duration: 1,
    planned_start: "2026-01-01",
    planned_finish: "2026-01-01",
    ...partial,
  }
}

describe("gantt grouping", () => {
  it("builds nested groups and assigns items", () => {
    const activities: ScheduleActivity[] = [
      makeActivity({
        activity_id: "A101",
        activity_name: "Loadout",
        tr_unit_id: "TR-1",
        anchor_type: "LOADOUT",
        resource_tags: ["SPMT"],
      }),
      makeActivity({
        activity_id: "A102",
        activity_name: "Turning",
        tr_unit_id: "TR-1",
        anchor_type: "TURNING",
        resource_tags: ["Crane"],
      }),
      makeActivity({
        activity_id: "A201",
        activity_name: "Load-in",
        tr_unit_id: "TR-2",
        anchor_type: "LOADIN",
        resource_tags: ["SPMT"],
      }),
    ]

    const result = buildGroupedVisData({ activities })

    expect(result.groups.find((g) => g.id === "tr_tr-unit-1")).toBeTruthy()
    expect(result.groups.find((g) => g.id === "tr_tr-unit-2")).toBeTruthy()
    expect(result.activityIdToGroupId.get("A101")).toMatch(/^date_/)
    expect(result.items.length).toBe(5)
  })

  it("respects collapsed groups", () => {
    const activities: ScheduleActivity[] = [
      makeActivity({
        activity_id: "A101",
        activity_name: "Loadout",
        tr_unit_id: "TR-1",
        anchor_type: "LOADOUT",
        resource_tags: ["SPMT"],
      }),
    ]

    const result = buildGroupedVisData({
      activities,
      collapsedGroupIds: new Set(["tr_tr-unit-1"]),
    })

    const trGroup = result.groups.find((g) => g.id === "tr_tr-unit-1")
    expect(trGroup?.showNested).toBe(false)
  })

  it("applies critical/blocked filters", () => {
    const activities: ScheduleActivity[] = [
      makeActivity({
        activity_id: "A101",
        status: "blocked",
      }),
      makeActivity({
        activity_id: "A102",
        status: "planned",
      }),
    ]
    const slackMap = new Map<string, SlackResult>([
      [
        "A101",
        {
          activityId: "A101",
          es: new Date(),
          ef: new Date(),
          ls: new Date(),
          lf: new Date(),
          slackDays: 0,
          isCriticalPath: true,
        },
      ],
      [
        "A102",
        {
          activityId: "A102",
          es: new Date(),
          ef: new Date(),
          ls: new Date(),
          lf: new Date(),
          slackDays: 2,
          isCriticalPath: false,
        },
      ],
    ])

    const filtered = applyGanttFilters(
      activities,
      { criticalOnly: true, blockedOnly: false },
      slackMap
    )

    expect(filtered.find((a) => a.activity_id === "A101")).toBeTruthy()
    expect(filtered.find((a) => a.activity_id === "A102")).toBeFalsy()
  })

  it("creates dual what-if ghost bars and highlights affected activity", () => {
    const activities: ScheduleActivity[] = [
      makeActivity({
        activity_id: "A301",
        activity_name: "Loadout",
        tr_unit_id: "TR-1",
        anchor_type: "LOADOUT",
        planned_start: "2026-01-05",
        planned_finish: "2026-01-06",
      }),
    ]

    const result = buildGroupedVisData({
      activities,
      reflowPreview: {
        changes: [
          {
            activity_id: "A301",
            old_start: "2026-01-05",
            new_start: "2026-01-07",
            old_finish: "2026-01-06",
            new_finish: "2026-01-08",
            delta_days: 2,
          },
        ],
        metadata: {
          type: "what_if",
          affected_count: 1,
          conflict_count: 0,
          scenario: {
            reason: "Weather",
            delay_days: 2,
            confidence: 0.8,
          },
        },
      },
    })

    const plan = result.items.find((item) => item.id === "A301")
    expect(plan?.className).toContain("what-if-affected")
    expect(result.items.find((item) => item.id === "reflow_ghost_old_A301")).toBeTruthy()
    expect(result.items.find((item) => item.id === "reflow_ghost_new_A301")).toBeTruthy()
  })

  it("renders actual overlay and applies history gate/clamp", () => {
    const activities: ScheduleActivity[] = [
      makeActivity({
        activity_id: "A401",
        activity_name: "With Actual",
        tr_unit_id: "TR-1",
        anchor_type: "LOADOUT",
        planned_start: "2026-01-01",
        planned_finish: "2026-01-02",
        actual_start: "2026-01-03",
        actual_finish: "2026-01-10",
      }),
      makeActivity({
        activity_id: "A402",
        activity_name: "Future Actual",
        tr_unit_id: "TR-1",
        anchor_type: "TURNING",
        planned_start: "2026-01-03",
        planned_finish: "2026-01-04",
        actual_start: "2026-01-09",
      }),
    ]

    const result = buildGroupedVisData({
      activities,
      actualOverlay: {
        enabled: true,
        selectedDate: parseUTCDate("2026-01-05"),
        isHistoryMode: true,
      },
    })

    const actualA401 = result.items.find((item) => item.id === "actual__A401")
    expect(actualA401).toBeTruthy()
    expect(actualA401?.end).toEqual(parseUTCDate("2026-01-05"))
    expect(actualA401?.className).toContain("actual-bar")
    expect(result.items.find((item) => item.id === "actual__A402")).toBeFalsy()
  })
})
