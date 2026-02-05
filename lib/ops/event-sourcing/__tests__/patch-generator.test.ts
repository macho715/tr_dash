import { describe, it, expect } from "vitest"
import {
  generatePatchesForEvent,
  validatePatches,
  generatePatchStatistics,
} from "../patch-generator"
import type { Activity } from "@/src/types/ssot"
import type { EventLogItem, JsonPatchOp } from "../types"

describe("Patch Generator", () => {
  const mockActivity: Activity = {
    activity_id: "A1000",
    type_id: "mobilization",
    trip_id: "PREP_MZP",
    tr_ids: [],
    title: "Mobilization",
    state: "planned",
    lock_level: "none",
    blocker_code: null,
    evidence_required: [],
    evidence_ids: [],
    reflow_pins: [],
    plan: {
      start_ts: "2026-01-26T00:00:00+04:00",
      end_ts: "2026-01-26T23:59:59+04:00",
      duration_min: 1440,
      duration_mode: "elapsed",
      location: {
        from_location_id: "",
        to_location_id: "",
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
      reflow: {
        last_preview_run_id: null,
        last_apply_run_id: null,
      },
    },
  }

  describe("START Event -> Patch", () => {
    it("should generate patches for START event", () => {
      const event: EventLogItem = {
        event_id: "EVT-001",
        state: "START",
        ts: "2026-01-26T08:00:00+04:00",
        activity_id: "A1000",
      } as EventLogItem

      const patches = generatePatchesForEvent(event, "A1000", mockActivity)

      expect(patches).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            op: "replace",
            path: "/entities/activities/A1000/actual/start_ts",
            value: "2026-01-26T08:00:00+04:00",
          }),
          expect.objectContaining({
            op: "replace",
            path: "/entities/activities/A1000/state",
            value: "in_progress",
          }),
        ])
      )
    })
  })

  describe("END Event -> Patch", () => {
    it("should generate patches for END event", () => {
      const event: EventLogItem = {
        event_id: "EVT-002",
        state: "END",
        ts: "2026-01-26T18:00:00+04:00",
        activity_id: "A1000",
      } as EventLogItem

      const patches = generatePatchesForEvent(event, "A1000", mockActivity)

      expect(patches).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: "/entities/activities/A1000/actual/end_ts",
            value: "2026-01-26T18:00:00+04:00",
          }),
          expect.objectContaining({
            path: "/entities/activities/A1000/actual/progress_pct",
            value: 100,
          }),
          expect.objectContaining({
            path: "/entities/activities/A1000/state",
            value: "done",
          }),
        ])
      )
    })
  })

  describe("HOLD Event -> Patch", () => {
    it("should generate patches for HOLD event with reason_tag", () => {
      const event: EventLogItem = {
        event_id: "EVT-003",
        state: "HOLD",
        ts: "2026-01-26T14:00:00+04:00",
        activity_id: "A1000",
        reason_tag: "WEATHER",
        note: "High winds",
      } as EventLogItem

      const patches = generatePatchesForEvent(event, "A1000", mockActivity)

      expect(patches).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: "/entities/activities/A1000/state",
            value: "blocked",
          }),
          expect.objectContaining({
            path: "/entities/activities/A1000/blocker_code",
            value: "WEATHER",
          }),
          expect.objectContaining({
            path: "/entities/activities/A1000/blocker_detail",
            value: expect.objectContaining({
              hold_start_ts: "2026-01-26T14:00:00+04:00",
              reason: "High winds",
            }),
          }),
        ])
      )
    })
  })

  describe("MILESTONE Event -> Patch", () => {
    it("should add MILESTONE to history_events, not duration", () => {
      const event: EventLogItem = {
        event_id: "EVT-004",
        state: "ARRIVE",
        event_type: "MILESTONE",
        phase: "BERTHING",
        ts: "2026-02-03T12:00:00+04:00",
        activity_id: "A1100",
      } as EventLogItem

      const patches = generatePatchesForEvent(event, "A1100", mockActivity)

      const historyPatch = patches.find((p) => p.path.includes("/history_events"))
      expect(historyPatch).toBeDefined()

      const actualPatch = patches.find(
        (p) => p.path.includes("/actual/start_ts") || p.path.includes("/actual/end_ts")
      )
      expect(actualPatch).toBeUndefined()
    })
  })

  describe("Plan Protection", () => {
    it("should reject patches that modify plan.*", () => {
      const forbiddenPatches: JsonPatchOp[] = [
        {
          op: "replace",
          path: "/entities/activities/A1000/plan/start_ts",
          value: "2026-01-27T00:00:00+04:00",
        },
        {
          op: "replace",
          path: "/entities/activities/A1000/plan/duration_min",
          value: 720,
        },
      ]

      const validation = validatePatches(forbiddenPatches)

      expect(validation.valid).toBe(false)
      expect(validation.errors.length).toBeGreaterThan(0)
      expect(validation.errors[0].code).toBe("FORBIDDEN_PLAN_MODIFICATION")
      expect(validation.forbidden_paths.length).toBe(2)
    })

    it("should allow patches that modify actual.*", () => {
      const allowedPatches: JsonPatchOp[] = [
        {
          op: "replace",
          path: "/entities/activities/A1000/actual/start_ts",
          value: "2026-01-26T08:00:00+04:00",
        },
        {
          op: "replace",
          path: "/entities/activities/A1000/state",
          value: "in_progress",
        },
      ]

      const validation = validatePatches(allowedPatches)

      expect(validation.valid).toBe(true)
      expect(validation.errors.length).toBe(0)
    })
  })

  describe("Statistics", () => {
    it("should generate correct patch statistics", () => {
      const patches: JsonPatchOp[] = [
        { op: "add", path: "/entities/activities/A1000/actual/start_ts", value: "x" },
        { op: "replace", path: "/entities/activities/A1000/state", value: "y" },
        { op: "add", path: "/entities/activities/A1100/actual/end_ts", value: "z" },
      ]

      const stats = generatePatchStatistics(patches)

      expect(stats.total).toBe(3)
      expect(stats.by_operation.add).toBe(2)
      expect(stats.by_operation.replace).toBe(1)
      expect(stats.affected_activities.size).toBe(2)
      expect(stats.affected_activities.has("A1000")).toBe(true)
      expect(stats.affected_activities.has("A1100")).toBe(true)
    })
  })
})
