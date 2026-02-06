import { describe, it, expect } from "vitest"
import { activityToEnhancedGanttItems } from "../event-sourcing-mapper"
import type { ScheduleActivity } from "@/lib/ssot/schedule"
import type { EventLogItem } from "@/lib/ops/event-sourcing/types"

describe("Gantt Chart - Event Sourcing Integration", () => {
  const mockActivity: ScheduleActivity = {
    activity_id: "A1000",
    activity_name: "Test Activity",
    level1: "Phase 1",
    level2: "Loadout",
    duration: 1,
    planned_start: "2026-01-26",
    planned_finish: "2026-01-27",
    anchor_type: "LOADOUT",
  }

  describe("Phase 1: Plan Only", () => {
    it("should render plan bar only", () => {
      const items = activityToEnhancedGanttItems(
        mockActivity,
        [],
        "group_0",
        { showPlan: true, showActual: false }
      )

      expect(items.length).toBe(1)
      expect(items[0].id).toBe("A1000")
      expect(items[0].className).toContain("plan-bar")
    })
  })

  describe("Phase 2: Plan + Actual", () => {
    it("should render both plan and actual bars", () => {
      const events: EventLogItem[] = [
        {
          event_id: "E1",
          state: "START",
          ts: "2026-01-26T08:00:00+04:00",
          activity_id: "A1000",
        } as EventLogItem,
        {
          event_id: "E2",
          state: "END",
          ts: "2026-01-26T18:00:00+04:00",
          activity_id: "A1000",
        } as EventLogItem,
      ]

      const items = activityToEnhancedGanttItems(
        mockActivity,
        events,
        "group_0",
        { showPlan: true, showActual: true }
      )

      expect(items.length).toBe(2)
      const planBar = items.find((item) => item.id === "A1000")
      const actualBar = items.find((item) => item.id === "actual__A1000")
      expect(planBar).toBeDefined()
      expect(actualBar).toBeDefined()
      expect(actualBar?.className).toContain("actual-bar")
    })

    it("should mark variance with correct class", () => {
      const events: EventLogItem[] = [
        {
          event_id: "E1",
          state: "START",
          ts: "2026-01-26T08:00:00+04:00",
          activity_id: "A1000",
        } as EventLogItem,
        {
          event_id: "E2",
          state: "END",
          ts: "2026-01-27T20:00:00+04:00",
          activity_id: "A1000",
        } as EventLogItem,
      ]

      const items = activityToEnhancedGanttItems(
        mockActivity,
        events,
        "group_0",
        { showActual: true }
      )

      const actualBar = items.find((item) => item.id === "actual__A1000")
      expect(actualBar?.className).toContain("variance-positive")
    })
  })

  describe("Phase 3: HOLD Periods", () => {
    it("should render HOLD periods as background bars", () => {
      const events: EventLogItem[] = [
        {
          event_id: "E1",
          state: "START",
          ts: "2026-01-26T08:00:00+04:00",
          activity_id: "A1000",
        } as EventLogItem,
        {
          event_id: "E2",
          state: "HOLD",
          ts: "2026-01-26T10:00:00+04:00",
          reason_tag: "WEATHER",
          activity_id: "A1000",
        } as EventLogItem,
        {
          event_id: "E3",
          state: "RESUME",
          ts: "2026-01-26T12:00:00+04:00",
          activity_id: "A1000",
        } as EventLogItem,
      ]

      const items = activityToEnhancedGanttItems(
        mockActivity,
        events,
        "group_0",
        { showHold: true }
      )

      const holdBar = items.find((item) => item.id.includes("hold__A1000"))
      expect(holdBar).toBeDefined()
      expect(holdBar?.type).toBe("background")
      expect(holdBar?.className).toContain("hold-weather")
    })
  })

  describe("Phase 3: Milestones", () => {
    it("should render milestone markers as points", () => {
      const events: EventLogItem[] = [
        {
          event_id: "E1",
          state: "ARRIVE",
          event_type: "MILESTONE",
          phase: "BERTHING",
          ts: "2026-02-03T12:00:00+04:00",
          activity_id: "A1000",
        } as EventLogItem,
      ]

      const items = activityToEnhancedGanttItems(
        mockActivity,
        events,
        "group_0",
        { showMilestone: true }
      )

      const milestone = items.find((item) => item.id.includes("milestone__A1000"))
      expect(milestone).toBeDefined()
      expect(milestone?.type).toBe("point")
      expect(milestone?.className).toContain("milestone-arrive")
    })
  })
})
