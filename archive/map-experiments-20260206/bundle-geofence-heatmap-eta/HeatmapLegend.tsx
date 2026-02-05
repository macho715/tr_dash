"use client"

import { HEATMAP_COLOR_RANGE } from "./layers/createHeatmapLayer"

const HEATMAP_LABELS = ["낮음", "다소 낮음", "중간", "다소 높음", "높음", "매우 높음"]

function rgbaString([r, g, b, a]: [number, number, number, number]) {
  return `rgba(${r}, ${g}, ${b}, ${a / 255})`
}

export function HeatmapLegend() {
  return (
    <div
      className="absolute left-4 bottom-4 z-40 rounded-lg border border-border bg-card/95 px-3 py-2 text-xs text-foreground shadow-lg backdrop-blur-sm"
      role="group"
      aria-label="Heatmap intensity legend"
    >
      <div className="mb-2 text-[11px] font-semibold text-muted-foreground">Heatmap</div>
      <div className="flex flex-col gap-1.5">
        {HEATMAP_COLOR_RANGE.map((color, index) => (
          <div key={HEATMAP_LABELS[index] ?? index} className="flex items-center gap-2">
            <span
              className="h-3 w-6 rounded-sm border border-white/10"
              style={{ backgroundColor: rgbaString(color) }}
              aria-hidden="true"
            />
            <span className="text-[11px] text-muted-foreground">
              {HEATMAP_LABELS[index] ?? "높음"}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
