"use client"

import { X } from "lucide-react"
import type { LegendDefinition } from "@/lib/gantt-legend-guide"

type GanttLegendDrawerProps = {
  item: LegendDefinition
  onClose: () => void
}

/** P1-4: 범례 클릭 시 태그 정의 + 의사결정 영향 표시 (2-click 내 도달) */
export function GanttLegendDrawer({ item, onClose }: GanttLegendDrawerProps) {
  return (
    <div
      className="fixed inset-y-0 right-0 z-50 w-full max-w-md border-l border-accent/20 bg-card/95 shadow-xl backdrop-blur-xl"
      role="dialog"
      aria-label="범례 설명"
    >
      <div className="flex h-full flex-col p-4">
        <div className="flex items-center justify-between border-b border-accent/15 pb-3">
          <span className="text-sm font-bold text-foreground">{item.shortLabel} · {item.label}</span>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[24px] min-w-[24px] rounded p-1 text-muted-foreground hover:bg-accent/20 hover:text-foreground"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-4 space-y-4 text-sm">
          <div>
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-cyan-400">정의</h4>
            <p className="text-slate-300">{item.definition}</p>
          </div>
          <div>
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-amber-400">의사결정 영향</h4>
            <p className="text-slate-300">{item.impact}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
