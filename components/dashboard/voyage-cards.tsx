"use client"

import { useMemo } from "react"
import { Ship, Sailboat } from "lucide-react"
import { voyages } from "@/lib/dashboard-data"
import { getTideForVoyage } from "@/lib/data/tide-data"
import { useDate } from "@/lib/contexts/date-context"
import { TideTable } from "@/components/dashboard/tide-table"
import {
  getMapStatusColor,
  type MapSegmentStatus,
} from "@/lib/ssot/map-status-colors"
import {
  computeVoyageEtaDriftDays,
  riskColor,
  toRiskBand,
} from "@/lib/tr/voyage-map-view"

type Voyage = (typeof voyages)[number]

interface VoyageCardsProps {
  onSelectVoyage?: (voyage: Voyage) => void
  selectedVoyage?: Voyage | null
  hoveredVoyageNo?: number | null
  onHoverVoyage?: (voyageNo: number | null) => void
}

function parseVoyageDate(dateStr: string): Date {
  const monthMap: Record<string, number> = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  }
  const parts = dateStr.trim().split(" ")
  const month = monthMap[parts[0]]
  const day = parseInt(parts[1], 10)
  return new Date(Date.UTC(2026, month, day))
}

export function VoyageCards({
  onSelectVoyage,
  selectedVoyage,
  hoveredVoyageNo = null,
  onHoverVoyage,
}: VoyageCardsProps) {
  const { selectedDate } = useDate()

  // Show all voyages always (removed filtering)
  const displayVoyages = voyages

  function getVoyageStatus(v: Voyage): MapSegmentStatus {
    const loadOut = parseVoyageDate(v.loadOut)
    const jackDown = parseVoyageDate(v.jackDown)
    if (selectedDate < loadOut) return "planned"
    if (selectedDate > jackDown) return "completed"
    return "in_progress"
  }

  const driftByVoyage = useMemo(() => {
    const byVoyage: Record<number, number> = {}
    for (const voyage of displayVoyages) {
      byVoyage[voyage.voyage] = computeVoyageEtaDriftDays(voyage, selectedDate)
    }
    return byVoyage
  }, [displayVoyages, selectedDate])

  return (
    <section className="bg-card/85 backdrop-blur-lg rounded-2xl p-6 border border-accent/15">
      <h2 className="text-foreground text-base font-bold mb-5 flex items-center gap-2 tracking-tight">
        <Ship className="w-5 h-5 text-cyan-400" />
        7 Voyages Overview
        <span className="flex-1 h-px bg-gradient-to-r from-accent/40 to-transparent ml-3" />
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {displayVoyages.map((v) => (
          (() => {
            const driftDays = driftByVoyage[v.voyage] ?? 0
            const band = toRiskBand(driftDays)
            const bandColor = riskColor(band)
            const isSelected = selectedVoyage?.voyage === v.voyage
            const isHovered = hoveredVoyageNo === v.voyage

            return (
              <button
                key={v.voyage}
                type="button"
                onClick={() => onSelectVoyage?.(v)}
                onMouseEnter={() => onHoverVoyage?.(v.voyage)}
                onMouseLeave={() => onHoverVoyage?.(null)}
                className={`relative rounded-xl p-4 pt-10 border text-center transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:border-cyan-500 hover:shadow-voyage ${getMapStatusColor(
                  getVoyageStatus(v)
                )} ${
                  isSelected
                    ? "ring-2 ring-cyan-400/60"
                    : isHovered
                      ? "ring-1 ring-cyan-300/40"
                      : ""
                }`}
              >
                <div
                  className="absolute right-2 top-2 min-w-[58px] rounded-md border px-2 py-1 text-right"
                  style={{
                    borderColor: `${bandColor}88`,
                    color: bandColor,
                    backgroundColor: `${bandColor}22`,
                  }}
                  title={`ETA Drift ${driftDays >= 0 ? "+" : ""}${driftDays.toFixed(1)}d`}
                >
                  <div className="text-[10px] font-bold leading-none">{band}</div>
                  <div className="font-mono text-[10px] leading-none mt-1">
                    {driftDays >= 0 ? "+" : ""}
                    {driftDays.toFixed(1)}d
                  </div>
                </div>
                <div className="font-mono text-amber-400 text-xs font-bold tracking-widest uppercase mb-2">
                  Voyage {v.voyage}
                </div>
                <div className="text-foreground text-sm font-bold mb-3 tracking-tight">
                  {v.trUnit}
                </div>
                <div className="font-mono text-xs text-slate-500 leading-relaxed space-y-0.5">
                  <p>
                    <strong className="text-slate-400">Load-out:</strong> {v.loadOut}
                  </p>
                  <p>
                    <strong className="text-slate-400">Load-in:</strong> {v.loadIn}
                  </p>
                  <p>
                    <strong className="text-slate-400">Jack-down:</strong> {v.jackDown}
                  </p>
                </div>
                <div className="inline-flex items-center gap-1.5 mt-3 bg-gradient-to-r from-cyan-500 to-cyan-600 text-slate-900 px-3 py-1.5 rounded-full font-mono text-xs font-bold tracking-wide">
                  <Sailboat className="w-3 h-3" />
                  {v.sailDate}
                </div>
                <TideTable
                  voyageNum={v.voyage}
                  rows={getTideForVoyage(v.voyage)}
                  className="mt-3 rounded-md border border-accent/10 overflow-hidden"
                />
              </button>
            )
          })()
        ))}
      </div>
    </section>
  )
}
