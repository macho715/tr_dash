import { describe, expect, it } from "vitest"
import {
  buildWeatherDayStatusMap,
  drawWeatherOverlay,
} from "@/lib/weather/weather-overlay"
import type { WeatherForecastData, WeatherLimits } from "@/lib/weather/weather-service"

describe("weather-overlay", () => {
  const limits: WeatherLimits = {
    hsLimitM: 3,
    windLimitKt: 20,
    windGustLimitKt: 25,
  }

  it("builds day status map with highest priority status", () => {
    const forecast: WeatherForecastData = {
      updatedAt: "2026-02-04T00:00:00Z",
      series: [
        { ts: "2026-02-05T00:00:00Z", hsM: 2.8, windKt: 10, windGustKt: 12 }, // NEAR_LIMIT
        { ts: "2026-02-05T12:00:00Z", hsM: 3.5, windKt: 10, windGustKt: 12 }, // NO_GO
      ],
    }

    const map = buildWeatherDayStatusMap(forecast, limits, 0.85)
    expect(map.get("2026-02-05")).toBe("NO_GO")
  })

  it("draws weather stripes for non-safe days", () => {
    const ctx = {
      setTransform: () => undefined,
      clearRect: () => undefined,
      fillRect: () => undefined,
      fillStyle: "",
    }
    let fillCalls = 0
    const canvas = {
      getContext: () => ({
        ...ctx,
        fillRect: () => {
          fillCalls += 1
        },
      }),
    } as unknown as HTMLCanvasElement

    const dayStatusMap = new Map([
      ["2026-02-05", "NO_GO"],
      ["2026-02-06", "SAFE"],
      ["2026-02-07", "NEAR_LIMIT"],
    ])

    drawWeatherOverlay({
      canvas,
      viewStart: new Date("2026-02-05T00:00:00Z"),
      viewEnd: new Date("2026-02-07T00:00:00Z"),
      dayStatusMap,
      width: 300,
      height: 100,
      opacity: 1,
      pixelRatio: 1,
    })

    expect(fillCalls).toBe(2)
  })
})
