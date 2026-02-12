"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, Megaphone } from "lucide-react"
import { WeatherBlock } from "@/components/dashboard/weather-block"
import { GoNoGoBadge } from "@/components/dashboard/go-nogo-badge"
import { useDate } from "@/lib/contexts/date-context"
import {
  IMMEDIATE_ACTION_ITEMS,
  countCompletedImmediateActions,
  createEmptyImmediateActionState,
  loadImmediateActionsForDate,
  saveImmediateActionsForDate,
  toSelectedDateKey,
  toggleImmediateAction,
  type ImmediateActionId,
} from "@/lib/alerts/immediate-actions"
import { weatherForecast, weatherLimits } from "@/lib/weather/weather-service"
import { buildWeatherDelayPreview } from "@/lib/weather/weather-delay-preview"
import { evaluateWeatherPoint } from "@/lib/weather/weather-validator"
import type { ScheduleActivity } from "@/lib/ssot/schedule"

export type AlertNavigateSectionId = "voyages" | "schedule" | "gantt" | "water-tide"

type OperationalNoticeProps = {
  onSelectVoyageNo?: (voyageNo: number) => void
  onNavigateSection?: (sectionId: AlertNavigateSectionId) => void
}

function getStorage(): Storage | undefined {
  if (typeof window === "undefined") return undefined
  return window.localStorage
}

function runAction(
  actionId: ImmediateActionId,
  onSelectVoyageNo?: (voyageNo: number) => void,
  onNavigateSection?: (sectionId: AlertNavigateSectionId) => void
) {
  if (actionId === "load_tr1") {
    onSelectVoyageNo?.(1)
    onNavigateSection?.("voyages")
    return
  }
  if (actionId === "spmt_keep") {
    onNavigateSection?.("schedule")
    return
  }
  if (actionId === "finalize_schedule") {
    onNavigateSection?.("gantt")
    return
  }
}

export function OperationalNotice({
  onSelectVoyageNo,
  onNavigateSection,
}: OperationalNoticeProps) {
  const { formattedDate, dayNumber, selectedDate } = useDate()
  const dateKey = useMemo(() => toSelectedDateKey(selectedDate), [selectedDate])
  const [actionState, setActionState] = useState(createEmptyImmediateActionState)

  useEffect(() => {
    setActionState(loadImmediateActionsForDate(dateKey, getStorage()))
  }, [dateKey])

  const completedCount = useMemo(
    () => countCompletedImmediateActions(actionState),
    [actionState]
  )

  const handleToggle = (actionId: ImmediateActionId) => {
    setActionState((prev) => {
      const next = toggleImmediateAction(prev, actionId)
      saveImmediateActionsForDate(dateKey, next, getStorage())
      return next
    })
  }

  return (
    <div className="bg-gradient-to-r from-cyan-500/10 to-teal-500/5 border border-cyan-500/40 rounded-xl px-6 py-4 flex items-start gap-4">
      <Megaphone className="w-7 h-7 text-cyan-400 flex-shrink-0 mt-0.5" />
      <div className="text-sm flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-slate-300">
            <strong className="text-cyan-400">AGI TR 1–7</strong> — 빔 교체 · LO/LI · 해상고정 ·
            이송 · 터닝 · 잭다운
          </p>
          <span className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2 py-0.5 text-xs font-semibold text-cyan-300">
            {completedCount}/{IMMEDIATE_ACTION_ITEMS.length} done
          </span>
        </div>
        <div className="text-slate-400 text-xs mt-2 space-y-1.5">
          {IMMEDIATE_ACTION_ITEMS.map((item) => {
            const checked = actionState[item.id]
            return (
              <div key={item.id} className="flex items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-slate-500 bg-slate-900 text-cyan-400 focus:ring-cyan-300"
                  checked={checked}
                  onChange={() => handleToggle(item.id)}
                  aria-label={`${item.label} 완료 토글`}
                />
                <p className={"flex-1 " + (item.id === "finalize_schedule" ? "italic" : "")}>
                  • {item.label}
                </p>
                <button
                  type="button"
                  className="rounded-md border border-cyan-500/40 bg-cyan-500/10 px-2 py-0.5 text-[11px] font-semibold text-cyan-200 hover:bg-cyan-500/20"
                  onClick={() => runAction(item.id, onSelectVoyageNo, onNavigateSection)}
                  aria-label={`${item.label} 이동`}
                >
                  Go
                </button>
              </div>
            )
          })}
          <p className="text-cyan-400 font-semibold mt-2">
            선택일: {formattedDate} (일차 {Math.round(dayNumber)})
          </p>
        </div>
      </div>
    </div>
  )
}

type AlertsTriageProps = {
  activities: ScheduleActivity[]
  onSelectVoyageNo?: (voyageNo: number) => void
  onNavigateSection?: (sectionId: AlertNavigateSectionId) => void
}

function formatNoGoDays(days: string[]) {
  return days.length > 0 ? days.join(", ") : "—"
}

export function AlertsTriage({
  activities,
  onSelectVoyageNo,
  onNavigateSection,
}: AlertsTriageProps) {
  const weatherDelayChanges = useMemo(
    () => buildWeatherDelayPreview(activities, weatherForecast, weatherLimits),
    [activities]
  )
  const noGoDays = useMemo(() => {
    return Array.from(
      new Set(
        weatherForecast.series
          .map((point) => {
            const result = evaluateWeatherPoint(point, weatherLimits)
            if (result.status !== "NO_GO") return null
            const ts = point.ts
            if (!ts) return null
            const date = new Date(ts)
            if (Number.isNaN(date.getTime())) return null
            return date.toISOString().slice(0, 10)
          })
          .filter((value): value is string => Boolean(value))
      )
    )
  }, [])

  return (
    <section className="rounded-2xl border border-accent/15 bg-card/80 p-6 backdrop-blur-lg">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-semibold text-foreground">알림 분류 (Alerts Triage)</div>
        <div className="flex flex-wrap gap-2">
          {["기상", "해상", "SPMT", "안전", "항만"].map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-slate-700/60 bg-slate-900/60 px-3 py-1 text-xs text-slate-400"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
      <div className="space-y-4">
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-cyan-300">
            해상 이송 Go/No-Go
          </div>
          <GoNoGoBadge />
        </div>
        {weatherDelayChanges.length > 0 && (
          <div className="rounded-xl border border-red-500/50 bg-red-950/30 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-300">
              <AlertTriangle className="h-4 w-4 text-red-300" />
              Weather Delay Predicted
            </div>
            <div className="grid gap-3 text-xs text-slate-300 sm:grid-cols-2">
              <div>
                <div className="text-slate-400">NO_GO Days (UTC)</div>
                <div className="font-mono text-red-300">{formatNoGoDays(noGoDays)}</div>
              </div>
              <div>
                <div className="text-slate-400">Affected Activities</div>
                <div className="text-lg font-bold text-red-300">{weatherDelayChanges.length}</div>
              </div>
            </div>
            <div className="mt-2 text-[11px] text-slate-400">
              Check Gantt ghost bars (red/orange dashed) for details.
            </div>
          </div>
        )}
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-rose-300">
              즉시 조치 (Immediate Action)
            </div>
            <OperationalNotice
              onSelectVoyageNo={onSelectVoyageNo}
              onNavigateSection={onNavigateSection}
            />
          </div>
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-amber-300">
              모니터링 (Monitoring)
            </div>
            <WeatherBlock />
          </div>
        </div>
      </div>
    </section>
  )
}
