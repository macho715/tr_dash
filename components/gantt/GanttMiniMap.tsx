"use client"

import { useRef, useState } from "react"
import type { DensityBucket } from "@/lib/gantt/density"

type Props = {
  buckets: DensityBucket[]
  maxCount: number
  projectStart: Date
  projectEnd: Date
  visibleRange: { start: Date; end: Date }
  onWindowChange: (start: Date, end: Date) => void
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

export function GanttMiniMap({
  buckets,
  maxCount,
  projectStart,
  projectEnd,
  visibleRange,
  onWindowChange,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef<{ x: number; start: number; end: number } | null>(null)

  const totalMs = projectEnd.getTime() - projectStart.getTime()
  const windowMs = visibleRange.end.getTime() - visibleRange.start.getTime()

  const getRatio = (clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return 0
    return clamp((clientX - rect.left) / rect.width, 0, 1)
  }

  const updateWindowByCenter = (clientX: number) => {
    const ratio = getRatio(clientX)
    const centerMs = projectStart.getTime() + ratio * totalMs
    const startMs = clamp(centerMs - windowMs / 2, projectStart.getTime(), projectEnd.getTime() - windowMs)
    const endMs = startMs + windowMs
    onWindowChange(new Date(startMs), new Date(endMs))
  }

  const updateWindowByDrag = (clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0 || !dragStartRef.current) return
    const deltaX = clientX - dragStartRef.current.x
    const deltaMs = (deltaX / rect.width) * totalMs
    let startMs = dragStartRef.current.start + deltaMs
    let endMs = dragStartRef.current.end + deltaMs
    if (startMs < projectStart.getTime()) {
      startMs = projectStart.getTime()
      endMs = startMs + windowMs
    }
    if (endMs > projectEnd.getTime()) {
      endMs = projectEnd.getTime()
      startMs = endMs - windowMs
    }
    onWindowChange(new Date(startMs), new Date(endMs))
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    setIsDragging(true)
    dragStartRef.current = {
      x: event.clientX,
      start: visibleRange.start.getTime(),
      end: visibleRange.end.getTime(),
    }
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return
    updateWindowByDrag(event.clientX)
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const dragStart = dragStartRef.current
    const delta = dragStart ? Math.abs(event.clientX - dragStart.x) : 0
    setIsDragging(false)
    dragStartRef.current = null
    ;(event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId)
    if (delta < 3) {
      updateWindowByCenter(event.clientX)
    }
  }

  const viewportLeft = clamp(
    (visibleRange.start.getTime() - projectStart.getTime()) / totalMs,
    0,
    1
  )
  const viewportWidth = clamp(windowMs / totalMs, 0, 1)

  return (
    <div
      ref={containerRef}
      className="relative h-20 w-56 select-none rounded-lg border border-slate-700/60 bg-slate-900/70 p-2 text-[10px] text-slate-400 shadow-lg"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={() => {
        setIsDragging(false)
        dragStartRef.current = null
      }}
      role="button"
      aria-label="Mini map navigator"
      tabIndex={0}
    >
      <div className="absolute left-2 right-2 top-2 bottom-2">
        {buckets.map((bucket) => {
          const intensity = bucket.count / maxCount
          const height = 6 + intensity * 12
          const hue = 120 - 120 * intensity
          return (
            <div
              key={bucket.index}
              className="absolute bottom-0"
              style={{
                left: `${(bucket.index / buckets.length) * 100}%`,
                width: `${100 / buckets.length}%`,
                height: `${height}px`,
                background: `hsla(${hue}, 80%, 45%, 0.7)`,
              }}
            />
          )
        })}
      </div>
      <div
        className="absolute top-1 bottom-1 rounded-md border border-cyan-300/80 bg-cyan-300/10"
        style={{
          left: `${viewportLeft * 100}%`,
          width: `${viewportWidth * 100}%`,
        }}
      />
      <div className="absolute right-2 bottom-1 text-[9px] text-slate-500">
        Mini-map
      </div>
    </div>
  )
}
