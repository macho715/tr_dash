"use client"

import type { DensityBucket } from "@/lib/gantt/density"

type Props = {
  buckets: DensityBucket[]
  maxCount: number
  className?: string
}

function colorForIntensity(intensity: number) {
  const hue = 120 - 120 * intensity
  const alpha = 0.08 + intensity * 0.22
  return `hsla(${hue}, 80%, 45%, ${alpha})`
}

export function DensityHeatmapOverlay({ buckets, maxCount, className }: Props) {
  if (buckets.length === 0) return null
  return (
    <div className={className}>
      {buckets.map((bucket) => {
        const intensity = bucket.count / maxCount
        return (
          <div
            key={bucket.index}
            className="absolute inset-y-0"
            style={{
              left: `${(bucket.index / buckets.length) * 100}%`,
              width: `${100 / buckets.length}%`,
              background: colorForIntensity(intensity),
            }}
            aria-hidden="true"
          />
        )
      })}
      <div className="pointer-events-none absolute bottom-2 right-3 flex items-center gap-1 text-[10px] text-slate-400">
        <span className="inline-block h-2 w-6 rounded-sm" style={{ background: colorForIntensity(0.1) }} />
        <span className="inline-block h-2 w-6 rounded-sm" style={{ background: colorForIntensity(1) }} />
        <span>Density</span>
      </div>
    </div>
  )
}
