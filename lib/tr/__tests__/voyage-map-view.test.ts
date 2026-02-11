import { describe, expect, it } from "vitest";
import {
  buildVoyageRoute,
  computeVoyageEtaDriftDays,
  isVoyageActive,
  toRiskBand,
} from "@/lib/tr/voyage-map-view";

const sampleVoyage = {
  voyage: 1,
  sailDate: "Jan 31",
  trUnit: "TR Unit 1",
};

describe("voyage-map-view", () => {
  it("maps drift boundaries to risk bands", () => {
    expect(toRiskBand(0)).toBe("GREEN");
    expect(toRiskBand(0.5)).toBe("GREEN");
    expect(toRiskBand(1.5)).toBe("AMBER");
    expect(toRiskBand(1.51)).toBe("RED");
    expect(toRiskBand(-1.51)).toBe("RED");
  });

  it("builds default Mina Zayed -> AGI route", () => {
    const route = buildVoyageRoute(sampleVoyage, {
      LOC_MZP: { lat: 24.52489, lon: 54.37798 },
      LOC_AGI: { lat: 24.841096, lon: 53.658619 },
    });
    expect(route).not.toBeNull();
    expect(route?.coords).toHaveLength(2);
    expect(route?.from).toEqual([24.52489, 54.37798]);
    expect(route?.to).toEqual([24.841096, 53.658619]);
  });

  it("returns null route when required locations are missing", () => {
    const route = buildVoyageRoute(sampleVoyage, {
      LOC_MZP: { lat: 24.5, lon: 54.3 },
    });
    expect(route).toBeNull();
  });

  it("calculates drift from selected date against sail date", () => {
    const drift = computeVoyageEtaDriftDays(sampleVoyage, new Date("2026-02-02T09:00:00Z"));
    expect(drift).toBe(2);
  });

  it("prioritizes selected over hovered for active state", () => {
    expect(isVoyageActive(2, 2, 3)).toBe(true);
    expect(isVoyageActive(3, 2, 3)).toBe(false);
    expect(isVoyageActive(3, null, 3)).toBe(true);
    expect(isVoyageActive(1, null, null)).toBe(false);
  });
});
