import { describe, it, expect } from "vitest"
import { reflowSchedule } from "@/lib/utils/schedule-reflow"
import type { ScheduleActivity } from "@/lib/ssot/schedule"

function makeActivities(): ScheduleActivity[] {
  return [
    {
      activity_id: "A",
      activity_name: "Anchor",
      level1: "Trip 1",
      level2: "Ops",
      duration: 1,
      planned_start: "2026-01-01",
      planned_finish: "2026-01-01",
    },
    {
      activity_id: "B",
      activity_name: "Frozen by actual",
      level1: "Trip 1",
      level2: "Ops",
      duration: 1,
      planned_start: "2026-01-02",
      planned_finish: "2026-01-02",
      actual_start: "2026-01-02",
    },
    {
      activity_id: "C",
      activity_name: "Hard lock",
      level1: "Trip 1",
      level2: "Ops",
      duration: 1,
      planned_start: "2026-01-03",
      planned_finish: "2026-01-03",
      lock_level: "HARD",
    },
    {
      activity_id: "D",
      activity_name: "Hard pin",
      level1: "Trip 1",
      level2: "Ops",
      duration: 1,
      planned_start: "2026-01-04",
      planned_finish: "2026-01-04",
      reflow_pins: [{ strength: "HARD" }],
    },
  ]
}

describe("reflowSchedule freeze/lock violations", () => {
  it("collects violations for actual freeze and hard lock/pin move attempts", () => {
    const result = reflowSchedule(makeActivities(), "A", "2026-01-05", {
      respectLocks: false,
      checkResourceConflicts: false,
    })

    expect(result.impact_report.freeze_lock_violations).toEqual([
      {
        activity_id: "B",
        old_start: "2026-01-02",
        new_start: "2026-01-06",
        reason: "actual_frozen",
        reason_label: "actual.start/end 존재 activity 이동 시도",
      },
      {
        activity_id: "C",
        old_start: "2026-01-03",
        new_start: "2026-01-07",
        reason: "hard_lock_or_pin",
        reason_label: "lock_level=HARD 또는 pin=HARD 자동 조정 시도",
      },
      {
        activity_id: "D",
        old_start: "2026-01-04",
        new_start: "2026-01-08",
        reason: "hard_lock_or_pin",
        reason_label: "lock_level=HARD 또는 pin=HARD 자동 조정 시도",
      },
    ])
  })
})
