import { describe, it, expect } from "vitest"
import type { ScheduleActivity } from "@/lib/ssot/schedule"
import {
  calculateMilestoneStatus,
  calculateMilestonesForVoyage,
  findMilestoneActivity,
  MILESTONE_LABELS,
} from "@/lib/utils/milestone-calculator"

function makeActivity(partial: Partial<ScheduleActivity>): ScheduleActivity {
  return {
    activity_id: "A1000",
    activity_name: "",
    level1: "Voyage 1: TR Unit 1",
    level2: "Phase",
    duration: 1,
    planned_start: "2026-02-01",
    planned_finish: "2026-02-02",
    ...partial,
  }
}

describe("calculateMilestoneStatus", () => {
  it("returns pending when activity is undefined", () => {
    const status = calculateMilestoneStatus(undefined, new Date("2026-02-01"), "live")
    expect(status).toBe("pending")
  })

  it("returns done when actual_finish exists (live)", () => {
    const activity = makeActivity({ actual_finish: "2026-02-01" })
    const status = calculateMilestoneStatus(activity, new Date("2026-02-01"), "live")
    expect(status).toBe("done")
  })

  it("returns in-progress when actual_start exists but no actual_finish (live)", () => {
    const activity = makeActivity({ actual_start: "2026-02-01" })
    const status = calculateMilestoneStatus(activity, new Date("2026-02-01"), "live")
    expect(status).toBe("in-progress")
  })

  it("returns done when selectedDate >= planned_finish", () => {
    const activity = makeActivity({ planned_start: "2026-02-01", planned_finish: "2026-02-02" })
    const status = calculateMilestoneStatus(activity, new Date("2026-02-03"), "live")
    expect(status).toBe("done")
  })

  it("returns in-progress when selectedDate >= planned_start but < planned_finish", () => {
    const activity = makeActivity({ planned_start: "2026-02-01", planned_finish: "2026-02-05" })
    const status = calculateMilestoneStatus(activity, new Date("2026-02-03"), "live")
    expect(status).toBe("in-progress")
  })

  it("returns pending when planned dates are invalid", () => {
    const activity = makeActivity({ planned_start: "", planned_finish: "" })
    const status = calculateMilestoneStatus(activity, new Date("2026-02-03"), "live")
    expect(status).toBe("pending")
  })

  it("history mode ignores future actuals", () => {
    const activity = makeActivity({
      planned_start: "2026-02-10",
      planned_finish: "2026-02-11",
      actual_finish: "2026-02-20",
    })
    const status = calculateMilestoneStatus(activity, new Date("2026-02-05"), "history")
    expect(status).toBe("pending")
  })

  it("history mode respects actuals when <= selectedDate", () => {
    const activity = makeActivity({ actual_finish: "2026-02-01" })
    const status = calculateMilestoneStatus(activity, new Date("2026-02-02"), "history")
    expect(status).toBe("done")
  })
})

describe("findMilestoneActivity", () => {
  const activities: ScheduleActivity[] = [
    makeActivity({
      activity_id: "A1030",
      activity_name: "Loading of AGI TR Unit 1 on SPMT; lashing",
      tr_unit_id: "TR-1",
    }),
    makeActivity({
      activity_id: "A1081",
      activity_name: "MWS; MPI; Sail-away - Marine Transportation by LCT",
      tr_unit_id: "TR-1",
    }),
    makeActivity({
      activity_id: "A1110",
      activity_name: "Load-in of AGI TR Unit 1 (including RoRo Ramp Installation)",
      tr_unit_id: "TR-1",
    }),
    makeActivity({
      activity_id: "A1141",
      activity_name: "Turning of AGI TR Unit 1 (TR Bay 4)",
      tr_unit_id: "TR-1",
    }),
    makeActivity({
      activity_id: "A1150",
      activity_name: "Jacking down of AGI TR Unit 1 (TR Bay 4)",
      tr_unit_id: "TR-1",
    }),
    makeActivity({
      activity_id: "A2030",
      activity_name: "Loading of AGI TR Unit 2 on SPMT; lashing",
      tr_unit_id: "TR-2",
    }),
  ]

  it("matches each milestone by regex within the TR unit", () => {
    expect(findMilestoneActivity("Load-out", 1, activities)?.activity_id).toBe("A1030")
    expect(findMilestoneActivity("Sail-away", 1, activities)?.activity_id).toBe("A1081")
    expect(findMilestoneActivity("Load-in", 1, activities)?.activity_id).toBe("A1110")
    expect(findMilestoneActivity("Turning", 1, activities)?.activity_id).toBe("A1141")
    expect(findMilestoneActivity("Jack-down", 1, activities)?.activity_id).toBe("A1150")
  })

  it("filters by TR unit (voyage) correctly", () => {
    expect(findMilestoneActivity("Load-out", 2, activities)?.activity_id).toBe("A2030")
  })
})

describe("calculateMilestonesForVoyage", () => {
  it("returns 5 milestone entries", () => {
    const result = calculateMilestonesForVoyage(1, [], new Date("2026-02-01"), "live")
    expect(result.map((r) => r.label)).toEqual([...MILESTONE_LABELS])
    expect(result.every((r) => r.status === "pending")).toBe(true)
  })
})
