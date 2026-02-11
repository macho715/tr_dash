"use client"

import { useEffect, useRef } from "react"

type UseNearViewportPreloadParams = {
  targetId: string
  preload: () => Promise<unknown> | void
  rootMargin?: string
  enabled?: boolean
}

export function useNearViewportPreload({
  targetId,
  preload,
  rootMargin = "400px",
  enabled = true,
}: UseNearViewportPreloadParams) {
  const doneRef = useRef(false)

  useEffect(() => {
    if (!enabled || doneRef.current) return
    if (typeof window === "undefined" || typeof document === "undefined") return

    const target = document.getElementById(targetId)
    if (!target) return

    const runPreload = () => {
      if (doneRef.current) return
      doneRef.current = true
      void Promise.resolve(preload()).catch(() => {
        // Preload failures should never block rendering.
      })
    }

    if (typeof IntersectionObserver === "undefined") {
      runPreload()
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            runPreload()
            observer.unobserve(entry.target)
            observer.disconnect()
            break
          }
        }
      },
      { root: null, rootMargin, threshold: 0 }
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [enabled, preload, rootMargin, targetId])
}
