"use client"

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react"
import { PROJECT_START, getSmartInitialDate } from "@/lib/dashboard-data"

// Fallback for SSR hydration; client syncs to smart initial via SyncInitialDate
const INITIAL_DATE = new Date("2026-01-26T12:00:00.000Z")

interface DateContextType {
  selectedDate: Date
  setSelectedDate: (date: Date) => void
  resetToInitialDate: () => void
  dayNumber: number
  formattedDate: string
}

const DateContext = createContext<DateContextType | undefined>(undefined)

export function DateProvider({ children }: { children: ReactNode }) {
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date(INITIAL_DATE.getTime()))
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const resetToInitialDate = useCallback(() => {
    const smartDate = getSmartInitialDate()
    setSelectedDate(smartDate)
  }, [])

  const effectiveDate = mounted ? selectedDate : INITIAL_DATE

  // patchmain #7: calendar-day index (startOfDay); SSOT timezone = PROJECT_START
  const dayNumber =
    Math.floor(
      (effectiveDate.getTime() - PROJECT_START.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1

  const formattedDate = effectiveDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })

  return (
    <DateContext.Provider
      value={{
        selectedDate: effectiveDate,
        setSelectedDate,
        resetToInitialDate,
        dayNumber: Math.max(1, dayNumber),
        formattedDate,
      }}
    >
      {children}
    </DateContext.Provider>
  )
}

export function useDate() {
  const context = useContext(DateContext)
  if (context === undefined) {
    throw new Error("useDate must be used within a DateProvider")
  }
  return context
}
