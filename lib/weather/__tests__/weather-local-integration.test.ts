import { describe, it, expect } from "vitest"
import { getWeatherForecastLive } from "@/lib/weather/weather-service"

describe("weather-local-integration", () => {
  it("loads weather data (local or fallback)", async () => {
    const forecast = await getWeatherForecastLive()

    expect(forecast).toBeDefined()
    expect(forecast.series.length).toBeGreaterThan(0)
    expect(forecast.location).toBe("Arabian Gulf")
  })

  it("returns valid WeatherForecastData format", async () => {
    const forecast = await getWeatherForecastLive()

    expect(forecast).toHaveProperty("updatedAt")
    expect(forecast).toHaveProperty("timezone")
    expect(forecast).toHaveProperty("location")
    expect(forecast).toHaveProperty("series")
    
    // Validate series structure
    const firstPoint = forecast.series[0]
    expect(firstPoint).toHaveProperty("ts")
    expect(firstPoint).toHaveProperty("hsM")
    expect(firstPoint).toHaveProperty("windKt")
    expect(firstPoint).toHaveProperty("windGustKt")
    
    // Validate timestamp format (ISO 8601)
    expect(firstPoint.ts).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it("handles missing local files gracefully", async () => {
    // This test will use static fallback if local files don't exist
    const forecast = await getWeatherForecastLive()

    // Should still return valid data (from static JSON)
    expect(forecast).toBeDefined()
    expect(forecast.series.length).toBeGreaterThan(0)
  })
})
