import { describe, it, expect } from "vitest"
import { runPipelineCheck } from "../pipeline-check"
import type { ScheduleActivity } from "@/lib/ssot/schedule"

describe("runPipelineCheck (patchmain #13)", () => {
  it("returns array for empty input (no throw)", () => {
    const out = runPipelineCheck({})
    expect(Array.isArray(out)).toBe(true)
    expect(out.length).toBeGreaterThan(0)
  })

  it("returns array for null/undefined activities", () => {
    const out = runPipelineCheck({
      activities: null,
      noticeDate: "2026-01-26",
      weatherDaysCount: 4,
      projectEndDate: "2026-03-24",
    })
    expect(Array.isArray(out)).toBe(true)
  })

  it("returns array for empty activities", () => {
    const out = runPipelineCheck({
      activities: [],
      noticeDate: "2026-01-26",
      weatherDaysCount: 4,
    })
    expect(Array.isArray(out)).toBe(true)
  })

  it("includes NOTICE_DATE, WEATHER_4DAY, SCHEDULE_INVARIANTS, RESOURCE_CONFLICTS, KPI items", () => {
    const out = runPipelineCheck({
      activities: [],
      noticeDate: "",
      weatherDaysCount: 0,
    })
    const ids = out.map((x) => x.id)
    expect(ids).toContain("NOTICE_DATE")
    expect(ids).toContain("WEATHER_4DAY")
    expect(ids).toContain("SCHEDULE_INVARIANTS")
    expect(ids).toContain("RESOURCE_CONFLICTS")
    expect(ids).toContain("KPI_TOTAL_DAYS")
    expect(ids).toContain("KPI_SPMT_SET")
  })

  it("with valid activities returns PASS for consistent schedule", () => {
    const activities: ScheduleActivity[] = [
      {
        activity_id: "A1",
        activity_name: "Test",
        level1: "MOB",
        level2: null,
        duration: 1,
        planned_start: "2026-01-26",
        planned_finish: "2026-01-26",
      },
    ]
    const out = runPipelineCheck({
      activities,
      noticeDate: "2026-01-26",
      weatherDaysCount: 4,
      projectEndDate: "2026-03-24",
    })
    const inv = out.find((x) => x.id === "SCHEDULE_INVARIANTS")
    expect(inv?.status).toBe("PASS")
  })
})
