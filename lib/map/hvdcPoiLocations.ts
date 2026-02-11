export type HvdcPoiCategory = "SITE" | "PORT" | "YARD" | "CHECKPOINT"

export interface HvdcPoi {
  id: string
  code: string
  name: string
  category: HvdcPoiCategory
  coordinates: [number, number]
  summary: string
  displayLabel?: string
  labelOffset?: [number, number]
}

export const HVDC_POIS: HvdcPoi[] = [
  {
    id: "agi-site",
    code: "AGI",
    name: "AGI Site",
    category: "SITE",
    coordinates: [54.5208, 24.4384],
    summary: "Transformer origin yard",
    displayLabel: "AGI · Origin",
    labelOffset: [0, 18],
  },
  {
    id: "mina-zayed-port",
    code: "MZP",
    name: "Mina Zayed Port",
    category: "PORT",
    coordinates: [54.3795, 24.5353],
    summary: "Port interface and load-in",
    displayLabel: "MZP · Port",
    labelOffset: [0, 18],
  },
  {
    id: "mosb-yard",
    code: "MOSB",
    name: "MOSB Yard",
    category: "YARD",
    coordinates: [54.565, 24.33],
    summary: "Temporary storage and sequencing",
    displayLabel: "MOSB · Yard",
    labelOffset: [0, 18],
  },
]

export function poiColor(category: HvdcPoiCategory): [number, number, number, number] {
  switch (category) {
    case "SITE":
      return [56, 189, 248, 220]
    case "PORT":
      return [251, 146, 60, 220]
    case "YARD":
      return [34, 197, 94, 220]
    case "CHECKPOINT":
      return [167, 139, 250, 220]
    default:
      return [148, 163, 184, 220]
  }
}
