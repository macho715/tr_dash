"use client"

import { useEffect, useMemo, useRef, useState, type RefObject } from "react"
import type { WeatherForecastData, WeatherLimits } from "@/lib/weather/weather-service"
import { buildWeatherDayStatusMap, drawWeatherOverlay } from "@/lib/weather/weather-overlay"

type Props = {
  containerRef: RefObject<HTMLDivElement>
  forecast: WeatherForecastData
  limits: WeatherLimits
  viewStart: Date
  viewEnd: Date
  visible?: boolean
  opacity?: number
  nearLimitRatio?: number
  renderKey?: number
  className?: string
}

export function WeatherOverlay({
  containerRef,
  forecast,
  limits,
  viewStart,
  viewEnd,
  visible = true,
  opacity = 1,
  nearLimitRatio = 0.85,
  renderKey = 0,
  className,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const lastDrawRef = useRef(0)
  const lastDrawSignatureRef = useRef("")
  const pendingRafRef = useRef<number | null>(null)
  const [metrics, setMetrics] = useState({
    width: 0,
    height: 0,
    left: 0,
    top: 0,
    dpr: 1,
  })
  const [resizeTick, setResizeTick] = useState(0)

  const dayStatusMap = useMemo(
    () => buildWeatherDayStatusMap(forecast, limits, nearLimitRatio),
    [forecast, limits, nearLimitRatio]
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
    return () => {
      if (pendingRafRef.current !== null) {
        cancelAnimationFrame(pendingRafRef.current)
        pendingRafRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const containerRect = container.getBoundingClientRect()
    const centerPanel =
      container.querySelector<HTMLElement>(".vis-panel.vis-center") ?? container
    const centerRect = centerPanel.getBoundingClientRect()
    const width = Math.max(0, Math.round(centerRect.width))
    const height = Math.max(0, Math.round(centerRect.height))
    const left = Math.max(0, Math.round(centerRect.left - containerRect.left))
    const top = Math.max(0, Math.round(centerRect.top - containerRect.top))
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    setMetrics({ width, height, left, top, dpr })
  }, [containerRef, renderKey, resizeTick])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    if (!visible || metrics.width === 0 || metrics.height === 0) {
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
      lastDrawSignatureRef.current = ""
      return
    }

    const cssWidth = metrics.width
    const cssHeight = metrics.height
    const dpr = metrics.dpr
    const drawSignature = [
      viewStart.getTime(),
      viewEnd.getTime(),
      cssWidth,
      cssHeight,
      opacity.toFixed(3),
      dayStatusMap.size,
    ].join("|")
    if (drawSignature === lastDrawSignatureRef.current) {
      return
    }
    const scheduleDraw = () => {
      const now = performance.now()
      if (now - lastDrawRef.current < 100) {
        if (pendingRafRef.current === null) {
          pendingRafRef.current = requestAnimationFrame(scheduleDraw)
        }
        return
      }
      lastDrawRef.current = now
      pendingRafRef.current = null
      lastDrawSignatureRef.current = drawSignature

      canvas.width = Math.max(1, Math.floor(cssWidth * dpr))
      canvas.height = Math.max(1, Math.floor(cssHeight * dpr))
      canvas.style.width = `${cssWidth}px`
      canvas.style.height = `${cssHeight}px`

      drawWeatherOverlay({
        canvas,
        viewStart,
        viewEnd,
        dayStatusMap,
        width: cssWidth,
        height: cssHeight,
        opacity,
        pixelRatio: dpr,
      })
    }

    scheduleDraw()
  }, [metrics, viewStart, viewEnd, dayStatusMap, visible, opacity, renderKey])

  if (!visible) return null

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        left: metrics.left,
        top: metrics.top,
      }}
      aria-hidden="true"
    />
  )
}
