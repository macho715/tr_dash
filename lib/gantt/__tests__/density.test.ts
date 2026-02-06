import { describe, it, expect } from "vitest"
import { buildDensityBuckets } from "@/lib/gantt/density"
import type { ScheduleActivity } from "@/lib/ssot/schedule"

function makeActivity(partial: Partial<ScheduleActivity>): ScheduleActivity {
  return {
    activity_id: "A100",
    activity_name: "Test",
    level1: "L1",
    level2: "L2",
    duration: 1,
    planned_start: "2026-01-01",
    planned_finish: "2026-01-01",
    ...partial,
  }
}

describe("buildDensityBuckets", () => {
  it("counts overlapping activities per day", () => {
    const activities: ScheduleActivity[] = [
      makeActivity({
        activity_id: "A101",
        planned_start: "2026-01-01",
        planned_finish: "2026-01-03",
      }),
      makeActivity({
        activity_id: "A102",
        planned_start: "2026-01-02",
        planned_finish: "2026-01-02",
      }),
    ]
    const start = new Date(Date.UTC(2026, 0, 1))
    const end = new Date(Date.UTC(2026, 0, 3))
    const result = buildDensityBuckets(activities, start, end)

    expect(result.buckets).toHaveLength(3)
    expect(result.buckets[0].count).toBe(1)
    expect(result.buckets[1].count).toBe(2)
    expect(result.buckets[2].count).toBe(1)
  })
})
