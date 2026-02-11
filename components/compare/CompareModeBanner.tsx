"use client"

import { ArrowDownRight, ArrowUpRight, GitCompare } from "lucide-react"
import { useMemo } from "react"
import { useViewModeOptional } from "@/src/lib/stores/view-mode-store"
import type { CompareCollisionSeverity, CompareResult } from "@/lib/compare/types"

type CompareModeBannerProps = {
  /** Delta from compare-loader (null when no compare source loaded) */
  compareResult?: CompareResult | null
  onDrillDown?: (activityIds: string[]) => void
}

function formatMinutes(minutes: number): string {
  if (minutes === 0) return "0m"
  const absMinutes = Math.abs(minutes)
  const sign = minutes > 0 ? "+" : "-"
  const days = Math.floor(absMinutes / 1440)
  const hours = Math.floor((absMinutes % 1440) / 60)
  if (days > 0) return `${sign}${days}d ${hours}h`
  if (hours > 0) return `${sign}${hours}h`
  return `${sign}${absMinutes}m`
}

function trendTone(delta: number): "up" | "down" | "flat" {
  if (delta > 0) return "up"
  if (delta < 0) return "down"
  return "flat"
}

function toneClass(delta: number): string {
  const tone = trendTone(delta)
  if (tone === "up") return "text-rose-300"
  if (tone === "down") return "text-emerald-300"
  return "text-slate-300"
}

function severityLabel(severity: CompareCollisionSeverity): string {
  return severity === "error" ? "Blocking Collisions" : "Warning Collisions"
}

/**
 * Compare mode UI (Phase 10 T10.2)
 * Shows diff summary + KPI cards + drilldown.
 */
export function CompareModeBanner({ compareResult, onDrillDown }: CompareModeBannerProps) {
  const viewMode = useViewModeOptional()

  const s = compareResult?.summary
  const hasDelta = s && (s.addedCount + s.removedCount + s.changedCount > 0)
  const kpis = compareResult?.kpis

  const cards = useMemo(() => {
    if (!kpis) return []
    return [
      {
        key: "delay",
        title: "총 지연시간",
        value: formatMinutes(kpis.totalDelayMinutes.compare),
        delta: kpis.totalDelayMinutes.delta,
        deltaText: formatMinutes(kpis.totalDelayMinutes.delta),
        ids: kpis.drilldownActivityIds.totalDelayMinutes,
      },
      {
        key: "collision-error",
        title: severityLabel("error"),
        value: String(kpis.collisionCountBySeverity.error.compare),
        delta: kpis.collisionCountBySeverity.error.delta,
        deltaText: `${kpis.collisionCountBySeverity.error.delta > 0 ? "+" : ""}${kpis.collisionCountBySeverity.error.delta}`,
        ids: kpis.drilldownActivityIds.collisionBySeverity.error,
      },
      {
        key: "collision-warn",
        title: severityLabel("warn"),
        value: String(kpis.collisionCountBySeverity.warn.compare),
        delta: kpis.collisionCountBySeverity.warn.delta,
        deltaText: `${kpis.collisionCountBySeverity.warn.delta > 0 ? "+" : ""}${kpis.collisionCountBySeverity.warn.delta}`,
        ids: kpis.drilldownActivityIds.collisionBySeverity.warn,
      },
      {
        key: "evidence-risk",
        title: "증빙 리스크 증감",
        value: String(kpis.evidenceRiskCount.compare),
        delta: kpis.evidenceRiskCount.delta,
        deltaText: `${kpis.evidenceRiskCount.delta > 0 ? "+" : ""}${kpis.evidenceRiskCount.delta}`,
        ids: kpis.drilldownActivityIds.evidenceRiskCount,
      },
    ]
  }, [kpis])

  if (viewMode?.state.mode !== "compare") return null

  return (
    <div
      className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 p-4"
      data-testid="compare-mode-banner"
      role="region"
      aria-label="Compare mode"
    >
      <div className="flex items-start gap-3">
        <GitCompare className="h-5 w-5 shrink-0 text-cyan-400" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-cyan-200">Compare Mode</h3>
          <p className="mt-0.5 text-xs text-cyan-200/80">
            Baseline (option_c) vs scenario overlay. Read-only.
          </p>
          {compareResult && hasDelta && (
            <div className="mt-3 flex flex-wrap gap-4 text-xs">
              {s.addedCount > 0 && (
                <span className="text-emerald-400">+{s.addedCount} added</span>
              )}
              {s.removedCount > 0 && (
                <span className="text-red-400">−{s.removedCount} removed</span>
              )}
              {s.changedCount > 0 && (
                <span className="text-amber-400">
                  {s.totalShifted} shifted
                </span>
              )}
              {s.collisionsNew > 0 && (
                <span className="text-rose-400">
                  {s.collisionsNew} collisions new
                </span>
              )}
            </div>
          )}
          {cards.length > 0 && (
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {cards.map((card) => {
                const tone = trendTone(card.delta)
                return (
                  <button
                    key={card.key}
                    type="button"
                    className="rounded-lg border border-cyan-300/30 bg-slate-900/30 px-3 py-2 text-left hover:bg-slate-900/50"
                    onClick={() => onDrillDown?.(card.ids)}
                  >
                    <div className="text-[11px] text-cyan-100/80">{card.title}</div>
                    <div className="mt-1 text-base font-semibold text-cyan-100">{card.value}</div>
                    <div className={`mt-1 flex items-center gap-1 text-xs ${toneClass(card.delta)}`}>
                      {tone === "up" && <ArrowUpRight className="h-3 w-3" />}
                      {tone === "down" && <ArrowDownRight className="h-3 w-3" />}
                      <span>{card.deltaText}</span>
                    </div>
                    <div className="mt-2 text-[10px] text-cyan-200/70">
                      기준안 대비 / as-of {kpis?.asOf?.slice(0, 16)?.replace("T", " ") ?? ""}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
          {compareResult && !hasDelta && (
            <p className="mt-2 text-xs text-slate-500">
              No differences between baseline and compare source.
            </p>
          )}
          {!compareResult && (
            <p className="mt-2 text-xs text-slate-500">
              Load scenario to compare.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
