import type { ScheduleActivity } from "@/lib/ssot/schedule"
import { diffUTCDays } from "@/lib/ssot/schedule"

export type DensityBucket = {
  index: number
  date: string
  count: number
}

export type DensityResult = {
  buckets: DensityBucket[]
  maxCount: number
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

export function buildDensityBuckets(
  activities: ScheduleActivity[],
  projectStart: Date,
  projectEnd: Date
): DensityResult {
  const totalDays =
    Math.floor((projectEnd.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
  const counts = new Array<number>(Math.max(0, totalDays)).fill(0)
  const projectStartIso = projectStart.toISOString().slice(0, 10)

  for (const activity of activities) {
    if (!activity.activity_id) continue
    const startIdx = clamp(diffUTCDays(projectStartIso, activity.planned_start), 0, totalDays - 1)
    const endIdx = clamp(diffUTCDays(projectStartIso, activity.planned_finish), 0, totalDays - 1)

    const from = Math.min(startIdx, endIdx)
    const to = Math.max(startIdx, endIdx)

    for (let i = from; i <= to; i += 1) {
      counts[i] += 1
    }
  }

  let maxCount = 0
  const buckets: DensityBucket[] = counts.map((count, index) => {
    if (count > maxCount) maxCount = count
    const date = new Date(projectStart.getTime() + index * 24 * 60 * 60 * 1000)
    const dateIso = date.toISOString().slice(0, 10)
    return { index, date: dateIso, count }
  })

  return { buckets, maxCount: Math.max(1, maxCount) }
}
