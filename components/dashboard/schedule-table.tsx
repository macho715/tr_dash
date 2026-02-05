"use client"

import { BarChart3 } from "lucide-react"
import { voyages, getNearestVoyageStart, parseVoyageShortDate } from "@/lib/dashboard-data"
import { useDate } from "@/lib/contexts/date-context"
import { useViewMode } from "@/src/lib/stores/view-mode-store"
import { toUtcNoon } from "@/lib/ssot/schedule"

export function ScheduleTable() {
  const { selectedDate, setSelectedDate } = useDate()
  const { setDateCursor } = useViewMode()

  // Use UTC noon (same as getVoyageWindows / selectedDate) so voyage filter matches date context
  const filteredVoyages = voyages.filter((v) => {
    const loadOutDate = parseVoyageShortDate(v.loadOut)
    const jackDownDate = parseVoyageShortDate(v.jackDown)
    const t = selectedDate.getTime()
    return t >= loadOutDate.getTime() && t <= jackDownDate.getTime()
  })

  // patchmain #9: never show "0 of 7"; when no match show all voyages + notice
  const displayVoyages = filteredVoyages.length > 0 ? filteredVoyages : voyages
  const isShowingAllDueToNoMatch = filteredVoyages.length === 0 && voyages.length > 0

  return (
    <section className="bg-card/85 backdrop-blur-lg rounded-2xl p-6 border border-accent/15 mb-6">
      <h2 className="text-foreground text-base font-bold mb-5 flex items-center gap-2 tracking-tight">
        <BarChart3 className="w-5 h-5 text-cyan-400" />
        항차 상세 일정 (Voyage Schedule)
        <span className="text-slate-500 text-xs font-normal">
          (표시 {displayVoyages.length}/{voyages.length})
        </span>
        <span className="flex-1 h-px bg-gradient-to-r from-accent/40 to-transparent ml-3" />
      </h2>
      {isShowingAllDueToNoMatch && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <p className="text-amber-400/90 text-sm">
            선택일이 모든 항차 구간 밖입니다. 전체 항차를 표시합니다.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                const d = getNearestVoyageStart()
                setSelectedDate(d)
                setDateCursor(d.toISOString())
              }}
              className="rounded-md bg-cyan-500/20 px-3 py-1.5 text-xs font-medium text-cyan-300 hover:bg-cyan-500/30"
            >
              활성 항차로 이동
            </button>
            <button
              type="button"
              onClick={() => {
                const d = toUtcNoon(new Date())
                setSelectedDate(d)
                setDateCursor(d.toISOString())
              }}
              className="rounded-md bg-slate-500/20 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-500/30"
            >
              오늘
            </button>
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] border-collapse">
          <thead>
            <tr>
              {[
                "항차 / TR 유닛",
                "LCT 도착 MZP",
                "로드아웃",
                "세일어웨이",
                "AGI 도착",
                "로드인",
                "터닝",
                "잭다운",
                "TR 베이",
              ].map((header) => (
                <th
                  key={header}
                  className="bg-gradient-to-b from-cyan-500/10 to-cyan-500/5 text-cyan-400 font-mono font-semibold text-xs uppercase tracking-wider p-3.5 text-center first:rounded-tl-lg last:rounded-tr-lg"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayVoyages.map((v, index) => (
              <tr
                key={v.voyage}
                className="border-b border-accent/10 transition-colors hover:bg-accent/5"
              >
                <td className="p-3.5 text-center text-xs font-medium text-foreground">
                  V{v.voyage} — {v.trUnit}
                </td>
                <td className="p-3.5 text-center text-xs text-slate-400 font-mono">
                  {v.arrivalMZP}
                </td>
                <td className="p-3.5 text-center text-xs text-slate-400 font-mono">
                  {v.loadOut}
                </td>
                <td className="p-3.5 text-center text-xs text-slate-400 font-mono">
                  {v.sailAway}
                </td>
                <td className="p-3.5 text-center text-xs text-slate-400 font-mono">
                  {v.agiArrival}
                </td>
                <td className="p-3.5 text-center text-xs text-slate-400 font-mono">
                  {v.loadIn}
                </td>
                <td className="p-3.5 text-center text-xs text-slate-400 font-mono">
                  {v.turning}
                </td>
                <td className="p-3.5 text-center text-xs text-slate-400 font-mono">
                  {v.jackDown}
                  {index === displayVoyages.length - 1 && displayVoyages.length === voyages.length && (
                    <span className="text-teal-400"> ✓</span>
                  )}
                </td>
                <td className="p-3.5 text-center text-xs text-cyan-400 font-semibold">
                  {v.bay}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
