"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, CalendarClock, ChevronDown, ChevronUp, Gauge } from "lucide-react"
import { scheduleActivities } from "@/lib/data/schedule-data"
import { voyages } from "@/lib/dashboard-data"
import { useDate } from "@/lib/contexts/date-context"

function parseDateString(dateStr: string): Date {
  const monthMap: Record<string, number> = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  }
  const parts = dateStr.trim().split(" ")
  const month = monthMap[parts[0]]
  const day = parseInt(parts[1], 10)
  return new Date(2026, month, day)
}

/** M2-PR1: Shift Brief Card — Go/No-Go·Today pulse·next decision 한 줄 정리, 접기 가능 */
export function OperationOverviewRibbon() {
  const { selectedDate } = useDate()
  const [isCompact, setIsCompact] = useState(false)
  const [briefExpanded, setBriefExpanded] = useState(true)

  useEffect(() => {
    const handleScroll = () => setIsCompact(window.scrollY > 140)
    handleScroll()
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const criticalCount = useMemo(() => {
    const start = new Date(selectedDate)
    const end = new Date(selectedDate)
    end.setDate(end.getDate() + 2)
    return scheduleActivities.filter((a) => {
      const plannedStart = new Date(a.planned_start)
      return plannedStart >= start && plannedStart <= end
    }).length
  }, [selectedDate])

  const delayedVoyages = useMemo(() => {
    return voyages.filter((v) => {
      const loadOut = parseDateString(v.loadOut)
      const jackDown = parseDateString(v.jackDown)
      const delayThreshold = new Date(loadOut)
      delayThreshold.setDate(delayThreshold.getDate() + 3)
      return selectedDate > delayThreshold && selectedDate <= jackDown
    }).length
  }, [selectedDate])

  return (
    <section
      className="mb-6 rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-500/10 via-slate-900/60 to-teal-500/10 backdrop-blur-xl shadow-glow"
      aria-label="시프트 브리핑"
    >
      <div className="flex flex-wrap items-center gap-4 px-6 py-4 transition-all duration-300">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => setBriefExpanded((v) => !v)}
            className="flex items-center gap-2 rounded p-1 -m-1 text-left hover:bg-accent/20 min-h-[24px] min-w-[24px]"
            aria-expanded={briefExpanded ? 'true' : 'false'}
            aria-label={briefExpanded ? "시프트 브리핑 접기" : "시프트 브리핑 펼치기"}
          >
            <Gauge className="h-6 w-6 text-cyan-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground">시프트 브리핑 (Shift Brief)</div>
              <div className="text-xs text-slate-400">
                일일 펄스 · {selectedDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </div>
            </div>
            {briefExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
          </button>
        </div>
        {briefExpanded && (
          <>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
              <div className="flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                항차 지연 {delayedVoyages}건
              </div>
              <div className="flex items-center gap-2 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1">
                <CalendarClock className="h-3.5 w-3.5 text-cyan-300" />
                48시간 내 중요 작업 {criticalCount}건
              </div>
            </div>
            {!isCompact && (
              <div className="ml-auto flex items-center gap-3 text-xs text-slate-400">
                <span className="rounded-full border border-slate-600/40 bg-slate-900/60 px-2.5 py-1">
                  포커스: 로드아웃·세일어웨이 준비
                </span>
                <span className="rounded-full border border-slate-600/40 bg-slate-900/60 px-2.5 py-1">
                  다음 결정 창: 18:00 현지
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}
