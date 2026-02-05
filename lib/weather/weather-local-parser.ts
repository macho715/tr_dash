/**
 * Local weather parser for Python output (server-only).
 *
 * Reads: files/out/weather_parsed/YYYYMMDD/weather_for_weather_py.json
 * Converts to WeatherForecastData (ts, hsM, windKt, windGustKt)
 */

import fs from "fs"
import path from "path"
import type { WeatherForecastData } from "@/lib/weather/weather-service"

const FILES_DIR = path.join(process.cwd(), "files")
const WEATHER_PARSED_BASE = path.join(FILES_DIR, "out", "weather_parsed")

interface PythonWeatherRecord {
  date: string
  wind_max_kn?: number
  gust_max_kn?: number
  wind_dir_deg?: number
  wave_max_m?: number
  wave_period_s?: number
  visibility_km?: number
  source?: string
  risk_level?: string
  is_shamal?: boolean
  notes?: string
}

interface PythonWeatherOutput {
  source?: string
  generated_at?: string
  location?: { lat: number; lon: number }
  weather_records?: PythonWeatherRecord[]
}

function isDateFolder(name: string): boolean {
  return /^\d{8}$/.test(name)
}

function findLatestWeatherFolder(): string | null {
  if (!fs.existsSync(WEATHER_PARSED_BASE)) return null
  const folders = fs
    .readdirSync(WEATHER_PARSED_BASE)
    .filter(isDateFolder)
    .sort()
    .reverse()
  return folders[0] ?? null
}

export function parseLocalWeatherFile(dateFolder?: string): WeatherForecastData | null {
  const targetFolder = dateFolder || findLatestWeatherFolder()
  if (!targetFolder) {
    console.warn("[weather-local-parser] No weather_parsed folders found")
    return null
  }

  const jsonPath = path.join(
    WEATHER_PARSED_BASE,
    targetFolder,
    "weather_for_weather_py.json"
  )
  if (!fs.existsSync(jsonPath)) {
    console.warn(`[weather-local-parser] File not found: ${jsonPath}`)
    return null
  }

  try {
    const fileContent = fs.readFileSync(jsonPath, "utf-8")
    const pythonData = JSON.parse(fileContent) as PythonWeatherOutput
    const records = pythonData.weather_records ?? []
    const series = records.map((record) => ({
      ts: new Date(`${record.date}T00:00:00Z`).toISOString(),
      hsM: record.wave_max_m ?? null,
      windKt: record.wind_max_kn ?? null,
      windGustKt: record.gust_max_kn ?? null,
    }))

    return {
      updatedAt: pythonData.generated_at ?? new Date().toISOString(),
      timezone: "UTC",
      location: "Arabian Gulf",
      series,
    }
  } catch (error) {
    console.error("[weather-local-parser] Parse error:", error)
    return null
  }
}

export function getAvailableWeatherDates(): string[] {
  if (!fs.existsSync(WEATHER_PARSED_BASE)) return []
  return fs
    .readdirSync(WEATHER_PARSED_BASE)
    .filter(isDateFolder)
    .sort()
    .reverse()
}

export function parseWeatherDateRange(
  startDate: string,
  endDate: string
): WeatherForecastData | null {
  const availableDates = getAvailableWeatherDates()
  const targetDates = availableDates.filter(
    (date) => date >= startDate && date <= endDate
  )

  if (targetDates.length === 0) return null

  const allRecords: Array<{
    ts: string
    hsM: number | null
    windKt: number | null
    windGustKt: number | null
  }> = []

  for (const dateFolder of targetDates) {
    const data = parseLocalWeatherFile(dateFolder)
    if (data) allRecords.push(...data.series)
  }

  if (allRecords.length === 0) return null

  const uniqueRecords = Array.from(
    new Map(allRecords.map((record) => [record.ts, record])).values()
  ).sort((a, b) => a.ts.localeCompare(b.ts))

  return {
    updatedAt: new Date().toISOString(),
    timezone: "UTC",
    location: "Arabian Gulf",
    series: uniqueRecords,
  }
}

