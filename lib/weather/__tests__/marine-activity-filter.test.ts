import { describe, it, expect } from "vitest"
import { isMarineActivity } from "@/lib/weather/marine-activity-filter"
import type { ScheduleActivity } from "@/lib/ssot/schedule"

const base: ScheduleActivity = {
  activity_id: "A1",
  activity_name: "Test",
  level1: "LEVEL1",
  level2: "LEVEL2",
  duration: 1,
  planned_start: "2026-02-04",
  planned_finish: "2026-02-04",
}

describe("marine-activity-filter", () => {
  it("detects marine by resource tag", () => {
    const activity = { ...base, resource_tags: ["marine"] }
    expect(isMarineActivity(activity)).toBe(true)
  })

  it("detects marine by anchor type", () => {
    const activity = { ...base, anchor_type: "SAIL_AWAY" }
    expect(isMarineActivity(activity)).toBe(true)
  })

  it("detects marine by keyword", () => {
    const activity = { ...base, level1: "Marine Ops" }
    expect(isMarineActivity(activity)).toBe(true)
  })

  it("returns false for non-marine activity", () => {
    const activity = { ...base, level1: "Civil Works", level2: "Onshore" }
    expect(isMarineActivity(activity)).toBe(false)
  })
})
