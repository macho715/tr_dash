import { describe, it, expect } from "vitest"
import type { ScheduleActivity } from "@/lib/ssot/schedule"
import { applyGanttFilters, buildGroupedVisData } from "@/lib/gantt/grouping"
import type { SlackResult } from "@/lib/utils/slack-calc"

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
    expect(result.activityIdToGroupId.get("A101")).toMatch(/^res_/)
    expect(result.items.length).toBe(3)
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
})
