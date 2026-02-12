import { parseVoyageShortDate } from "@/lib/dashboard-data";

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const DEFAULT_FROM_LOCATION_ID = "LOC_MZP";
const DEFAULT_TO_LOCATION_ID = "LOC_AGI";

export type RiskBand = "GREEN" | "AMBER" | "RED";

type VoyageLike = {
  voyage: number;
  sailDate: string;
  trUnit?: string;
};

type BasicLocation = {
  lat: number;
  lon: number;
};

type BasicLocationsMap = Record<string, BasicLocation>;

export function toRiskBand(etaDriftDays?: number): RiskBand {
  const drift = Math.abs(etaDriftDays ?? 0);
  if (drift <= 0.5) return "GREEN";
  if (drift <= 1.5) return "AMBER";
  return "RED";
}

export function riskColor(band: RiskBand): string {
  if (band === "GREEN") return "#22c55e";
  if (band === "AMBER") return "#f59e0b";
  return "#ef4444";
}

function toUtcNoon(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0));
}

export function computeVoyageEtaDriftDays(voyage: VoyageLike, selectedDate: Date): number {
  const sailDate = parseVoyageShortDate(voyage.sailDate);
  if (Number.isNaN(sailDate.getTime()) || Number.isNaN(selectedDate.getTime())) {
    return 0;
  }
  const selectedNoon = toUtcNoon(selectedDate);
  return (selectedNoon.getTime() - sailDate.getTime()) / MS_PER_DAY;
}

export function buildVoyageRoute(
  voyage: VoyageLike,
  locations: BasicLocationsMap,
  options?: { fromLocationId?: string; toLocationId?: string }
): { from: [number, number]; to: [number, number]; coords: [number, number][] } | null {
  void voyage;
  const fromId = options?.fromLocationId ?? DEFAULT_FROM_LOCATION_ID;
  const toId = options?.toLocationId ?? DEFAULT_TO_LOCATION_ID;
  const from = locations[fromId];
  const to = locations[toId];
  if (!from || !to) return null;
  return {
    from: [from.lat, from.lon],
    to: [to.lat, to.lon],
    coords: [
      [from.lat, from.lon],
      [to.lat, to.lon],
    ],
  };
}

export function isVoyageActive(
  voyageNo: number,
  selectedVoyageNo?: number | null,
  hoveredVoyageNo?: number | null
): boolean {
  if (selectedVoyageNo != null) {
    return voyageNo === selectedVoyageNo;
  }
  if (hoveredVoyageNo != null) {
    return voyageNo === hoveredVoyageNo;
  }
  return false;
}
