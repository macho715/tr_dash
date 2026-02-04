import { describe, it, expect } from "vitest"
import {
  normalizeWeatherForecast,
  normalizeWeatherLimits,
} from "@/lib/weather/weather-service"

describe("weather-service", () => {
  it("normalizes forecast series with snake_case keys", () => {
    const raw = {
      updatedAt: "2026-02-04T00:00:00Z",
      series: [
        {
          ts: "2026-02-04T01:00:00Z",
          hs_m: "3.5",
          wind_kt: 18,
          wind_gust_kt: 25,
        },
      ],
    }
    const result = normalizeWeatherForecast(raw)
    expect(result.series).toHaveLength(1)
    expect(result.series[0].hsM).toBe(3.5)
    expect(result.series[0].windKt).toBe(18)
    expect(result.series[0].windGustKt).toBe(25)
  })

  it("applies default limits when values are missing", () => {
    const result = normalizeWeatherLimits({})
    expect(result.hsLimitM).toBe(3.0)
    expect(result.windLimitKt).toBe(20)
    expect(result.windGustLimitKt).toBe(25)
  })
})
