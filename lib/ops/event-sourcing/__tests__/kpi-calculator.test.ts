import { describe, it, expect } from "vitest"
import {
  calcCalendarKPI,
  calcHours,
  pairHoldResume,
} from "../kpi-calculator"
import type { Activity } from "@/src/types/ssot"
import type { EventLogItem } from "../types"

describe("KPI Calculator", () => {
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
      duration_min: 600,
      start_ts: null,
      end_ts: null,
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

  describe("Calendar Track KPI", () => {
    it("should calculate actual duration correctly", () => {
      const events: EventLogItem[] = [
        {
          event_id: "EVT-001",
          state: "START",
          ts: "2026-01-26T08:00:00+04:00",
        } as EventLogItem,
        {
          event_id: "EVT-002",
          state: "END",
          ts: "2026-01-26T18:00:00+04:00",
        } as EventLogItem,
      ]

      const kpi = calcCalendarKPI(mockActivity, events)

      expect(kpi.actual_duration_hr).toBe(10)
      expect(kpi.planned_duration_hr).toBe(10)
      expect(kpi.variance_hr).toBe(0)
    })

    it("should calculate positive variance (delay)", () => {
      const events: EventLogItem[] = [
        {
          event_id: "EVT-001",
          state: "START",
          ts: "2026-01-26T08:00:00+04:00",
        } as EventLogItem,
        {
          event_id: "EVT-002",
          state: "END",
          ts: "2026-01-26T20:00:00+04:00",
        } as EventLogItem,
      ]

      const kpi = calcCalendarKPI(mockActivity, events)

      expect(kpi.actual_duration_hr).toBe(12)
      expect(kpi.variance_hr).toBe(2)
    })

    it("should calculate negative variance (early completion)", () => {
      const events: EventLogItem[] = [
        {
          event_id: "EVT-001",
          state: "START",
          ts: "2026-01-26T08:00:00+04:00",
        } as EventLogItem,
        {
          event_id: "EVT-002",
          state: "END",
          ts: "2026-01-26T16:00:00+04:00",
        } as EventLogItem,
      ]

      const kpi = calcCalendarKPI(mockActivity, events)

      expect(kpi.actual_duration_hr).toBe(8)
      expect(kpi.variance_hr).toBe(-2)
    })
  })

  describe("Delay Calculation", () => {
    it("should calculate total delay from HOLD/RESUME pairs", () => {
      const events: EventLogItem[] = [
        {
          event_id: "EVT-001",
          state: "START",
          ts: "2026-01-26T08:00:00+04:00",
        } as EventLogItem,
        {
          event_id: "EVT-002",
          state: "HOLD",
          ts: "2026-01-26T10:00:00+04:00",
          reason_tag: "WEATHER",
        } as EventLogItem,
        {
          event_id: "EVT-003",
          state: "RESUME",
          ts: "2026-01-26T12:00:00+04:00",
        } as EventLogItem,
        {
          event_id: "EVT-004",
          state: "HOLD",
          ts: "2026-01-26T14:00:00+04:00",
          reason_tag: "PTW",
        } as EventLogItem,
        {
          event_id: "EVT-005",
          state: "RESUME",
          ts: "2026-01-26T15:00:00+04:00",
        } as EventLogItem,
        {
          event_id: "EVT-006",
          state: "END",
          ts: "2026-01-26T18:00:00+04:00",
        } as EventLogItem,
      ]

      const kpi = calcCalendarKPI(mockActivity, events)

      expect(kpi.delay_cal_hr).toBe(3)
      expect(kpi.delay_breakdown_hr.WEATHER).toBe(2)
      expect(kpi.delay_breakdown_hr.PTW).toBe(1)
    })

    it("should pair HOLD/RESUME correctly", () => {
      const holdResumeEvents: EventLogItem[] = [
        {
          event_id: "H1",
          state: "HOLD",
          ts: "2026-01-26T10:00:00+04:00",
          reason_tag: "WEATHER",
        } as EventLogItem,
        {
          event_id: "R1",
          state: "RESUME",
          ts: "2026-01-26T12:00:00+04:00",
        } as EventLogItem,
        {
          event_id: "H2",
          state: "HOLD",
          ts: "2026-01-26T14:00:00+04:00",
          reason_tag: "PTW",
        } as EventLogItem,
        {
          event_id: "R2",
          state: "RESUME",
          ts: "2026-01-26T15:00:00+04:00",
        } as EventLogItem,
      ]

      const pairs = pairHoldResume(holdResumeEvents)

      expect(pairs.length).toBe(2)
      expect(pairs[0].hold.event_id).toBe("H1")
      expect(pairs[0].resume.event_id).toBe("R1")
      expect(pairs[1].hold.event_id).toBe("H2")
      expect(pairs[1].resume.event_id).toBe("R2")
    })
  })

  describe("Hours Calculation", () => {
    it("should calculate hours difference correctly", () => {
      const hours = calcHours(
        "2026-01-26T08:00:00+04:00",
        "2026-01-26T18:00:00+04:00"
      )

      expect(hours).toBe(10)
    })

    it("should handle cross-day duration", () => {
      const hours = calcHours(
        "2026-01-26T20:00:00+04:00",
        "2026-01-27T08:00:00+04:00"
      )

      expect(hours).toBe(12)
    })
  })
})
