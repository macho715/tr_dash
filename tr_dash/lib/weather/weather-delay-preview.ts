import type { DateChange, ScheduleActivity } from "@/lib/ssot/schedule"
import { addUTCDays, dateToIsoUtc, diffUTCDays, parseUTCDate } from "@/lib/ssot/schedule"
import type { WeatherForecastData, WeatherLimits } from "@/lib/weather/weather-service"
import { evaluateWeatherPoint } from "@/lib/weather/weather-validator"
import { isMarineActivity } from "@/lib/weather/marine-activity-filter"

export interface WeatherDelayChange extends DateChange {
  reason?: string
}

export interface WeatherDelayPreviewOptions {
  nearLimitRatio?: number
}

function isoDateFromTimestamp(ts: string): string | null {
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return null
  return dateToIsoUtc(d)
}

function buildNoGoDayMap(
  forecast: WeatherForecastData,
  limits: WeatherLimits,
  nearLimitRatio: number
): Map<string, string> {
  const map = new Map<string, string>()
  for (const point of forecast.series) {
    if (!point.ts) continue
    const dateKey = isoDateFromTimestamp(point.ts)
    if (!dateKey) continue
    const result = evaluateWeatherPoint(point, limits, nearLimitRatio)
    if (result.status !== "NO_GO") continue
    if (!map.has(dateKey)) {
      map.set(dateKey, result.reasons.join("; "))
    }
  }
  return map
}

function findLastNoGoDate(
  start: Date,
  end: Date,
  noGoDays: Set<string>
): string | null {
  const totalDays = Math.max(0, diffUTCDays(dateToIsoUtc(start), dateToIsoUtc(end)))
  let lastNoGo: string | null = null
  for (let i = 0; i <= totalDays; i += 1) {
    const day = dateToIsoUtc(addUTCDays(start, i))
    if (noGoDays.has(day)) lastNoGo = day
  }
  return lastNoGo
}

function nextSafeDay(afterDate: Date, noGoDays: Set<string>): Date {
  let cursor = addUTCDays(afterDate, 1)
  while (noGoDays.has(dateToIsoUtc(cursor))) {
    cursor = addUTCDays(cursor, 1)
  }
  return cursor
}

export function buildWeatherDelayPreview(
  activities: ScheduleActivity[],
  forecast: WeatherForecastData,
  limits: WeatherLimits,
  options?: WeatherDelayPreviewOptions
): WeatherDelayChange[] {
  const nearLimitRatio = options?.nearLimitRatio ?? 0.85
  const noGoReasonMap = buildNoGoDayMap(forecast, limits, nearLimitRatio)
  if (noGoReasonMap.size === 0) return []
  const noGoDays = new Set(noGoReasonMap.keys())

  const changes: WeatherDelayChange[] = []
  for (const activity of activities) {
    if (!activity.activity_id) continue
    if (!isMarineActivity(activity)) continue
    if (activity.actual_start || activity.actual_finish) continue
    if (activity.is_locked) continue

    const startDate = parseUTCDate(activity.planned_start)
    const rawEndDate = parseUTCDate(activity.planned_finish)
    const endDate =
      rawEndDate.getTime() < startDate.getTime() ? startDate : rawEndDate

    const lastNoGoDate = findLastNoGoDate(startDate, endDate, noGoDays)
    if (!lastNoGoDate) continue

    const safeStart = nextSafeDay(parseUTCDate(lastNoGoDate), noGoDays)
    const newStart = dateToIsoUtc(safeStart)
    const deltaDays = diffUTCDays(activity.planned_start, newStart)
    if (deltaDays <= 0) continue

    const newFinish = dateToIsoUtc(addUTCDays(endDate, deltaDays))
    const reason = noGoReasonMap.get(lastNoGoDate)

    changes.push({
      activity_id: activity.activity_id,
      old_start: activity.planned_start,
      new_start: newStart,
      old_finish: dateToIsoUtc(endDate),
      new_finish: newFinish,
      delta_days: deltaDays,
      reason,
    })
  }

  return changes
}

