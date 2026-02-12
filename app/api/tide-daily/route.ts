/**
 * GET /api/tide-daily
 * Returns daily hourly tide data for MINA ZAYED from WATER TIDE.csv.
 * Used by Water Tide section for day detail + daily highs/lows list.
 */
import { NextResponse } from "next/server"
import { readFile } from "fs/promises"
import { join } from "path"

const LOCATION = "MINA ZAYED"
const HOURS = Array.from({ length: 24 }, (_, i) => i)

export interface TideHourValue {
  hour: number
  height: number
}

export interface TideDaySummary {
  date: string
  hourly: TideHourValue[]
  high: number
  highTime: string
  low: number
  lowTime: string
}

export interface TideDailyResponse {
  location: string
  days: TideDaySummary[]
}

function parseCsvLine(line: string): string[] {
  return line.split(",").map((cell) => cell.trim())
}

function formatTime(hour: number): string {
  return `${hour.toString().padStart(2, "0")}:00`
}

export async function GET(): Promise<NextResponse<TideDailyResponse | { error: string }>> {
  try {
    const root = process.cwd()
    const path = join(root, "data", "raw", "WATER TIDE.csv")
    const raw = await readFile(path, "utf-8")
    const lines = raw.split(/\r?\n/).filter((l) => l.trim())
    if (lines.length < 2) {
      return NextResponse.json({ error: "Insufficient tide data" }, { status: 503 })
    }
    parseCsvLine(lines[0])
    const days: TideDaySummary[] = []

    for (let i = 1; i < lines.length; i++) {
      const cells = parseCsvLine(lines[i])
      const date = cells[0]
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue

      const hourly: TideHourValue[] = []
      for (let h = 0; h < 24; h++) {
        const rawVal = cells[h + 1]
        const height = parseFloat(rawVal ?? "0") || 0
        hourly.push({ hour: h, height })
      }

      let high = hourly[0].height
      let highHour = 0
      let low = hourly[0].height
      let lowHour = 0
      for (let h = 1; h < 24; h++) {
        if (hourly[h].height > high) {
          high = hourly[h].height
          highHour = h
        }
        if (hourly[h].height < low) {
          low = hourly[h].height
          lowHour = h
        }
      }

      days.push({
        date,
        hourly,
        high: Math.round(high * 100) / 100,
        highTime: formatTime(highHour),
        low: Math.round(low * 100) / 100,
        lowTime: formatTime(lowHour),
      })
    }

    return NextResponse.json({
      location: LOCATION,
      days,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load tide data"
    return NextResponse.json({ error: message }, { status: 503 })
  }
}
