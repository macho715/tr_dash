import { describe, expect, it } from "vitest";
import type { ScheduleActivity, ScheduleDependency } from "@/lib/ssot/schedule";
import { calculateFinishDate } from "@/lib/ssot/schedule";
import { simulateDependencyCascade } from "@/lib/ops/agi/dependency-cascade";

function makeActivity(
  id: string,
  start: string,
  duration: number,
  depends_on: ScheduleDependency[] = [],
  overrides: Partial<ScheduleActivity> = {}
): ScheduleActivity {
  return {
    activity_id: id,
    activity_name: id,
    level1: "Trip 1",
    level2: "L2",
    duration,
    planned_start: start,
    planned_finish: calculateFinishDate(start, duration),
    depends_on,
    ...overrides,
  };
}

function byId(activities: ScheduleActivity[], id: string): ScheduleActivity {
  const found = activities.find((activity) => activity.activity_id === id);
  if (!found) {
    throw new Error(`Activity not found: ${id}`);
  }
  return found;
}

describe("simulateDependencyCascade", () => {
  it("applies FS/SS/FF/SF with lagDays", () => {
    const activities: ScheduleActivity[] = [
      makeActivity("A", "2026-02-01", 2),
      makeActivity("B_FS", "2026-02-03", 1, [{ predecessorId: "A", type: "FS", lagDays: 1 }]),
      makeActivity("C_SS", "2026-02-03", 1, [{ predecessorId: "A", type: "SS", lagDays: 2 }]),
      makeActivity("D_FF", "2026-02-02", 3, [{ predecessorId: "A", type: "FF", lagDays: 1 }]),
      makeActivity("E_SF", "2026-02-02", 2, [{ predecessorId: "A", type: "SF", lagDays: 1 }]),
    ];

    const result = simulateDependencyCascade({
      activities,
      anchors: [{ activityId: "A", newStart: "2026-02-05" }],
      includeLocked: false,
      respectFreeze: true,
    });

    expect(byId(result.nextActivities, "A").planned_start).toBe("2026-02-05");
    expect(byId(result.nextActivities, "B_FS").planned_start).toBe("2026-02-07");
    expect(byId(result.nextActivities, "C_SS").planned_start).toBe("2026-02-07");
    expect(byId(result.nextActivities, "D_FF").planned_start).toBe("2026-02-05");
    expect(byId(result.nextActivities, "E_SF").planned_start).toBe("2026-02-05");
  });

  it("propagates cascading shifts through chain/branch/merge", () => {
    const activities: ScheduleActivity[] = [
      makeActivity("A", "2026-02-01", 2),
      makeActivity("B", "2026-02-03", 2, [{ predecessorId: "A", type: "FS", lagDays: 0 }]),
      makeActivity("C", "2026-02-05", 1, [{ predecessorId: "B", type: "FS", lagDays: 0 }]),
      makeActivity("D", "2026-02-03", 1, [{ predecessorId: "A", type: "FS", lagDays: 0 }]),
      makeActivity("E", "2026-02-06", 1, [
        { predecessorId: "C", type: "FS", lagDays: 0 },
        { predecessorId: "D", type: "FS", lagDays: 0 },
      ]),
    ];

    const result = simulateDependencyCascade({
      activities,
      anchors: [{ activityId: "A", newStart: "2026-02-06" }],
      includeLocked: false,
      respectFreeze: true,
    });

    expect(byId(result.nextActivities, "B").planned_start).toBe("2026-02-07");
    expect(byId(result.nextActivities, "C").planned_start).toBe("2026-02-08");
    expect(byId(result.nextActivities, "D").planned_start).toBe("2026-02-07");
    expect(byId(result.nextActivities, "E").planned_start).toBe("2026-02-08");
  });

  it("blocks frozen/locked activities and records violations", () => {
    const activities: ScheduleActivity[] = [
      makeActivity("A", "2026-02-01", 2),
      makeActivity(
        "B_FROZEN",
        "2026-02-03",
        1,
        [{ predecessorId: "A", type: "FS", lagDays: 0 }],
        { actual_start: "2026-02-03" }
      ),
      makeActivity(
        "C_LOCKED",
        "2026-02-03",
        1,
        [{ predecessorId: "A", type: "FS", lagDays: 0 }],
        { lock_level: "HARD" }
      ),
    ];

    const result = simulateDependencyCascade({
      activities,
      anchors: [{ activityId: "A", newStart: "2026-02-06" }],
      includeLocked: false,
      respectFreeze: true,
    });

    expect(byId(result.nextActivities, "B_FROZEN").planned_start).toBe("2026-02-03");
    expect(byId(result.nextActivities, "C_LOCKED").planned_start).toBe("2026-02-03");
    expect(result.violations).toHaveLength(2);
    expect(result.violations.some((violation) => violation.reason === "actual_frozen")).toBe(true);
    expect(result.violations.some((violation) => violation.reason === "hard_lock_or_pin")).toBe(true);
  });

  it("records missing predecessor as data_error and ignores edge", () => {
    const activities: ScheduleActivity[] = [
      makeActivity("A", "2026-02-01", 1),
      makeActivity("B", "2026-02-02", 1, [{ predecessorId: "MISSING", type: "FS", lagDays: 0 }]),
    ];

    const result = simulateDependencyCascade({
      activities,
      anchors: [{ activityId: "A", newStart: "2026-02-10" }],
      includeLocked: false,
      respectFreeze: true,
    });

    expect(byId(result.nextActivities, "B").planned_start).toBe("2026-02-02");
    expect(result.diagnostics.data_errors).toHaveLength(1);
    expect(result.diagnostics.data_errors[0].code).toBe("missing_predecessor");
  });

  it("is deterministic for identical inputs (10 runs)", () => {
    const activities: ScheduleActivity[] = [
      makeActivity("A", "2026-02-01", 2),
      makeActivity("B", "2026-02-03", 2, [{ predecessorId: "A", type: "FS", lagDays: 0 }]),
      makeActivity("C", "2026-02-05", 1, [{ predecessorId: "B", type: "FS", lagDays: 1 }]),
    ];

    const fingerprints = Array.from({ length: 10 }, () => {
      const result = simulateDependencyCascade({
        activities: JSON.parse(JSON.stringify(activities)) as ScheduleActivity[],
        anchors: [{ activityId: "A", newStart: "2026-02-06" }],
        includeLocked: false,
        respectFreeze: true,
      });
      return JSON.stringify({
        nextActivities: result.nextActivities,
        violations: result.violations,
        diagnostics: result.diagnostics,
      });
    });

    expect(new Set(fingerprints).size).toBe(1);
  });
});
