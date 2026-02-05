import { describe, it, expect } from "vitest"
import {
  resolveActivityIdByAlias,
  autoMatchActivityId,
  resolveActivityId,
} from "../activity-resolver"
import type { Activity } from "@/src/types/ssot"
import type { EventLogItem } from "../types"

describe("Activity Resolver", () => {
  const mockActivities = new Map<string, Activity>([
    [
      "A1000",
      {
        activity_id: "A1000",
        type_id: "mobilization",
        tr_ids: [],
        plan: { start_ts: "2026-01-26T00:00:00+04:00" } as any,
      } as Activity,
    ],
    [
      "A1100",
      {
        activity_id: "A1100",
        type_id: "loadin",
        tr_ids: ["TR_01"],
        plan: { start_ts: "2026-02-03T00:00:00+04:00" } as any,
      } as Activity,
    ],
  ])

  describe("Direct Matching", () => {
    it("should match existing activity_id directly", () => {
      const event: EventLogItem = {
        event_id: "EVT-001",
        activity_id: "A1000",
        phase: "MOBILIZATION",
        ts: "2026-01-26T08:00:00+04:00",
      } as EventLogItem

      const result = resolveActivityId(event, mockActivities)

      expect(result.resolvedId).toBe("A1000")
      expect(result.method).toBe("direct")
      expect(result.confidence).toBe(1.0)
    })
  })

  describe("Auto Matching", () => {
    it("should match by phase + date proximity", () => {
      const event: EventLogItem = {
        event_id: "EVT-002",
        activity_id: "A1103",
        phase: "LOADIN",
        tr_unit: "TR_01",
        ts: "2026-02-03T08:00:00+04:00",
      } as EventLogItem

      const result = autoMatchActivityId(event, mockActivities)

      expect(result.activityId).toBe("A1100")
      expect(result.confidence).toBeGreaterThan(0.7)
      expect(result.scores.phase_match).toBe(40)
      expect(result.scores.tr_match).toBe(30)
    })

    it("should fail to match when score < 70", () => {
      const event: EventLogItem = {
        event_id: "EVT-003",
        activity_id: "A9999",
        phase: "JACKDOWN",
        ts: "2026-03-01T00:00:00+04:00",
      } as EventLogItem

      const result = autoMatchActivityId(event, mockActivities)

      expect(result.activityId).toBeNull()
      expect(result.confidence).toBe(0)
    })
  })

  describe("Unlinked Events", () => {
    it("should return unlinked when no match found", () => {
      const event: EventLogItem = {
        event_id: "EVT-004",
        activity_id: "A9999",
        phase: "SAIL",
        ts: "2027-01-01T00:00:00+04:00",
      } as EventLogItem

      const result = resolveActivityId(event, mockActivities)

      expect(result.resolvedId).toBeNull()
      expect(result.method).toBe("unlinked")
      expect(result.confidence).toBe(0)
    })
  })

  describe("Alias Mapping", () => {
    it("should return same id when alias missing", () => {
      const result = resolveActivityIdByAlias("A1234")
      expect(result).toBe("A1234")
    })
  })
})
