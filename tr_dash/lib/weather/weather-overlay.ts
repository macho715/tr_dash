import type { WeatherForecastData, WeatherLimits } from "@/lib/weather/weather-service"
import { evaluateWeatherPoint, type WeatherGateStatus } from "@/lib/weather/weather-validator"
import { dateToIsoUtc, diffUTCDays, parseUTCDate } from "@/lib/ssot/schedule"

export interface WeatherOverlayDrawConfig {
  canvas: HTMLCanvasElement
  viewStart: Date
  viewEnd: Date
  dayStatusMap: Map<string, WeatherGateStatus>
  height: number
  width: number
  opacity?: number
  pixelRatio?: number
}

const STATUS_PRIORITY: Record<WeatherGateStatus, number> = {
  NO_GO: 3,
  NEAR_LIMIT: 2,
  SAFE: 1,
  UNKNOWN: 0,
}

const STATUS_COLORS: Record<WeatherGateStatus, [number, number, number, number]> = {
  NO_GO: [239, 68, 68, 0.15],
  NEAR_LIMIT: [251, 191, 36, 0.1],
  SAFE: [0, 0, 0, 0],
  UNKNOWN: [0, 0, 0, 0],
}

export function buildWeatherDayStatusMap(
  forecast: WeatherForecastData,
  limits: WeatherLimits,
  nearLimitRatio = 0.85
): Map<string, WeatherGateStatus> {
  const map = new Map<string, WeatherGateStatus>()
  for (const point of forecast.series) {
    if (!point.ts) continue
    const date = new Date(point.ts)
    if (Number.isNaN(date.getTime())) continue
    const dayKey = dateToIsoUtc(date)
    const nextStatus = evaluateWeatherPoint(point, limits, nearLimitRatio).status
    const prev = map.get(dayKey)
    if (!prev || STATUS_PRIORITY[nextStatus] > STATUS_PRIORITY[prev]) {
      map.set(dayKey, nextStatus)
    }
  }
  return map
}

function rgba([r, g, b, a]: [number, number, number, number], opacity = 1): string {
  const alpha = Math.max(0, Math.min(1, a * opacity))
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function drawWeatherOverlay(config: WeatherOverlayDrawConfig): void {
  const {
    canvas,
    viewStart,
    viewEnd,
    dayStatusMap,
    width,
    height,
    opacity = 1,
    pixelRatio = 1,
  } = config
  const ctx = canvas.getContext("2d")
  if (!ctx) return
  if (width <= 0 || height <= 0) return

  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
  ctx.clearRect(0, 0, width, height)

  const start = parseUTCDate(dateToIsoUtc(viewStart))
  const end = parseUTCDate(dateToIsoUtc(viewEnd))
  const totalDays = Math.max(1, diffUTCDays(dateToIsoUtc(start), dateToIsoUtc(end)) + 1)
  const pixelsPerDay = width / totalDays

  const startIso = dateToIsoUtc(start)
  const endIso = dateToIsoUtc(end)

  for (const [dayKey, status] of dayStatusMap.entries()) {
    if (status === "SAFE" || status === "UNKNOWN") continue
    if (dayKey < startIso || dayKey > endIso) continue
    const offset = diffUTCDays(startIso, dayKey)
    if (offset < 0 || offset >= totalDays) continue
    ctx.fillStyle = rgba(STATUS_COLORS[status], opacity)
    ctx.fillRect(offset * pixelsPerDay, 0, pixelsPerDay, height)
  }
}
