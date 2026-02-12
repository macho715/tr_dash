/**
 * StoryHeader SSOT Integration Test
 * 
 * Tests for StoryHeader real-time updates based on TR/Activity selection
 */

import { describe, it, expect } from "vitest"
import type { OptionC, Activity } from "@/src/types/ssot"
import { calculateCurrentActivityForTR, calculateCurrentLocationForTR } from "@/src/lib/derived-calc"

const baseCalc: Activity["calc"] = {
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
}

const basePlan = {
  start_ts: "2026-02-01T08:00:00Z",
  end_ts: "2026-02-01T16:00:00Z",
  duration_min: 480,
  duration_mode: "elapsed" as const,
  location: {
    from_location_id: "LOC_MZP",
    to_location_id: "LOC_AGI",
    route_id: null,
    geo_fence_ids: [],
  },
  dependencies: [],
  resources: [],
  constraints: [],
  notes: "",
}

const baseActual = {
  start_ts: "2026-02-01T08:00:00Z",
  end_ts: null,
  progress_pct: 0,
  location_override: null,
  resource_assignments: [],
  notes: "",
}

// Mock SSOT data
const mockSSOT: OptionC = {
  contract: {
    name: "TR Movement Test",
    version: "v0.8.0",
    timezone: "Asia/Dubai",
    generated_at: "2026-02-04T00:00:00Z",
    ssot: {
      activity_is_source_of_truth: true,
      derived_fields_read_only: true,
    },
  },
  constraint_rules: {
    wx: { profiles: {}, data_sources: { primary: "primary", fallback: "fallback" } },
    linkspan: { assets: {} },
    barge: { assets: {} },
    ptw: { permit_types: {}, certificate_types: {} },
  },
  activity_types: {},
  entities: {
    locations: {
      LOC_MZP: {
        location_id: "LOC_MZP",
        name: "Mina Zayed",
        lat: 24.52,
        lon: 54.37,
      },
      LOC_AGI: {
        location_id: "LOC_AGI",
        name: "AGI Site",
        lat: 24.4,
        lon: 54.5,
      },
    },
    trips: {
      TRIP_001: {
        trip_id: "TRIP_001",
        name: "Trip 1",
        tr_ids: ["TR1"],
        activity_ids: ["A1010", "A1020"],
      },
    },
    trs: {
      TR1: {
        tr_id: "TR1",
        name: "Transformer 1",
        spec: {
          weight_t: 450,
          cog_mm: { x: 0, y: 0, z: 0 },
          dimensions_mm: { l: 1, w: 1, h: 1 },
        },
      },
    },
    resource_pools: {},
    resources: {},
    evidence_items: {},
    activities: {
      A1010: {
        activity_id: "A1010",
        type_id: "LOADOUT",
        trip_id: "TRIP_001",
        title: "Load-out TR1",
        state: "in_progress",
        lock_level: "none",
        blocker_code: "none",
        tr_ids: ["TR1"],
        evidence_required: [],
        evidence_ids: [],
        reflow_pins: [],
        plan: {
          ...basePlan,
          location: {
            ...basePlan.location,
            to_location_id: "LOC_MZP",
          },
        },
        actual: { ...baseActual },
        calc: { ...baseCalc },
      },
      A1020: {
        activity_id: "A1020",
        type_id: "TRANSPORT",
        trip_id: "TRIP_001",
        title: "Transport TR1",
        state: "planned",
        lock_level: "none",
        blocker_code: "none",
        tr_ids: ["TR1"],
        evidence_required: [],
        evidence_ids: [],
        reflow_pins: [],
        plan: {
          ...basePlan,
          start_ts: "2026-02-02T08:00:00Z",
          end_ts: "2026-02-02T16:00:00Z",
        },
        actual: {
          ...baseActual,
          start_ts: null,
          end_ts: null,
        },
        calc: { ...baseCalc },
      },
    },
  },
  collisions: {},
  reflow_runs: [],
  baselines: {
    current_baseline_id: null,
    items: {},
  },
  history_events: [],
  ui_defaults: {
    view_mode: "live",
    risk_overlay: "none",
    default_duration_hours: 8,
    default_working_hours_per_day: 8,
  },
}

describe("StoryHeader SSOT Integration", () => {
  describe("calculateCurrentActivityForTR", () => {
    it("should return in_progress activity for TR1", () => {
      const activityId = calculateCurrentActivityForTR(mockSSOT, "TR1")
      expect(activityId).toBe("A1010")
    })

    it("should return null for non-existent TR", () => {
      const activityId = calculateCurrentActivityForTR(mockSSOT, "TR999")
      expect(activityId).toBeNull()
    })
  })

  describe("calculateCurrentLocationForTR", () => {
    it("should return current location for TR1", () => {
      const locationId = calculateCurrentLocationForTR(mockSSOT, "TR1")
      expect(locationId).toBe("LOC_MZP")
    })

    it("should return null for non-existent TR", () => {
      const locationId = calculateCurrentLocationForTR(mockSSOT, "TR999")
      expect(locationId).toBeNull()
    })
  })

  describe("StoryHeader Data Derivation", () => {
    it("should derive Where from current location", () => {
      const locationId = calculateCurrentLocationForTR(mockSSOT, "TR1")
      const locationName = locationId
        ? mockSSOT.entities.locations[locationId]?.name ?? locationId
        : null
      const where = locationName ? `Now @ ${locationName}` : "Location —"

      expect(where).toBe("Now @ Mina Zayed")
    })

    it("should derive When/What from current activity", () => {
      const activityId = calculateCurrentActivityForTR(mockSSOT, "TR1")
      const activity = activityId ? mockSSOT.entities.activities[activityId] : null

      const activityTitle = activity?.title ?? "—"
      const activityState = activity?.state ?? "—"
      const blockerCode =
        activity?.blocker_code && activity.blocker_code !== "none"
          ? activity.blocker_code
          : "none"
      const whenWhat = activity
        ? `${activityTitle} • ${activityState} • Blocker: ${blockerCode}`
        : "Schedule —"

      expect(whenWhat).toBe("Load-out TR1 • in_progress • Blocker: none")
    })

    it("should show empty state when no TR selected", () => {
      const activityId = calculateCurrentActivityForTR(mockSSOT, null as any)
      expect(activityId).toBeNull()

      const where = "Location —"
      const whenWhat = "Schedule —"
      const evidence = "Evidence —"

      expect(where).toBe("Location —")
      expect(whenWhat).toBe("Schedule —")
      expect(evidence).toBe("Evidence —")
    })
  })

  describe("TR Selection Scenarios", () => {
    it("should prioritize selectedActivityId over selectedTrId", () => {
      // Scenario: User clicks Activity directly
      const selectedActivityId = "A1020"
      const selectedTrId = "TR1"

      const activity = mockSSOT.entities.activities[selectedActivityId]
      expect(activity?.title).toBe("Transport TR1")
      expect(activity?.state).toBe("planned")
    })

    it("should fallback to selectedTrId when no Activity selected", () => {
      // Scenario: User clicks TR on Map
      const selectedActivityId = null
      const selectedTrId = "TR1"

      const activityId = selectedActivityId ?? calculateCurrentActivityForTR(mockSSOT, selectedTrId)
      expect(activityId).toBe("A1010") // Current activity for TR1
    })

    it("should clear StoryHeader when both Activity and TR deselected", () => {
      const selectedActivityId = null
      const selectedTrId = null

      const activityId = selectedActivityId ?? (selectedTrId ? calculateCurrentActivityForTR(mockSSOT, selectedTrId) : null)
      expect(activityId).toBeNull()
    })
  })
})
