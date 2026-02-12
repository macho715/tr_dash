"use client"

import { useEffect, useMemo, useRef, useState, type RefObject } from "react"
import type { ScheduleDependency } from "@/lib/ssot/schedule"

type DependencyEdge = {
  predId: string
  succId: string
  type: ScheduleDependency["type"]
  lagDays: number
}

type RenderPath = {
  id: string
  d: string
  marker: string
  stroke: string
  strokeWidth: number
  dash?: string
  label?: {
    x: number
    y: number
    text: string
    color: string
  }
  /** Dependency type label (FS/SS/FF/SF) shown on the midpoint */
  typeLabel?: {
    x: number
    y: number
    text: string
    color: string
  }
}

type Props = {
  containerRef: RefObject<HTMLDivElement>
  edges: DependencyEdge[]
  renderKey?: number
  className?: string
}

const STYLES: Record<
  ScheduleDependency["type"],
  { stroke: string; dash?: string; width: number; marker: string }
> = {
  FS: { stroke: "rgb(34 211 238)", width: 1.5, marker: "arrow-fs" },
  SS: { stroke: "rgb(34 211 238)", dash: "4 2", width: 1.5, marker: "arrow-ss" },
  FF: { stroke: "rgb(6 182 212)", width: 2, marker: "arrow-ff" },
  SF: { stroke: "rgb(251 146 60)", dash: "8 4", width: 1.5, marker: "arrow-sf" },
}
const LABEL_EDGE_THRESHOLD = 250
const MIN_RECALC_INTERVAL_MS = 40

function escapeAttributeValue(value: string) {
  return value.replace(/"/g, '\\"')
}

function getItemRect(container: HTMLElement, id: string): DOMRect | null {
  const selector = `.vis-item[data-id="${escapeAttributeValue(id)}"]`
  const el = container.querySelector<HTMLElement>(selector)
  return el ? el.getBoundingClientRect() : null
}

export function DependencyArrowsOverlay({
  containerRef,
  edges,
  renderKey = 0,
  className,
}: Props) {
  const [layout, setLayout] = useState<{
    width: number
    height: number
    paths: RenderPath[]
  }>({ width: 0, height: 0, paths: [] })
  const [resizeTick, setResizeTick] = useState(0)
  const lastComputeAtRef = useRef(0)
  const lastComputeSignatureRef = useRef("")

  const edgesKey = useMemo(
    () => edges.map((e) => `${e.predId}->${e.succId}:${e.type}:${e.lagDays}`).join("|"),
    [edges]
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container || typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(() => {
      setResizeTick((prev) => prev + 1)
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [containerRef])

  useEffect(() => {
    const container = containerRef.current
    if (!container || edges.length === 0) {
      setLayout({ width: 0, height: 0, paths: [] })
      return
    }

    let raf = 0
    const update = () => {
      const now = performance.now()
      const rect = container.getBoundingClientRect()
      const width = Math.max(0, Math.round(rect.width))
      const height = Math.max(0, Math.round(rect.height))
      if (width === 0 || height === 0) {
        setLayout({ width, height, paths: [] })
        return
      }
      const signature = `${edgesKey}|${resizeTick}|${width}x${height}`
      if (
        signature === lastComputeSignatureRef.current &&
        now - lastComputeAtRef.current < MIN_RECALC_INTERVAL_MS
      ) {
        return
      }
      lastComputeSignatureRef.current = signature
      lastComputeAtRef.current = now

      const showLabels = edges.length <= LABEL_EDGE_THRESHOLD
      const rectCache = new Map<string, DOMRect | null>()
      const getCachedRect = (id: string) => {
        if (!rectCache.has(id)) {
          rectCache.set(id, getItemRect(container, id))
        }
        return rectCache.get(id) ?? null
      }
      const isOutsideViewport = (itemRect: DOMRect) =>
        itemRect.right < rect.left ||
        itemRect.left > rect.right ||
        itemRect.bottom < rect.top ||
        itemRect.top > rect.bottom

      const paths: RenderPath[] = []
      for (const edge of edges) {
        const predRect = getCachedRect(edge.predId)
        const succRect = getCachedRect(edge.succId)
        if (!predRect || !succRect) continue
        if (isOutsideViewport(predRect) && isOutsideViewport(succRect)) continue

        const predLeft = predRect.left - rect.left
        const predRight = predRect.right - rect.left
        const predMidY = predRect.top - rect.top + predRect.height / 2
        const succLeft = succRect.left - rect.left
        const succRight = succRect.right - rect.left
        const succMidY = succRect.top - rect.top + succRect.height / 2

        let x1 = predRight
        let x2 = succLeft
        if (edge.type === "SS") {
          x1 = predLeft
          x2 = succLeft
        } else if (edge.type === "FF") {
          x1 = predRight
          x2 = succRight
        } else if (edge.type === "SF") {
          x1 = predLeft
          x2 = succRight
        }

        const y1 = predMidY
        const y2 = succMidY
        if (!Number.isFinite(x1 + x2 + y1 + y2)) continue

        const midX = x1 + (x2 - x1) / 2
        const d =
          Math.abs(y1 - y2) < 4
            ? `M ${x1} ${y1} L ${x2} ${y2}`
            : `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`

        const style = STYLES[edge.type] ?? STYLES.FS
        const label =
          showLabels && edge.lagDays !== 0
            ? {
                x: midX,
                y: (y1 + y2) / 2 - 6,
                text: `${edge.lagDays > 0 ? "+" : ""}${edge.lagDays}d`,
                color: edge.lagDays > 0 ? "rgb(34 211 238)" : "rgb(239 68 68)",
              }
            : undefined

        // Type label (FS/SS/FF/SF) near the arrowhead
        const typeLabelOffset = edge.lagDays !== 0 ? 14 : 6
        const typeLabel =
          showLabels && edge.type !== "FS"
            ? {
                x: midX,
                y: (y1 + y2) / 2 + typeLabelOffset,
                text: edge.type,
                color: style.stroke,
              }
            : undefined

        paths.push({
          id: `${edge.predId}-${edge.succId}-${edge.type}-${edge.lagDays}`,
          d,
          marker: style.marker,
          stroke: style.stroke,
          strokeWidth: style.width,
          dash: style.dash,
          label,
          typeLabel,
        })
      }

      setLayout({ width, height, paths })
    }

    raf = requestAnimationFrame(update)
    return () => cancelAnimationFrame(raf)
  }, [containerRef, edges, edgesKey, renderKey, resizeTick])

  if (layout.paths.length === 0 || layout.width === 0 || layout.height === 0) {
    return null
  }

  return (
    <svg
      className={className}
      width={layout.width}
      height={layout.height}
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      aria-hidden="true"
    >
      <defs>
        {(["FS", "SS", "FF", "SF"] as const).map((type) => (
          <marker
            key={type}
            id={`arrow-${type.toLowerCase()}`}
            markerWidth="6"
            markerHeight="6"
            refX="5"
            refY="3"
            orient="auto"
          >
            <polygon
              points="0 0, 6 3, 0 6"
              fill={STYLES[type].stroke}
              fillOpacity="0.85"
            />
          </marker>
        ))}
      </defs>
      {layout.paths.map((path) => (
        <g key={path.id}>
          <path
            d={path.d}
            fill="none"
            stroke={path.stroke}
            strokeWidth={path.strokeWidth}
            strokeDasharray={path.dash}
            strokeOpacity="0.6"
            markerEnd={`url(#${path.marker})`}
            vectorEffect="non-scaling-stroke"
          />
          {path.label && (
            <text
              x={path.label.x}
              y={path.label.y}
              fontSize="10"
              fill={path.label.color}
              textAnchor="middle"
            >
              {path.label.text}
            </text>
          )}
          {path.typeLabel && (
            <text
              x={path.typeLabel.x}
              y={path.typeLabel.y}
              fontSize="9"
              fontWeight="600"
              fontFamily="'JetBrains Mono', monospace"
              fill={path.typeLabel.color}
              fillOpacity="0.7"
              textAnchor="middle"
            >
              {path.typeLabel.text}
            </text>
          )}
        </g>
      ))}
    </svg>
  )
}
