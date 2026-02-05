/**
 * HeatmapLegend component for TR Dashboard
 * Phase 2: Enhanced Heatmap Implementation
 * Displays 6-color gradient legend for activity density visualization
 */
'use client'

const HEATMAP_GRADIENT = [
  { color: '#0198bd', label: 'Low' },
  { color: '#49e3ce', label: 'Low-Med' },
  { color: '#d8feb5', label: 'Medium' },
  { color: '#feedb1', label: 'Med-High' },
  { color: '#fead54', label: 'High' },
  { color: '#d1374e', label: 'Very High' },
]

type HeatmapLegendProps = {
  visible: boolean
}

/**
 * Renders color-coded legend for heatmap intensity levels
 * Positioned at left-2 top-20 to avoid overlap with map controls
 */
export function HeatmapLegend({ visible }: HeatmapLegendProps) {
  if (!visible) return null

  return (
    <div
      className="absolute left-2 top-20 z-[1000] rounded-md border border-accent/30 bg-card/90 px-2 py-1.5 text-xs backdrop-blur-sm"
      data-testid="heatmap-legend"
    >
      <div className="mb-1 font-semibold text-muted-foreground">Activity Density</div>
      {HEATMAP_GRADIENT.map((g) => (
        <div key={g.color} className="flex items-center gap-1.5">
          <span
            className="h-3 w-5 rounded border border-gray-300"
            style={{ backgroundColor: g.color }}
            aria-hidden
          />
          <span className="text-muted-foreground">{g.label}</span>
        </div>
      ))}
    </div>
  )
}
