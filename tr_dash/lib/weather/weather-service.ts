/**
 * Weather forecast + limits loader
 *
 * data/schedule/weather_forecast.json -> normalized forecast series
 * data/schedule/weather_limits.json -> normalized thresholds
 */

import weatherForecastRaw from "../../data/schedule/weather_forecast.json"
import weatherLimitsRaw from "../../data/schedule/weather_limits.json"

export interface WeatherForecastPoint {
  ts: string
  hsM: number | null
  windKt: number | null
  windGustKt: number | null
}

export interface WeatherForecastData {
  updatedAt: string
  timezone?: string
  location?: string
  series: WeatherForecastPoint[]
}

export interface WeatherLimits {
  hsLimitM: number
  windLimitKt: number
  windGustLimitKt?: number
  source?: string
}

export interface WeatherForecastRaw {
  updatedAt?: string
  timezone?: string
  location?: string
  series?: Array<Record<string, unknown>>
}

export interface WeatherLimitsRaw {
  hs_limit_m?: number | string
  wind_limit_kt?: number | string
  wind_gust_limit_kt?: number | string
  source?: string
}

const DEFAULT_LIMITS: WeatherLimits = {
  hsLimitM: 3.0,
  windLimitKt: 20,
  windGustLimitKt: 25,
}

function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null
  const num = typeof value === "string" ? Number(value) : (value as number)
  return Number.isFinite(num) ? num : null
}

function normalizeForecastPoint(raw: Record<string, unknown>): WeatherForecastPoint {
  const ts = String(raw.ts ?? raw.timestamp ?? "")
  const hsM = parseNumber(raw.hs_m ?? raw.hsM)
  const windKt = parseNumber(raw.wind_kt ?? raw.windKt)
  const windGustKt = parseNumber(raw.wind_gust_kt ?? raw.windGustKt)
  return { ts, hsM, windKt, windGustKt }
}

export function normalizeWeatherForecast(raw: WeatherForecastRaw): WeatherForecastData {
  const seriesRaw = raw.series ?? []
  const series = seriesRaw.map(normalizeForecastPoint)
  return {
    updatedAt: raw.updatedAt ?? "",
    timezone: raw.timezone,
    location: raw.location,
    series,
  }
}

export function normalizeWeatherLimits(raw: WeatherLimitsRaw): WeatherLimits {
  const hsLimitM = parseNumber(raw.hs_limit_m) ?? DEFAULT_LIMITS.hsLimitM
  const windLimitKt = parseNumber(raw.wind_limit_kt) ?? DEFAULT_LIMITS.windLimitKt
  const windGustLimitKt =
    parseNumber(raw.wind_gust_limit_kt) ?? DEFAULT_LIMITS.windGustLimitKt
  return {
    hsLimitM,
    windLimitKt,
    windGustLimitKt: windGustLimitKt ?? undefined,
    source: raw.source,
  }
}

// Static exports (backward compatible, used as fallback)
export const weatherForecast = normalizeWeatherForecast(
  weatherForecastRaw as WeatherForecastRaw
)

export const weatherLimits = normalizeWeatherLimits(
  weatherLimitsRaw as WeatherLimitsRaw
)

/**
 * Get weather forecast with local file priority and static fallback
 * 
 * Usage:
 * - Server-side: Use getWeatherForecastLive() for dynamic data
 * - Client-side: Use static weatherForecast export (build-time)
 */
export async function getWeatherForecastLive(): Promise<WeatherForecastData> {
  // Server-side only: dynamic import to avoid bundling fs module
  if (typeof window === 'undefined') {
    try {
      const { parseLocalWeatherFile } = await import("./weather-local-parser")
      const localData = parseLocalWeatherFile()
      
      if (localData && localData.series.length > 0) {
        console.log(
          `[weather-service] Loaded from local: ${localData.series.length} points (${localData.updatedAt})`
        )
        return localData
      }
    } catch (error) {
      console.warn("[weather-service] Local parse failed:", error)
    }
  }
  
  // Fallback to static JSON (works on both server and client)
  console.log("[weather-service] Using static JSON fallback")
  return weatherForecast
}

