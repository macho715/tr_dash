export type PoiCategory =
  | "HVDC_SITE"
  | "PORT"
  | "WAREHOUSE"
  | "OFFICE"
  | "YARD"
  | "AIRPORT"
  | "OTHER"

export interface PoiLocation {
  id: string
  code: string
  name: string
  category: PoiCategory
  latitude: number
  longitude: number
  summary: string
  address?: string
  displayLabel?: string
  displayJitter?: [number, number]
  labelOffsetPx?: [number, number]
  priority?: number
}
