import { describe, expect, it } from "vitest"
import fixture from "../../../tests/fixtures/option_c_minimal.json"
import type { OptionC } from "@/src/types/ssot"
import { generateTripReport, tripReportToMarkdown } from "../trip-report"

describe("trip-report", () => {
  it("includes compare KPI summary in exported report", () => {
    const ssot = fixture as unknown as OptionC
    const tripId = Object.keys(ssot.entities.trips)[0]

    const report = generateTripReport(tripId, null, ssot)

    expect(report.compare_kpi_summary).toBeDefined()
    expect(report.compare_kpi_summary?.total_delay_minutes).toBeDefined()
    expect(report.compare_kpi_summary?.collision_count_by_severity.blocking.compare).toBeTypeOf("number")
  })

  it("renders compare KPI summary in markdown export", () => {
    const ssot = fixture as unknown as OptionC
    const tripId = Object.keys(ssot.entities.trips)[0]

    const report = generateTripReport(tripId, null, ssot)
    const md = tripReportToMarkdown(report)

    expect(md).toContain("## Compare KPI Summary")
    expect(md).toContain("As-of:")
  })
})
