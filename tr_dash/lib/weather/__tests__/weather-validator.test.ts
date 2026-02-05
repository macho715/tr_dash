import { describe, it, expect } from "vitest"
import { evaluateWeatherPoint } from "@/lib/weather/weather-validator"
import type { WeatherForecastPoint, WeatherLimits } from "@/lib/weather/weather-service"

const limits: WeatherLimits = {
  hsLimitM: 3.0,
  windLimitKt: 20,
  windGustLimitKt: 25,
}

describe("weather-validator", () => {
  it("flags NO_GO when any metric exceeds limit", () => {
    const point: WeatherForecastPoint = {
      ts: "2026-02-04T12:00:00Z",
      hsM: 3.5,
      windKt: 18,
      windGustKt: 22,
    }
    const result = evaluateWeatherPoint(point, limits)
    expect(result.status).toBe("NO_GO")
    expect(result.reasons[0]).toContain("Wave too high")
  })

  it("flags NEAR_LIMIT when close to limit", () => {
    const point: WeatherForecastPoint = {
      ts: "2026-02-04T06:00:00Z",
      hsM: 2.7,
      windKt: 16,
      windGustKt: 22,
    }
    const result = evaluateWeatherPoint(point, limits, 0.85)
    expect(result.status).toBe("NEAR_LIMIT")
  })

  it("returns UNKNOWN when data is missing", () => {
    const point: WeatherForecastPoint = {
      ts: "2026-02-04T00:00:00Z",
      hsM: null,
      windKt: null,
      windGustKt: null,
    }
    const result = evaluateWeatherPoint(point, limits)
    expect(result.status).toBe("UNKNOWN")
  })
})
