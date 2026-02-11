import { describe, expect, it } from "vitest"
import { getCollisionHeadline, mapSsotCollisionToScheduleConflict } from "@/src/lib/collision-card"
import type { Collision } from "@/src/types/ssot"

describe("collision-card mapping", () => {
  it("maps SSOT collision fields for unified card", () => {
    const collision: Collision = {
      collision_id: "COL_101",
      kind: "resource_overallocated",
      severity: "blocking",
      status: "open",
      trip_id: "TRIP_1",
      activity_ids: ["A100", "A200"],
      resource_ids: ["SPMT_1"],
      rule_refs: ["RULE_1"],
      message: "Resource overallocated",
      details: {
        root_cause_code: "PTW_MISSING",
        time_range: { start: "2026-02-10T00:00:00Z", end: "2026-02-10T06:00:00Z" },
      },
      suggested_actions: [
        {
          action_id: "ACT_1",
          kind: "shift_activity",
          label: "Shift A100",
          params: { activity_id: "A100", new_start: "2026-02-11" },
        },
      ],
    }

    const mapped = mapSsotCollisionToScheduleConflict(collision)

    expect(mapped.collision_id).toBe("COL_101")
    expect(mapped.kind).toBe("resource_overallocated")
    expect(mapped.type).toBe("RESOURCE")
    expect(mapped.severity).toBe("error")
    expect(mapped.activity_ids).toEqual(["A100", "A200"])
    expect(mapped.resource_ids).toEqual(["SPMT_1"])
    expect(mapped.time_range).toEqual({
      start: "2026-02-10T00:00:00Z",
      end: "2026-02-10T06:00:00Z",
    })
    expect(getCollisionHeadline(mapped)).toBe("PTW 미확보로 시작 불가")
  })
})
