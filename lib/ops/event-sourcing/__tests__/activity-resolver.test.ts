import { describe, it, expect } from "vitest"
import {
  resolveActivityIdByAlias,
  autoMatchActivityId,
  resolveActivityId,
} from "../activity-resolver"
import type { Activity } from "@/src/types/ssot"
import type { EventLogItem } from "../types"

describe("Activity Resolver", () => {
  const baseActivity: Activity = {
    activity_id: "A0000",
    type_id: "generic",
    trip_id: "TRIP_TEST",
    tr_ids: [],
    title: "Test Activity",
    state: "planned",
    lock_level: "none",
    blocker_code: "none",
    evidence_required: [],
    evidence_ids: [],
    reflow_pins: [],
    plan: {
      start_ts: "2026-01-01T00:00:00+04:00",
      end_ts: "2026-01-01T12:00:00+04:00",
      duration_min: 720,
      duration_mode: "elapsed",
      location: {
        from_location_id: "LOC_A",
        to_location_id: "LOC_B",
        route_id: null,
        geo_fence_ids: [],
      },
      dependencies: [],
      resources: [],
      constraints: [],
      notes: "",
    },
    actual: {
      start_ts: null,
      end_ts: null,
      progress_pct: 0,
      location_override: null,
      resource_assignments: [],
      notes: "",
    },
    calc: {
      es_ts: null,
      ef_ts: null,
      ls_ts: null,
      lf_ts: null,
      slack_min: null,
      critical_path: false,
      collision_ids: [],
      collision_severity_max: null,
      risk_score: 0,
      predicted_end_ts: null,
      reflow: { last_preview_run_id: null, last_apply_run_id: null },
    },
  }

  const mockActivities = new Map<string, Activity>([
    [
      "A1000",
      {
        ...baseActivity,
        activity_id: "A1000",
        type_id: "mobilization",
        title: "Mobilization",
        plan: {
          ...baseActivity.plan,
          start_ts: "2026-01-26T00:00:00+04:00",
        },
      },
    ],
    [
      "A1100",
      {
        ...baseActivity,
        activity_id: "A1100",
        type_id: "loadin",
        title: "Load-in",
        tr_ids: ["TR_01"],
        plan: {
          ...baseActivity.plan,
          start_ts: "2026-02-03T00:00:00+04:00",
        },
      },
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
