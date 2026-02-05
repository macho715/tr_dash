import type { Event, Location, LocationStatus, StatusCode } from "@repo/shared"

export type { Event, Location, LocationStatus, StatusCode }

// WebSocket message types
export type WSMessage = { type: "event"; payload: Event } | { type: "location_status"; payload: LocationStatus }

// KPI data structure
export interface KPIData {
  shipments: number
  planned: number
  inTransit: number
  arrived: number
  delayed: number
  hold: number
  unknown: number
  eventsInWindow: number
}

// Store state interface
export interface LogisticsState {
  // Normalized data
  locationsById: Record<string, Location>
  statusByLocationId: Record<string, LocationStatus>
  eventsById: Record<string, Event>

  // UI state
  windowHours: number
  heatFilter: "all" | "OK" | "WARNING" | "CRITICAL"
  showGeofence: boolean
  showHeatmap: boolean
  showEtaWedge: boolean

  // Connection state
  isConnected: boolean
  isLoading: boolean

  // Actions
  setLocations: (locations: Location[]) => void
  setLocationStatuses: (statuses: LocationStatus[]) => void
  mergeEvent: (event: Event) => void
  mergeLocationStatus: (status: LocationStatus) => void
  setWindowHours: (hours: number) => void
  setHeatFilter: (filter: "all" | "OK" | "WARNING" | "CRITICAL") => void
  toggleGeofence: () => void
  toggleHeatmap: () => void
  toggleEtaWedge: () => void
  setConnected: (connected: boolean) => void
  setLoading: (loading: boolean) => void
}
