export type TideSafetyStatus = "SAFE" | "DANGER" | "CLOSED"

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

export interface TideWindow {
  date: string
  hour: number
  height: number
  status: TideSafetyStatus
  inWorkWindow: boolean
  safeRunId?: string
}

export interface TideRuleConfig {
  workStartHour: number
  workEndHour: number
  safeHeightThreshold: number
  minConsecutiveSafeHours: number
}

export interface TideTaskInput {
  id: string
  name: string
  start: Date
  end: Date
}

export interface TaskSafetyResult {
  taskId: string
  status: TideSafetyStatus
  coveredHours: number
  safeHours: number
  dangerHours: number
  closedHours: number
  reasons: string[]
}

export interface TideSafeSlotSuggestion {
  taskId: string
  start: Date
  end: Date
  shiftHours: number
  safety: TaskSafetyResult
}

export interface TideShiftWhatIf {
  taskId: string
  shiftDays: number
  start: Date
  end: Date
  safety: TaskSafetyResult
}

type TideApiResponse = {
  location: string
  days: TideDaySummary[]
}

const DEFAULT_TIDE_RULE_CONFIG: TideRuleConfig = {
  workStartHour: 6,
  workEndHour: 17,
  safeHeightThreshold: 1.8,
  minConsecutiveSafeHours: 2,
}

const CACHE_TTL_MS = 5 * 60 * 1000

let tideCache:
  | {
      expiresAt: number
      value: TideApiResponse
    }
  | null = null

export function __resetTideCacheForTests(): void {
  tideCache = null
}

function toNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeDay(raw: unknown): TideDaySummary | null {
  if (!raw || typeof raw !== "object") return null
  const day = raw as Partial<TideDaySummary>
  if (!day.date || typeof day.date !== "string") return null

  const hourlyRaw = Array.isArray(day.hourly) ? day.hourly : []
  const hourly = hourlyRaw
    .map((value) => {
      if (!value || typeof value !== "object") return null
      const entry = value as Partial<TideHourValue>
      const hour = toNumber(entry.hour, -1)
      if (hour < 0 || hour > 23) return null
      return {
        hour,
        height: toNumber(entry.height, 0),
      }
    })
    .filter((value): value is TideHourValue => value !== null)
    .sort((a, b) => a.hour - b.hour)

  return {
    date: day.date,
    hourly,
    high: toNumber(day.high, 0),
    highTime: typeof day.highTime === "string" ? day.highTime : "00:00",
    low: toNumber(day.low, 0),
    lowTime: typeof day.lowTime === "string" ? day.lowTime : "00:00",
  }
}

function resolveConfig(config?: Partial<TideRuleConfig>): TideRuleConfig {
  return {
    workStartHour: config?.workStartHour ?? DEFAULT_TIDE_RULE_CONFIG.workStartHour,
    workEndHour: config?.workEndHour ?? DEFAULT_TIDE_RULE_CONFIG.workEndHour,
    safeHeightThreshold: config?.safeHeightThreshold ?? DEFAULT_TIDE_RULE_CONFIG.safeHeightThreshold,
    minConsecutiveSafeHours:
      config?.minConsecutiveSafeHours ?? DEFAULT_TIDE_RULE_CONFIG.minConsecutiveSafeHours,
  }
}

function toWindowKey(date: string, hour: number): string {
  return `${date}#${hour}`
}

function toIsoDateUTC(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function enumerateHourlyBuckets(start: Date, end: Date): Date[] {
  const startMs = start.getTime()
  const endMs = end.getTime()
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return []
  }

  const buckets: Date[] = []
  const cursor = new Date(start)
  cursor.setUTCMinutes(0, 0, 0)

  while (cursor.getTime() < endMs) {
    const bucketStart = new Date(cursor)
    const bucketEndMs = bucketStart.getTime() + 60 * 60 * 1000
    if (bucketEndMs > startMs && bucketStart.getTime() < endMs) {
      buckets.push(bucketStart)
    }
    cursor.setUTCHours(cursor.getUTCHours() + 1)
  }

  return buckets
}

function shiftTaskByHours(task: TideTaskInput, shiftHours: number): TideTaskInput {
  const shiftMs = shiftHours * 60 * 60 * 1000
  return {
    ...task,
    start: new Date(task.start.getTime() + shiftMs),
    end: new Date(task.end.getTime() + shiftMs),
  }
}

export async function fetchTideData(): Promise<{ location: string; days: TideDaySummary[] }> {
  const now = Date.now()
  if (tideCache && tideCache.expiresAt > now) {
    return tideCache.value
  }

  const response = await fetch("/api/tide-daily", {
    method: "GET",
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch tide data (${response.status})`)
  }

  const json = (await response.json()) as unknown
  if (!json || typeof json !== "object") {
    throw new Error("Invalid tide API response")
  }

  const body = json as { location?: unknown; days?: unknown[] }
  const days = (Array.isArray(body.days) ? body.days : [])
    .map((day) => normalizeDay(day))
    .filter((day): day is TideDaySummary => day !== null)

  const value: TideApiResponse = {
    location: typeof body.location === "string" ? body.location : "UNKNOWN",
    days,
  }

  tideCache = {
    value,
    expiresAt: now + CACHE_TTL_MS,
  }

  return value
}

export function buildTideWindows(
  days: TideDaySummary[],
  config?: Partial<TideRuleConfig>
): TideWindow[] {
  const rule = resolveConfig(config)
  const windows: TideWindow[] = []

  const sortedDays = [...days].sort((a, b) => a.date.localeCompare(b.date))

  for (const day of sortedDays) {
    const hourToHeight = new Map<number, number>()
    for (const row of day.hourly) {
      hourToHeight.set(row.hour, row.height)
    }

    const safeHours = new Set<number>()
    const safeRunByHour = new Map<number, string>()
    let runCounter = 0
    let currentRun: number[] = []

    const finalizeRun = () => {
      if (currentRun.length >= Math.max(1, rule.minConsecutiveSafeHours)) {
        const runId = `${day.date}-safe-run-${runCounter}`
        runCounter += 1
        for (const hour of currentRun) {
          safeHours.add(hour)
          safeRunByHour.set(hour, runId)
        }
      }
      currentRun = []
    }

    for (let hour = rule.workStartHour; hour <= rule.workEndHour; hour += 1) {
      const height = hourToHeight.get(hour) ?? 0
      const isCandidate = height >= rule.safeHeightThreshold
      if (isCandidate) {
        currentRun.push(hour)
      } else {
        finalizeRun()
      }
    }
    finalizeRun()

    for (let hour = 0; hour < 24; hour += 1) {
      const inWorkWindow = hour >= rule.workStartHour && hour <= rule.workEndHour
      const height = hourToHeight.get(hour) ?? 0
      let status: TideSafetyStatus = "CLOSED"

      if (inWorkWindow) {
        status = safeHours.has(hour) ? "SAFE" : "DANGER"
      }

      windows.push({
        date: day.date,
        hour,
        height,
        status,
        inWorkWindow,
        safeRunId: safeRunByHour.get(hour),
      })
    }
  }

  return windows
}

export function validateTaskSafety(
  task: TideTaskInput,
  windows: TideWindow[],
  config?: Partial<TideRuleConfig>
): TaskSafetyResult {
  const rule = resolveConfig(config)
  const buckets = enumerateHourlyBuckets(task.start, task.end)
  const windowsByHour = new Map<string, TideWindow>()
  for (const window of windows) {
    windowsByHour.set(toWindowKey(window.date, window.hour), window)
  }

  let coveredHours = 0
  let safeHours = 0
  let dangerHours = 0
  let closedHours = 0

  for (const bucket of buckets) {
    const date = toIsoDateUTC(bucket)
    const hour = bucket.getUTCHours()
    const window = windowsByHour.get(toWindowKey(date, hour))

    if (!window || window.status === "CLOSED") {
      if (hour < rule.workStartHour || hour > rule.workEndHour) {
        closedHours += 1
        continue
      }
      closedHours += 1
      continue
    }

    coveredHours += 1
    if (window.status === "SAFE") {
      safeHours += 1
    } else {
      dangerHours += 1
    }
  }

  let status: TideSafetyStatus
  let reasons: string[]

  if (coveredHours === 0) {
    status = "CLOSED"
    reasons = ["NO_WORK_WINDOW_HOURS"]
  } else if (dangerHours > 0) {
    status = "DANGER"
    reasons = ["HAS_DANGER_HOURS"]
  } else {
    status = "SAFE"
    reasons = ["ALL_WORK_WINDOW_HOURS_SAFE"]
  }

  return {
    taskId: task.id,
    status,
    coveredHours,
    safeHours,
    dangerHours,
    closedHours,
    reasons,
  }
}

export function summarizeTideCoverage(
  tasks: TideTaskInput[],
  windows: TideWindow[],
  config?: Partial<TideRuleConfig>
): { safe: number; danger: number; closed: number; total: number } {
  let safe = 0
  let danger = 0
  let closed = 0

  for (const task of tasks) {
    const result = validateTaskSafety(task, windows, config)
    if (result.status === "SAFE") safe += 1
    if (result.status === "DANGER") danger += 1
    if (result.status === "CLOSED") closed += 1
  }

  return {
    safe,
    danger,
    closed,
    total: tasks.length,
  }
}

export function findNearestSafeSlot(
  task: TideTaskInput,
  windows: TideWindow[],
  config?: Partial<TideRuleConfig>,
  searchHorizonHours = 24 * 14
): TideSafeSlotSuggestion | null {
  const currentSafety = validateTaskSafety(task, windows, config)
  if (currentSafety.status === "SAFE") {
    return {
      taskId: task.id,
      start: task.start,
      end: task.end,
      shiftHours: 0,
      safety: currentSafety,
    }
  }

  const horizon = Math.max(0, Math.floor(searchHorizonHours))
  for (let shiftHours = 1; shiftHours <= horizon; shiftHours += 1) {
    const candidate = shiftTaskByHours(task, shiftHours)
    const safety = validateTaskSafety(candidate, windows, config)
    if (safety.status === "SAFE") {
      return {
        taskId: task.id,
        start: candidate.start,
        end: candidate.end,
        shiftHours,
        safety,
      }
    }
  }

  return null
}

export function buildShiftDayWhatIf(
  task: TideTaskInput,
  windows: TideWindow[],
  shiftDays: number[] = [1, 2],
  config?: Partial<TideRuleConfig>
): TideShiftWhatIf[] {
  return shiftDays
    .filter((day) => Number.isFinite(day) && day > 0)
    .map((day) => {
      const candidate = shiftTaskByHours(task, day * 24)
      return {
        taskId: task.id,
        shiftDays: Math.floor(day),
        start: candidate.start,
        end: candidate.end,
        safety: validateTaskSafety(candidate, windows, config),
      }
    })
}
