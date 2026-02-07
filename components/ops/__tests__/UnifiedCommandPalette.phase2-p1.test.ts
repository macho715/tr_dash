import { describe, it, expect } from "vitest";

describe("Phase 2 P1: Natural Language Extensions", () => {
  describe("Pattern: move loadout forward/back X days", () => {
    it("should parse 'move loadout forward 5 days'", () => {
      const query = "move loadout forward 5 days";
      const pattern = /move\s+loadout\s+(forward|back)\s+(\d+)\s*days?/;
      const match = query.match(pattern);
      
      expect(match).toBeTruthy();
      expect(match?.[1]).toBe("forward");
      expect(match?.[2]).toBe("5");
    });

    it("should parse 'move loadout back 3 day' (singular)", () => {
      const query = "move loadout back 3 day";
      const pattern = /move\s+loadout\s+(forward|back)\s+(\d+)\s*days?/;
      const match = query.match(pattern);
      
      expect(match).toBeTruthy();
      expect(match?.[1]).toBe("back");
      expect(match?.[2]).toBe("3");
    });

    it("should calculate correct delta (forward = negative)", () => {
      const direction = "forward";
      const num = 5;
      const delta = direction === "forward" ? -num : num;
      
      expect(delta).toBe(-5);
    });

    it("should calculate correct delta (back = positive)", () => {
      const direction = "back";
      const num = 3;
      const delta = direction === "forward" ? -num : num;
      
      expect(delta).toBe(3);
    });
  });

  describe("Pattern: advance/delay all TR-N by X days", () => {
    it("should parse 'advance all TR-3 by 2 days'", () => {
      const query = "advance all TR-3 by 2 days";
      const pattern = /(advance|delay)\s+all\s+tr[-\s]?(\d)\s+by\s+(\d+)\s*days?/i;
      const match = query.match(pattern);
      
      expect(match).toBeTruthy();
      expect(match?.[1]).toBe("advance");
      expect(match?.[2]).toBe("3");
      expect(match?.[3]).toBe("2");
    });

    it("should parse 'delay all TR 5 by 10 day' (no hyphen, singular)", () => {
      const query = "delay all TR 5 by 10 day";
      const pattern = /(advance|delay)\s+all\s+tr[-\s]?(\d)\s+by\s+(\d+)\s*days?/i;
      const match = query.match(pattern);
      
      expect(match).toBeTruthy();
      expect(match?.[1]).toBe("delay");
      expect(match?.[2]).toBe("5");
      expect(match?.[3]).toBe("10");
    });

    it("should calculate correct delta (advance = negative)", () => {
      const action = "advance";
      const num = 2;
      const delta = action === "advance" ? -num : num;
      
      expect(delta).toBe(-2);
    });

    it("should calculate correct delta (delay = positive)", () => {
      const action = "delay";
      const num = 10;
      const delta = action === "advance" ? -num : num;
      
      expect(delta).toBe(10);
    });
  });

  describe("Pattern: TR-N filter", () => {
    it("should match TR-3 activities", () => {
      const trNum = "3";
      const testActivities = [
        { activity_id: "A1", tr_unit_id: "TR-3" },
        { activity_id: "A2", tr_unit_id: "TR-4" },
        { activity_id: "A3", tr_unit_id: "TR-3" },
      ];

      const filtered = testActivities.filter((a) => a.tr_unit_id === `TR-${trNum}`);
      
      expect(filtered).toHaveLength(2);
      expect(filtered.map((a) => a.activity_id)).toEqual(["A1", "A3"]);
    });
  });
});
