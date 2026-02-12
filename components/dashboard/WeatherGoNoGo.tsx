"use client"

import { useMemo } from "react"
import type { WeatherForecastData, WeatherLimits } from "@/lib/weather/weather-service"

type Props = {
  forecast: WeatherForecastData
  limits: WeatherLimits
}

type GoNoGoStatus = "GO" | "NO-GO" | "CAUTION"

type WindowInfo = {
  status: GoNoGoStatus
  reason: string
  hsM: number | null
  windKt: number | null
  windGustKt: number | null
  ts: string
}

type NextWindow = {
  status: GoNoGoStatus
  startTs: string
  hoursAway: number
}

function classifyPoint(
  hsM: number | null,
  windKt: number | null,
  windGustKt: number | null,
  limits: WeatherLimits
): { status: GoNoGoStatus; reason: string } {
  const reasons: string[] = []

  if (hsM !== null && hsM >= limits.hsLimitM) {
    reasons.push(`Hs ${hsM.toFixed(1)}m >= ${limits.hsLimitM}m`)
  }
  if (windKt !== null && windKt >= limits.windLimitKt) {
    reasons.push(`Wind ${windKt.toFixed(0)}kt >= ${limits.windLimitKt}kt`)
  }
  if (
    windGustKt !== null &&
    limits.windGustLimitKt &&
    windGustKt >= limits.windGustLimitKt
  ) {
    reasons.push(`Gust ${windGustKt.toFixed(0)}kt >= ${limits.windGustLimitKt}kt`)
  }

  if (reasons.length > 0) return { status: "NO-GO", reason: reasons.join(", ") }

  // Caution zone (within 80% of limit)
  const cautionReasons: string[] = []
  if (hsM !== null && hsM >= limits.hsLimitM * 0.8) {
    cautionReasons.push(`Hs ${hsM.toFixed(1)}m approaching limit`)
  }
  if (windKt !== null && windKt >= limits.windLimitKt * 0.8) {
    cautionReasons.push(`Wind ${windKt.toFixed(0)}kt approaching limit`)
  }

  if (cautionReasons.length > 0) return { status: "CAUTION", reason: cautionReasons.join(", ") }

  return { status: "GO", reason: "All conditions within limits" }
}

const STATUS_STYLES: Record<GoNoGoStatus, { bg: string; text: string; glow: string; label: string }> = {
  GO: {
    bg: "bg-emerald-500/20",
    text: "text-emerald-400",
    glow: "shadow-[0_0_12px_rgba(34,197,94,0.4)]",
    label: "GO",
  },
  "NO-GO": {
    bg: "bg-red-500/20",
    text: "text-red-400",
    glow: "shadow-[0_0_12px_rgba(239,68,68,0.4)]",
    label: "NO-GO",
  },
  CAUTION: {
    bg: "bg-amber-500/20",
    text: "text-amber-400",
    glow: "shadow-[0_0_12px_rgba(251,191,36,0.4)]",
    label: "CAUTION",
  },
}

function formatHoursAway(hours: number): string {
  if (hours < 1) return "< 1h"
  if (hours < 24) return `${Math.round(hours)}h`
  const days = Math.floor(hours / 24)
  const rem = Math.round(hours % 24)
  return rem > 0 ? `${days}d ${rem}h` : `${days}d`
}

export function WeatherGoNoGo({ forecast, limits }: Props) {
  const analysis = useMemo(() => {
    if (!forecast.series || forecast.series.length === 0) {
      return {
        current: null as WindowInfo | null,
        next48h: [] as WindowInfo[],
        sparkline: [] as number[],
        nextGoWindow: null as NextWindow | null,
        nextNoGoWindow: null as NextWindow | null,
        maxWind48h: 0,
        maxHs48h: 0,
      }
    }

    const now = new Date()
    const h48 = new Date(now.getTime() + 48 * 60 * 60 * 1000)

    // Find current and next 48h points
    const sorted = [...forecast.series].sort(
      (a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime()
    )

    // Find closest point to now
    let closestIdx = 0
    let closestDist = Infinity
    for (let i = 0; i < sorted.length; i++) {
      const dist = Math.abs(new Date(sorted[i].ts).getTime() - now.getTime())
      if (dist < closestDist) {
        closestDist = dist
        closestIdx = i
      }
    }

    const currentPoint = sorted[closestIdx]
    const currentClassification = classifyPoint(
      currentPoint.hsM,
      currentPoint.windKt,
      currentPoint.windGustKt,
      limits
    )

    const current: WindowInfo = {
      ...currentClassification,
      hsM: currentPoint.hsM,
      windKt: currentPoint.windKt,
      windGustKt: currentPoint.windGustKt,
      ts: currentPoint.ts,
    }

    // Next 48h analysis
    const next48h: WindowInfo[] = []
    const sparkline: number[] = []
    let maxWind48h = 0
    let maxHs48h = 0
    for (const pt of sorted) {
      const ptTime = new Date(pt.ts).getTime()
      if (ptTime >= now.getTime() && ptTime <= h48.getTime()) {
        const cls = classifyPoint(pt.hsM, pt.windKt, pt.windGustKt, limits)
        next48h.push({ ...cls, hsM: pt.hsM, windKt: pt.windKt, windGustKt: pt.windGustKt, ts: pt.ts })
        sparkline.push(pt.hsM ?? 0)
        if (pt.windKt !== null && pt.windKt > maxWind48h) maxWind48h = pt.windKt
        if (pt.hsM !== null && pt.hsM > maxHs48h) maxHs48h = pt.hsM
      }
    }

    // Find next GO and NO-GO windows
    let nextGoWindow: NextWindow | null = null
    let nextNoGoWindow: NextWindow | null = null
    for (const pt of sorted) {
      const ptTime = new Date(pt.ts).getTime()
      if (ptTime <= now.getTime()) continue
      const cls = classifyPoint(pt.hsM, pt.windKt, pt.windGustKt, limits)
      const hoursAway = (ptTime - now.getTime()) / (1000 * 60 * 60)

      if (!nextGoWindow && cls.status === "GO" && current.status !== "GO") {
        nextGoWindow = { status: "GO", startTs: pt.ts, hoursAway }
      }
      if (!nextNoGoWindow && cls.status === "NO-GO" && current.status !== "NO-GO") {
        nextNoGoWindow = { status: "NO-GO", startTs: pt.ts, hoursAway }
      }
      if (nextGoWindow && nextNoGoWindow) break
    }

    return { current, next48h, sparkline, nextGoWindow, nextNoGoWindow, maxWind48h, maxHs48h }
  }, [forecast, limits])

  if (!analysis.current) {
    return (
      <div className="rounded-xl border border-accent/20 bg-card/80 p-4">
        <h3 className="text-sm font-semibold text-foreground mb-2">Weather Status</h3>
        <p className="text-xs text-slate-500">No forecast data available</p>
      </div>
    )
  }

  const currentStyle = STATUS_STYLES[analysis.current.status]
  const goCount = analysis.next48h.filter((p) => p.status === "GO").length
  const noGoCount = analysis.next48h.filter((p) => p.status === "NO-GO").length
  const totalPoints = analysis.next48h.length

  return (
    <div className="rounded-xl border border-accent/20 bg-card/80 p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3">Weather Go/No-Go</h3>

      {/* Current Status Light */}
      <div className={`rounded-lg ${currentStyle.bg} ${currentStyle.glow} p-3 mb-3`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`h-10 w-10 rounded-full ${currentStyle.bg} border-2 border-current ${currentStyle.text} flex items-center justify-center animate-pulse`}
            >
              <span className="text-xs font-black">{currentStyle.label}</span>
            </div>
            <div>
              <div className={`text-sm font-bold ${currentStyle.text}`}>
                {currentStyle.label}
              </div>
              <div className="text-[10px] text-slate-400">{analysis.current.reason}</div>
            </div>
          </div>
          <div className="text-right text-[10px] text-slate-500">
            <div>Hs: {analysis.current.hsM?.toFixed(1) ?? "—"}m</div>
            <div>Wind: {analysis.current.windKt?.toFixed(0) ?? "—"}kt</div>
          </div>
        </div>
      </div>

      {/* Countdown timers */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {analysis.nextGoWindow && (
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2">
            <div className="text-[9px] text-emerald-500 uppercase font-semibold">Next GO</div>
            <div className="text-sm font-bold text-emerald-400 font-mono">
              {formatHoursAway(analysis.nextGoWindow.hoursAway)}
            </div>
          </div>
        )}
        {analysis.nextNoGoWindow && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
            <div className="text-[9px] text-red-500 uppercase font-semibold">Next NO-GO</div>
            <div className="text-sm font-bold text-red-400 font-mono">
              {formatHoursAway(analysis.nextNoGoWindow.hoursAway)}
            </div>
          </div>
        )}
        {!analysis.nextGoWindow && analysis.current.status === "GO" && (
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2">
            <div className="text-[9px] text-emerald-500 uppercase font-semibold">Status</div>
            <div className="text-xs font-bold text-emerald-400">Currently GO</div>
          </div>
        )}
        {!analysis.nextNoGoWindow && analysis.current.status === "NO-GO" && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
            <div className="text-[9px] text-red-500 uppercase font-semibold">Status</div>
            <div className="text-xs font-bold text-red-400">Currently NO-GO</div>
          </div>
        )}
      </div>

      {/* Wave height sparkline */}
      {analysis.sparkline.length > 2 && (
        <div className="mb-3">
          <div className="text-[9px] text-slate-500 mb-1">48h Wave Height (Hs)</div>
          <div className="flex items-end gap-px h-8">
            {analysis.sparkline.map((v, i) => {
              const maxVal = Math.max(...analysis.sparkline, limits.hsLimitM)
              const height = maxVal > 0 ? (v / maxVal) * 100 : 0
              const isOverLimit = v >= limits.hsLimitM
              const isCaution = v >= limits.hsLimitM * 0.8 && !isOverLimit
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-t-sm transition-all ${
                    isOverLimit
                      ? "bg-red-500/70"
                      : isCaution
                        ? "bg-amber-500/60"
                        : "bg-cyan-500/50"
                  }`}
                  style={{ height: `${Math.max(4, height)}%` }}
                  title={`${v.toFixed(1)}m`}
                />
              )
            })}
          </div>
          <div className="flex justify-between text-[8px] text-slate-600 mt-0.5">
            <span>Now</span>
            <span className="text-red-400">Limit: {limits.hsLimitM}m</span>
            <span>+48h</span>
          </div>
        </div>
      )}

      {/* 48h Summary */}
      <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-accent/10 pt-2">
        <span>
          48h: <span className="text-emerald-400">{goCount} GO</span> /{" "}
          <span className="text-red-400">{noGoCount} NO-GO</span> / {totalPoints} pts
        </span>
        <span>
          Max: {analysis.maxHs48h.toFixed(1)}m / {analysis.maxWind48h.toFixed(0)}kt
        </span>
      </div>
    </div>
  )
}
