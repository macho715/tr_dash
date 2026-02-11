export type StatusCode = "OK" | "WARNING" | "CRITICAL"

export interface Location {
  location_id: string
  name: string
  lat: number
  lon: number
  siteType?: string
}

export interface LocationStatus {
  location_id: string
  status_code: StatusCode
  occupancy_rate?: number
  updated_at?: string
}

export interface Event {
  event_id: string
  ts: string
  lon: number
  lat: number
  [key: string]: unknown
}
