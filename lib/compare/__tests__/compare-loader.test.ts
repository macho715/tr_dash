/**
 * Phase 10 T10.3: Compare mode tests
 */

import { describe, it, expect } from "vitest"
import { calculateDelta } from "../compare-loader"
import type { ScheduleActivity } from "@/lib/ssot/schedule"

function makeActivity(
  id: string,
  start: string,
  finish: string
): ScheduleActivity {
  return {
    activity_id: id,
    activity_name: id,
    level1: "L1",
    level2: "L2",
    duration: 1,
    planned_start: start,
    planned_finish: finish,
  }
}

describe("compare-loader (T10.3)", () => {
  it("calculates delta correctly: added activity", () => {
    const baseline = [makeActivity("A1000", "2026-02-01", "2026-02-02")]
    const compare = [
      makeActivity("A1000", "2026-02-01", "2026-02-02"),
      makeActivity("A1001", "2026-02-03", "2026-02-04"),
    ]

    const result = calculateDelta(baseline, compare)

    expect(result.added).toHaveLength(1)
    expect(result.added[0].activity_id).toBe("A1001")
    expect(result.removed).toHaveLength(0)
    expect(result.changed).toHaveLength(0)
    expect(result.summary.addedCount).toBe(1)
  })

  it("calculates delta correctly: removed activity", () => {
    const baseline = [
      makeActivity("A1000", "2026-02-01", "2026-02-02"),
      makeActivity("A1001", "2026-02-03", "2026-02-04"),
    ]
    const compare = [makeActivity("A1000", "2026-02-01", "2026-02-02")]

    const result = calculateDelta(baseline, compare)

    expect(result.removed).toHaveLength(1)
    expect(result.removed[0].activity_id).toBe("A1001")
    expect(result.added).toHaveLength(0)
    expect(result.changed).toHaveLength(0)
    expect(result.summary.removedCount).toBe(1)
  })

  it("calculates delta correctly: changed activity (shifted)", () => {
    const baseline = [makeActivity("A1000", "2026-02-01", "2026-02-02")]
    const compare = [makeActivity("A1000", "2026-02-03", "2026-02-04")]

    const result = calculateDelta(baseline, compare)

    expect(result.changed).toHaveLength(1)
    expect(result.changed[0].activity_id).toBe("A1000")
    expect(result.changed[0].startDiff).toEqual({
      from: "2026-02-01",
      to: "2026-02-03",
    })
    expect(result.summary.changedCount).toBe(1)
    expect(result.summary.totalShifted).toBe(1)
  })

  it("returns empty delta when baseline and compare are identical", () => {
    const activities = [
      makeActivity("A1000", "2026-02-01", "2026-02-02"),
      makeActivity("A1001", "2026-02-03", "2026-02-04"),
    ]

    const result = calculateDelta(activities, activities)

    expect(result.added).toHaveLength(0)
    expect(result.removed).toHaveLength(0)
    expect(result.changed).toHaveLength(0)
    expect(result.summary.addedCount).toBe(0)
    expect(result.summary.removedCount).toBe(0)
    expect(result.summary.changedCount).toBe(0)
  })


  it("builds compare KPI snapshot with delay/collision/evidence signals", () => {
    const baseline = [makeActivity("A1000", "2026-02-01", "2026-02-02")]
    const compare = [makeActivity("A1000", "2026-02-01", "2026-02-03")]

    const result = calculateDelta(baseline, compare, 2, 4, {
      baselineConflictBySeverity: { error: 1, warn: 1 },
      compareConflictBySeverity: { error: 2, warn: 2 },
      asOf: "2026-02-04T10:00:00.000Z",
    })

    expect(result.kpis.totalDelayMinutes.delta).toBe(1440)
    expect(result.kpis.collisionCountBySeverity.error.delta).toBe(1)
    expect(result.kpis.collisionCountBySeverity.warn.delta).toBe(1)
    expect(result.kpis.evidenceRiskCount.delta).toBe(1)
    expect(result.kpis.drilldownActivityIds.evidenceRiskCount).toEqual(["A1000"])
    expect(result.kpis.asOf).toBe("2026-02-04T10:00:00.000Z")
  })
})
