"use client"

import React from "react"

interface LegendItemProps {
  color: string
  label: string
  description?: string
}

function LegendItem({ color, label, description }: LegendItemProps) {
  return (
    <div className="flex items-center gap-2 group">
      <div className={`h-4 w-8 rounded ${color}`} />
      <div className="flex flex-col">
        <span className="text-slate-300 text-xs font-medium">{label}</span>
        {description && (
          <span className="text-slate-500 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">
            {description}
          </span>
        )}
      </div>
    </div>
  )
}

export interface GanttLegendProps {
  className?: string
  compact?: boolean
}

export function GanttLegend({ className = "", compact = false }: GanttLegendProps) {
  if (compact) {
    return (
      <div className={`flex items-center gap-3 text-xs ${className}`}>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-6 bg-blue-500 rounded" />
          <span className="text-slate-400">Planned</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-6 bg-green-500 rounded" />
          <span className="text-slate-400">Actual</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-6 bg-red-500 rounded" />
          <span className="text-slate-400">Collision</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-6 border-2 border-dashed border-gray-400 bg-transparent rounded" />
          <span className="text-slate-400">Preview</span>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`gantt-legend flex flex-wrap gap-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 ${className}`}
    >
      <LegendItem
        color="bg-blue-500"
        label="Planned"
        description="Original schedule"
      />

      <LegendItem
        color="bg-green-500"
        label="Actual"
        description="Real progress"
      />

      <LegendItem
        color="bg-red-500"
        label="Collision"
        description="Resource conflict"
      />

      <LegendItem
        color="border-2 border-dashed border-gray-400 bg-transparent"
        label="Preview"
        description="What-if / Weather simulation"
      />

      <LegendItem
        color="bg-yellow-500 opacity-50"
        label="Compare"
        description="Schedule comparison"
      />

      <LegendItem
        color="bg-orange-500"
        label="Weather Delay"
        description="Weather-impacted activities"
      />

      {/* Divider */}
      <div className="w-px bg-slate-700 mx-1" />

      {/* Event Overlays */}
      <div className="flex items-center gap-2">
        <div className="h-4 w-8 rounded bg-purple-500/30 border border-purple-500/50" />
        <div className="flex flex-col">
          <span className="text-slate-300 text-xs font-medium">Hold</span>
          <span className="text-slate-500 text-[10px]">Work on hold</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="h-4 w-2 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
        <div className="flex flex-col">
          <span className="text-slate-300 text-xs font-medium">Milestone</span>
          <span className="text-slate-500 text-[10px]">Key checkpoint</span>
        </div>
      </div>
    </div>
  )
}

export function GanttLegendDrawer() {
  const [isOpen, setIsOpen] = React.useState(false)

  return (
    <div className="gantt-legend-drawer relative">
      {/* Compact Toggle Button (always in DOM) */}
      <button
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-2 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-800/50 hover:bg-slate-800 rounded-md border border-slate-700/50 transition-colors ${isOpen ? "hidden" : ""}`}
        aria-label="Show legend"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>Legend</span>
      </button>

      {/* Expanded Legend (always in DOM) */}
      <div className={`relative ${isOpen ? "" : "hidden"}`}>
        <button
          onClick={() => setIsOpen(false)}
          className="absolute -top-2 -right-2 z-10 w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-200 bg-slate-800 rounded-full border border-slate-700 transition-colors"
          aria-label="Hide legend"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
        <GanttLegend />
      </div>
    </div>
  )
}
