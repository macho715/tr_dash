import { describe, it, expect } from "vitest"
import { buildWeatherDelayPreview } from "@/lib/weather/weather-delay-preview"
import type { WeatherForecastData, WeatherLimits } from "@/lib/weather/weather-service"
import type { ScheduleActivity } from "@/lib/ssot/schedule"

const forecast: WeatherForecastData = {
  updatedAt: "2026-02-04T00:00:00Z",
  series: [
    { ts: "2026-02-05T06:00:00Z", hsM: 3.5, windKt: 18, windGustKt: 21 },
    { ts: "2026-02-06T06:00:00Z", hsM: 2.5, windKt: 15, windGustKt: 18 },
  ],
}

const limits: WeatherLimits = {
  hsLimitM: 3.0,
  windLimitKt: 20,
  windGustLimitKt: 25,
}

describe("weather-delay-preview", () => {
  it("shifts marine activity to next safe day when NO_GO overlaps", () => {
    const activities: ScheduleActivity[] = [
      {
        activity_id: "A100",
        activity_name: "Marine tow",
        level1: "Marine",
        level2: "Tow",
        duration: 2,
        planned_start: "2026-02-05",
        planned_finish: "2026-02-06",
        anchor_type: "SAIL_AWAY",
      },
    ]

    const preview = buildWeatherDelayPreview(activities, forecast, limits)
    expect(preview).toHaveLength(1)
    expect(preview[0].new_start).toBe("2026-02-06")
    expect(preview[0].new_finish).toBe("2026-02-07")
  })

  it("skips non-marine activity", () => {
    const activities: ScheduleActivity[] = [
      {
        activity_id: "A200",
        activity_name: "Onshore work",
        level1: "Civil",
        level2: "Onshore",
        duration: 1,
        planned_start: "2026-02-05",
        planned_finish: "2026-02-05",
      },
    ]

    const preview = buildWeatherDelayPreview(activities, forecast, limits)
    expect(preview).toHaveLength(0)
  })
})
