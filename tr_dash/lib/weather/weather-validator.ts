import type { WeatherForecastPoint, WeatherLimits } from "@/lib/weather/weather-service"

export type WeatherGateStatus = "SAFE" | "NEAR_LIMIT" | "NO_GO" | "UNKNOWN"

export interface WeatherGateResult {
  status: WeatherGateStatus
  reasons: string[]
  hsRatio?: number
  windRatio?: number
  windGustRatio?: number
}

function formatValue(value: number, unit: string) {
  return `${value.toFixed(2)}${unit}`
}

export function evaluateWeatherPoint(
  point: WeatherForecastPoint,
  limits: WeatherLimits,
  nearLimitRatio = 0.85
): WeatherGateResult {
  const reasons: string[] = []
  const hsRatio =
    point.hsM != null ? point.hsM / limits.hsLimitM : undefined
  const windRatio =
    point.windKt != null ? point.windKt / limits.windLimitKt : undefined
  const windGustRatio =
    point.windGustKt != null && limits.windGustLimitKt
      ? point.windGustKt / limits.windGustLimitKt
      : undefined

  const ratios = [hsRatio, windRatio, windGustRatio].filter(
    (v): v is number => typeof v === "number"
  )
  if (ratios.length === 0) {
    return { status: "UNKNOWN", reasons: ["Missing weather data"] }
  }

  if (hsRatio && hsRatio > 1) {
    reasons.push(
      `Wave too high: Hs=${formatValue(point.hsM!, "m")} > ${formatValue(
        limits.hsLimitM,
        "m"
      )}`
    )
  }
  if (windRatio && windRatio > 1) {
    reasons.push(
      `Wind too high: ${formatValue(point.windKt!, "kt")} > ${formatValue(
        limits.windLimitKt,
        "kt"
      )}`
    )
  }
  if (windGustRatio && windGustRatio > 1 && limits.windGustLimitKt) {
    reasons.push(
      `Wind gust too high: ${formatValue(point.windGustKt!, "kt")} > ${formatValue(
        limits.windGustLimitKt,
        "kt"
      )}`
    )
  }

  if (reasons.length > 0) {
    return { status: "NO_GO", reasons, hsRatio, windRatio, windGustRatio }
  }

  const nearLimit = ratios.some((ratio) => ratio >= nearLimitRatio)
  if (nearLimit) {
    return {
      status: "NEAR_LIMIT",
      reasons: ["Close to limit — proceed with additional controls."],
      hsRatio,
      windRatio,
      windGustRatio,
    }
  }

  return { status: "SAFE", reasons: [], hsRatio, windRatio, windGustRatio }
}

