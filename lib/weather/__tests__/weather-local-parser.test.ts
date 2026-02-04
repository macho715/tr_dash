import { describe, it, expect, vi, beforeEach } from "vitest"
import { parseLocalWeatherFile, getAvailableWeatherDates } from "@/lib/weather/weather-local-parser"
import fs from "fs"

// Mock fs module
vi.mock("fs")

describe("weather-local-parser", () => {
  const mockPythonData = {
    source: "Manual Weather Data Entry",
    generated_at: "2026-02-04T00:00:00Z",
    location: { lat: 24.12, lon: 52.53 },
    weather_records: [
      {
        date: "2026-02-04",
        wind_max_kn: 18,
        gust_max_kn: 24,
        wind_dir_deg: 285,
        wave_max_m: 2.5,
        visibility_km: 8.0,
        source: "MANUAL",
        risk_level: "LOW",
      },
      {
        date: "2026-02-05",
        wind_max_kn: 22,
        gust_max_kn: 28,
        wave_max_m: 3.2,
        visibility_km: 6.0,
        source: "FORECAST",
        risk_level: "MEDIUM",
      },
    ],
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("parses Python weather JSON correctly", () => {
    // Mock file system
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readdirSync).mockReturnValue(["20260204"] as any)
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockPythonData))

    const result = parseLocalWeatherFile("20260204")

    expect(result).not.toBeNull()
    expect(result!.series).toHaveLength(2)
    expect(result!.series[0].hsM).toBe(2.5)
    expect(result!.series[0].windKt).toBe(18)
    expect(result!.series[0].windGustKt).toBe(24)
    expect(result!.series[1].hsM).toBe(3.2)
  })

  it("returns null when file not found", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false)

    const result = parseLocalWeatherFile("20260204")

    expect(result).toBeNull()
  })

  it("finds latest weather folder", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readdirSync).mockReturnValue([
      "20260202",
      "20260204",
      "20260203",
    ] as any)

    const dates = getAvailableWeatherDates()

    expect(dates).toEqual(["20260204", "20260203", "20260202"]) // 최신순
  })

  it("handles missing wave data gracefully", () => {
    const dataWithoutWaves = {
      ...mockPythonData,
      weather_records: [
        {
          date: "2026-02-04",
          wind_max_kn: 18,
          gust_max_kn: 24,
          // wave_max_m 없음
        },
      ],
    }

    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readdirSync).mockReturnValue(["20260204"] as any)
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(dataWithoutWaves))

    const result = parseLocalWeatherFile("20260204")

    expect(result!.series[0].hsM).toBeNull()
    expect(result!.series[0].windKt).toBe(18)
  })

  it("returns null when weather_records is empty", () => {
    const emptyData = {
      ...mockPythonData,
      weather_records: [],
    }

    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readdirSync).mockReturnValue(["20260204"] as any)
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(emptyData))

    const result = parseLocalWeatherFile("20260204")

    expect(result).not.toBeNull()
    expect(result!.series).toHaveLength(0)
  })

  it("handles malformed JSON gracefully", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readdirSync).mockReturnValue(["20260204"] as any)
    vi.mocked(fs.readFileSync).mockReturnValue("{ invalid json }")

    const result = parseLocalWeatherFile("20260204")

    expect(result).toBeNull()
  })
})
