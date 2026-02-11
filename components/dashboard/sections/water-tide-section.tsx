"use client"

import { useEffect, useMemo, useState } from "react"

const LOCATION = "MINA ZAYED"
const WORK_WINDOW_START = 6
const WORK_WINDOW_END = 17
const VIRTUALIZATION_THRESHOLD = 90
const DAILY_ROW_HEIGHT = 38
const DAILY_VIEWPORT_HEIGHT = 420

interface TideHourValue {
  hour: number
  height: number
}

interface TideDaySummary {
  date: string
  hourly: TideHourValue[]
  high: number
  highTime: string
  low: number
  lowTime: string
}

interface TideDailyResponse {
  location: string
  days: TideDaySummary[]
}

interface WaterTidePanelProps {
  className?: string
}

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function formatDayLabel(date: string): string {
  const parsed = new Date(`${date}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime())) return date
  const weekday = parsed.toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: "UTC",
  })
  const day = parsed.toLocaleDateString("en-US", {
    day: "2-digit",
    timeZone: "UTC",
  })
  return `${weekday} ${day}`
}

function toHourNumber(timeLabel: string): number {
  const value = parseInt(timeLabel.slice(0, 2), 10)
  return Number.isNaN(value) ? 0 : value
}

function clampIndex(index: number, size: number): number {
  if (size === 0) return 0
  if (index < 0) return 0
  if (index >= size) return size - 1
  return index
}

function cn(...parts: Array<string | null | undefined | false>): string {
  return parts.filter(Boolean).join(" ")
}

function TideStatChip({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: "high" | "low"
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-mono font-semibold",
        tone === "high"
          ? "border-cyan-400/40 bg-cyan-500/10 text-cyan-200"
          : "border-amber-400/40 bg-amber-500/10 text-amber-200"
      )}
    >
      <span className="uppercase tracking-wider text-[10px] opacity-80">{label}</span>
      <span>{value}</span>
    </span>
  )
}

export function WaterTidePanel({ className }: WaterTidePanelProps) {
  const [data, setData] = useState<TideDailyResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const todayStr = useMemo(() => toDateString(new Date()), [])
  const [selectedDate, setSelectedDate] = useState(todayStr)
  const [showHourlyTable, setShowHourlyTable] = useState(false)
  const [hoveredHour, setHoveredHour] = useState<number | null>(null)
  const [dailyScrollTop, setDailyScrollTop] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetch("/api/tide-daily")
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 503 ? "Tide data unavailable" : "Failed to load")
        return r.json()
      })
      .then((body: TideDailyResponse) => {
        if (cancelled) return
        setData(body)
        if (body.days.length && !body.days.some((d) => d.date === selectedDate)) {
          setSelectedDate(body.days[0].date)
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load tide data")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const selectedDay = useMemo(() => {
    if (!data?.days) return null
    return data.days.find((d) => d.date === selectedDate) ?? null
  }, [data, selectedDate])

  const selectedIndex = useMemo(() => {
    if (!data?.days?.length) return -1
    return data.days.findIndex((d) => d.date === selectedDate)
  }, [data, selectedDate])

  const canMovePrev = selectedIndex > 0
  const canMoveNext = selectedIndex >= 0 && data ? selectedIndex < data.days.length - 1 : false

  const virtualizationEnabled = (data?.days.length ?? 0) >= VIRTUALIZATION_THRESHOLD
  const totalRows = data?.days.length ?? 0
  const visibleCount = Math.ceil(DAILY_VIEWPORT_HEIGHT / DAILY_ROW_HEIGHT) + 8
  const startIndex = virtualizationEnabled
    ? clampIndex(Math.floor(dailyScrollTop / DAILY_ROW_HEIGHT) - 4, totalRows)
    : 0
  const endIndex = virtualizationEnabled
    ? clampIndex(startIndex + visibleCount, totalRows)
    : totalRows
  const visibleDays = data?.days.slice(startIndex, endIndex + (virtualizationEnabled ? 1 : 0)) ?? []
  const topSpacer = virtualizationEnabled ? startIndex * DAILY_ROW_HEIGHT : 0
  const bottomSpacer = virtualizationEnabled
    ? Math.max(0, totalRows * DAILY_ROW_HEIGHT - topSpacer - visibleDays.length * DAILY_ROW_HEIGHT)
    : 0

  const changeSelectedByOffset = (offset: number) => {
    if (!data?.days?.length || selectedIndex < 0) return
    const next = clampIndex(selectedIndex + offset, data.days.length)
    setSelectedDate(data.days[next].date)
  }

  if (loading) {
    return (
      <div className={cn("rounded-xl border border-accent/20 bg-card/85 p-5 text-sm text-muted-foreground", className)}>
        Loading water tide data...
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className={cn("rounded-xl border border-destructive/40 bg-destructive/10 p-5 text-sm text-destructive", className)}>
        {error ?? "Tide data unavailable. Check data/raw/WATER TIDE.csv."}
      </div>
    )
  }

  return (
    <div className={cn("rounded-xl border border-accent/20 bg-card/90 p-4 shadow-glow", className)}>
      <div className="border-b border-accent/15 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">Water Tide</h3>
          <span className="text-xs font-mono text-muted-foreground">{data.location || LOCATION}</span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => changeSelectedByOffset(-1)}
            disabled={!canMovePrev}
            className="rounded-md border border-accent/20 px-2.5 py-1 text-xs font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Previous day"
          >
            Prev
          </button>
          <button
            type="button"
            onClick={() => setSelectedDate(todayStr)}
            className="rounded-md border border-accent/20 bg-accent/10 px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-accent/20"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => changeSelectedByOffset(1)}
            disabled={!canMoveNext}
            className="rounded-md border border-accent/20 px-2.5 py-1 text-xs font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Next day"
          >
            Next
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="ml-auto rounded-md border border-accent/20 bg-background/80 px-2.5 py-1 text-xs text-foreground"
            aria-label="Select tide date"
          />
        </div>

        {selectedDay ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <TideStatChip
              label="High"
              value={`${selectedDay.high.toFixed(2)}m ${selectedDay.highTime}`}
              tone="high"
            />
            <TideStatChip
              label="Low"
              value={`${selectedDay.low.toFixed(2)}m ${selectedDay.lowTime}`}
              tone="low"
            />
          </div>
        ) : null}
      </div>

      {selectedDay ? (
        <>
          <div className="mt-4 h-40 w-full rounded-lg border border-accent/10 bg-background/40 p-2">
            <TideChart
              hourly={selectedDay.hourly}
              highHour={toHourNumber(selectedDay.highTime)}
              lowHour={toHourNumber(selectedDay.lowTime)}
              hoveredHour={hoveredHour}
            />
          </div>

          <div className="mt-3 rounded-lg border border-accent/10 bg-background/30">
            <button
              type="button"
              className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-semibold text-foreground"
              onClick={() => setShowHourlyTable((v) => !v)}
              aria-expanded={showHourlyTable}
            >
              <span>Show hourly table</span>
              <span className="font-mono text-muted-foreground">{showHourlyTable ? "Hide" : "Show"}</span>
            </button>
            {showHourlyTable ? (
              <div className="max-h-56 overflow-y-auto border-t border-accent/10 px-3 pb-2">
                <table className="w-full border-collapse text-xs font-mono">
                  <thead>
                    <tr className="border-b border-accent/20 text-muted-foreground">
                      <th className="py-2 text-left font-medium">Hour</th>
                      <th className="py-2 text-right font-medium">Tide (m)</th>
                    </tr>
                  </thead>
                  <tbody className="text-foreground">
                    {selectedDay.hourly.map(({ hour, height }) => {
                      const isWorkWindow = hour >= WORK_WINDOW_START && hour <= WORK_WINDOW_END
                      return (
                        <tr
                          key={hour}
                          className={cn(
                            "border-b border-accent/10",
                            isWorkWindow && "bg-cyan-500/10 font-semibold"
                          )}
                          onMouseEnter={() => setHoveredHour(hour)}
                          onMouseLeave={() => setHoveredHour(null)}
                        >
                          <td className="py-1.5">{hour.toString().padStart(2, "0")}:00</td>
                          <td className="py-1.5 text-right tabular-nums">{height.toFixed(2)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        </>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">No tide data for selected date.</p>
      )}

      <div className="mt-4 rounded-lg border border-accent/10 bg-background/30 p-2">
        <div className="mb-2 flex items-center justify-between px-1">
          <h4 className="text-xs font-semibold text-foreground">Daily highs/lows</h4>
          <span className="text-[11px] text-muted-foreground">Hover row to inspect hour marker</span>
        </div>
        <div
          className="overflow-y-auto pr-1"
          style={{ maxHeight: `${DAILY_VIEWPORT_HEIGHT}px` }}
          onScroll={(e) => setDailyScrollTop(e.currentTarget.scrollTop)}
        >
          <div style={{ paddingTop: `${topSpacer}px`, paddingBottom: `${bottomSpacer}px` }}>
            <ul className="space-y-1">
              {visibleDays.map((day) => {
                const lowHour = toHourNumber(day.lowTime)
                return (
                  <li key={day.date} style={{ height: `${DAILY_ROW_HEIGHT}px` }}>
                    <button
                      type="button"
                      onClick={() => setSelectedDate(day.date)}
                      onMouseEnter={() => setHoveredHour(lowHour)}
                      onMouseLeave={() => setHoveredHour(null)}
                      className={cn(
                        "group relative flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-xs transition-colors",
                        selectedDate === day.date
                          ? "bg-cyan-500/20 text-foreground"
                          : "text-muted-foreground hover:bg-accent/15 hover:text-foreground"
                      )}
                    >
                      <span
                        className={cn(
                          "absolute left-0 top-1 bottom-1 w-[3px] rounded-r",
                          selectedDate === day.date ? "bg-cyan-300" : "bg-transparent group-hover:bg-cyan-500/50"
                        )}
                        aria-hidden
                      />
                      <span className="font-medium">{formatDayLabel(day.date)}</span>
                      <span className="font-mono tabular-nums">
                        L {day.low.toFixed(2)}@{day.lowTime} | H {day.high.toFixed(2)}@{day.highTime}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export function WaterTideSection() {
  return (
    <section id="water-tide" aria-label="Water Tide" className="py-6">
      <WaterTidePanel />
    </section>
  )
}

function TideChart({
  hourly,
  highHour,
  lowHour,
  hoveredHour,
}: {
  hourly: TideHourValue[]
  highHour: number
  lowHour: number
  hoveredHour: number | null
}) {
  const width = 640
  const height = 180
  const padding = { top: 14, right: 18, bottom: 18, left: 18 }
  const minH = Math.min(...hourly.map((h) => h.height))
  const maxH = Math.max(...hourly.map((h) => h.height))
  const range = maxH - minH || 1

  const x = (hour: number) =>
    padding.left + (hour / 24) * (width - padding.left - padding.right)
  const y = (h: number) =>
    padding.top +
    (height - padding.top - padding.bottom) -
    ((h - minH) / range) * (height - padding.top - padding.bottom)

  const pathD = hourly
    .map((v, i) => `${i === 0 ? "M" : "L"} ${x(v.hour)} ${y(v.height)}`)
    .join(" ")
  const areaD = `${pathD} L ${x(hourly[hourly.length - 1].hour)} ${height - padding.bottom} L ${x(hourly[0].hour)} ${height - padding.bottom} Z`

  const highY = y(hourly.find((h) => h.hour === highHour)?.height ?? maxH)
  const lowY = y(hourly.find((h) => h.hour === lowHour)?.height ?? minH)

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-full w-full"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      {[0, 6, 12, 18, 24].map((hour) => (
        <line
          key={`grid-x-${hour}`}
          x1={x(hour)}
          x2={x(hour)}
          y1={padding.top}
          y2={height - padding.bottom}
          stroke="currentColor"
          strokeOpacity="0.12"
          strokeWidth="1"
        />
      ))}
      <line
        x1={padding.left}
        x2={width - padding.right}
        y1={highY}
        y2={highY}
        stroke="currentColor"
        strokeOpacity="0.12"
        strokeWidth="1"
      />
      <line
        x1={padding.left}
        x2={width - padding.right}
        y1={lowY}
        y2={lowY}
        stroke="currentColor"
        strokeOpacity="0.12"
        strokeWidth="1"
      />

      {hoveredHour !== null ? (
        <line
          x1={x(hoveredHour)}
          x2={x(hoveredHour)}
          y1={padding.top}
          y2={height - padding.bottom}
          stroke="currentColor"
          strokeOpacity="0.45"
          strokeWidth="1.5"
        />
      ) : null}

      <path d={areaD} fill="url(#tideFill)" />
      <path d={pathD} fill="none" stroke="url(#tideStroke)" strokeWidth="2" />

      {[highHour, lowHour].map((hour, idx) => {
        const hourData = hourly.find((h) => h.hour === hour)
        if (!hourData) return null
        return (
          <g key={`${hour}-${idx}`}>
            <line
              x1={x(hour)}
              x2={x(hour)}
              y1={padding.top}
              y2={height - padding.bottom}
              stroke={idx === 0 ? "#22d3ee" : "#f59e0b"}
              strokeOpacity="0.55"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <circle
              cx={x(hour)}
              cy={y(hourData.height)}
              r="3"
              fill={idx === 0 ? "#22d3ee" : "#f59e0b"}
            />
          </g>
        )
      })}

      <defs>
        <linearGradient id="tideStroke" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
        <linearGradient id="tideFill" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.03" />
        </linearGradient>
      </defs>
    </svg>
  )
}
