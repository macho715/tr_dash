import { describe, it, expect } from "vitest"
import { propagateWeatherDelays } from "@/lib/weather/weather-reflow-chain"
import type { ScheduleActivity } from "@/lib/ssot/schedule"
import type { WeatherDelayChange } from "@/lib/weather/weather-delay-preview"

const baseActivities: ScheduleActivity[] = [
  {
    activity_id: "A100",
    activity_name: "Marine tow",
    level1: "Marine",
    level2: "Tow",
    duration: 1,
    planned_start: "2026-02-05",
    planned_finish: "2026-02-05",
  },
  {
    activity_id: "A110",
    activity_name: "Follow-up",
    level1: "Transport",
    level2: "Onshore",
    duration: 1,
    planned_start: "2026-02-06",
    planned_finish: "2026-02-06",
  },
  {
    activity_id: "A120",
    activity_name: "Final",
    level1: "Transport",
    level2: "Onshore",
    duration: 1,
    planned_start: "2026-02-07",
    planned_finish: "2026-02-07",
  },
]

describe("weather-reflow-chain", () => {
  it("propagates weather delay through schedule shift", () => {
    const weatherChanges: WeatherDelayChange[] = [
      {
        activity_id: "A100",
        old_start: "2026-02-05",
        new_start: "2026-02-06",
        old_finish: "2026-02-05",
        new_finish: "2026-02-06",
        delta_days: 1,
      },
    ]

    const result = propagateWeatherDelays(baseActivities, weatherChanges)
    const propagatedIds = result.propagated_changes.map((c) => c.activity_id)
    expect(propagatedIds).toContain("A110")
    expect(propagatedIds).toContain("A120")
    expect(result.total_affected).toBe(3)
  })

  it("respects actualized activities (no shift)", () => {
    const activities: ScheduleActivity[] = [
      ...baseActivities.slice(0, 1),
      {
        ...baseActivities[1],
        actual_start: "2026-02-06",
        actual_finish: "2026-02-06",
      },
      baseActivities[2],
    ]
    const weatherChanges: WeatherDelayChange[] = [
      {
        activity_id: "A100",
        old_start: "2026-02-05",
        new_start: "2026-02-06",
        old_finish: "2026-02-05",
        new_finish: "2026-02-06",
        delta_days: 1,
      },
    ]

    const result = propagateWeatherDelays(activities, weatherChanges)
    const propagatedIds = result.propagated_changes.map((c) => c.activity_id)
    expect(propagatedIds).not.toContain("A110")
  })
})
