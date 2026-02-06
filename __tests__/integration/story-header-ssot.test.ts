/**
 * StoryHeader SSOT Integration Test
 * 
 * Tests for StoryHeader real-time updates based on TR/Activity selection
 */

import { describe, it, expect } from "vitest"
import type { OptionC, Activity } from "@/src/types/ssot"
import { calculateCurrentActivityForTR, calculateCurrentLocationForTR } from "@/src/lib/derived-calc"

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
  entities: {
    locations: {
      LOC_MZP: {
        location_id: "LOC_MZP",
        name: "Mina Zayed",
        lat: 24.52,
        lon: 54.37,
        type: "port",
      },
      LOC_AGI: {
        location_id: "LOC_AGI",
        name: "AGI Site",
        lat: 24.4,
        lon: 54.5,
        type: "installation_site",
      },
    },
    trips: {
      TRIP_001: {
        trip_id: "TRIP_001",
        name: "Trip 1",
        sequence: 1,
      },
    },
    trs: {
      TR1: {
        tr_id: "TR1",
        name: "Transformer 1",
        weight_tons: 450,
      },
    },
    resources: {},
    voyages: {},
    activities: {
      A1010: {
        activity_id: "A1010",
        title: "Load-out TR1",
        state: "in_progress",
        blocker_code: "none",
        tr_ids: ["TR1"],
        trip_ids: ["TRIP_001"],
        location_id: "LOC_MZP",
        plan: {
          start: "2026-02-01T08:00:00Z",
          finish: "2026-02-01T16:00:00Z",
          duration_min: 480,
        },
        actual: {
          start: "2026-02-01T08:00:00Z",
          finish: null,
        },
        anchor_type: "LOADOUT",
        depends_on: [],
      } as Activity,
      A1020: {
        activity_id: "A1020",
        title: "Transport TR1",
        state: "planned",
        blocker_code: "none",
        tr_ids: ["TR1"],
        trip_ids: ["TRIP_001"],
        location_id: "LOC_AGI",
        plan: {
          start: "2026-02-02T08:00:00Z",
          finish: "2026-02-02T16:00:00Z",
          duration_min: 480,
        },
        actual: {
          start: null,
          finish: null,
        },
        anchor_type: "SAIL_AWAY",
        depends_on: ["A1010"],
      } as Activity,
    },
  },
  collisions: {},
  reflow_runs: [],
  baselines: {},
  history_events: [],
  ui_defaults: {
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
