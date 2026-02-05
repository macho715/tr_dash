"use client"

import { useEffect, useRef } from "react"
import { useDate } from "@/lib/contexts/date-context"
import { useViewMode } from "@/src/lib/stores/view-mode-store"
import { getSmartInitialDate } from "@/lib/dashboard-data"

/**
 * P1-1: Sync selected date and view-mode dateCursor to smart initial (today if in voyage window, else nearest voyage start).
 * Runs once on mount so Control Bar and date context stay in sync.
 */
export function SyncInitialDate() {
  const { setSelectedDate } = useDate()
  const { setDateCursor } = useViewMode()
  const done = useRef(false)

  useEffect(() => {
    if (done.current) return
    done.current = true
    const d = getSmartInitialDate()
    setSelectedDate(d)
    setDateCursor(d.toISOString())
  }, [setSelectedDate, setDateCursor])

  return null
}
