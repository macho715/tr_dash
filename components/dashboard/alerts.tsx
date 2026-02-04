"use client"

import { Megaphone } from "lucide-react"
import { WeatherBlock } from "@/components/dashboard/weather-block"
import { GoNoGoBadge } from "@/components/dashboard/go-nogo-badge"
import { useDate } from "@/lib/contexts/date-context"

export function OperationalNotice() {
  const { formattedDate, dayNumber } = useDate()

  return (
    <div className="bg-gradient-to-r from-cyan-500/10 to-teal-500/5 border border-cyan-500/40 rounded-xl px-6 py-4 flex items-start gap-4">
      <Megaphone className="w-7 h-7 text-cyan-400 flex-shrink-0 mt-0.5" />
      <div className="text-sm flex-1">
        <p className="text-slate-300">
          <strong className="text-cyan-400">AGI TR 1–7</strong> — 빔 교체 · LO/LI · 해상고정 · 이송 · 터닝 · 잭다운
        </p>
        <div className="text-slate-400 text-xs mt-2 space-y-0.5">
          <p>• 1차 항차: TR 1유닛 로드 (LCT 밸러스팅 제외)</p>
          <p>• SPMT 2세트 유지 · MOB 1/26 변경 없음</p>
          <p className="italic">• 잔여 일정 확정 후 반영</p>
          <p className="text-cyan-400 font-semibold mt-2">
            선택일: {formattedDate} (일차 {Math.round(dayNumber)})
          </p>
        </div>
      </div>
    </div>
  )
}


export function AlertsTriage() {
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
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-rose-300">
              즉시 조치 (Immediate Action)
            </div>
            <OperationalNotice />
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
