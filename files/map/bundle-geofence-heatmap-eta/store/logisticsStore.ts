import { create } from "zustand"
import type { LogisticsState, Location, LocationStatus, Event } from "@/types/logistics"

const MAX_EVENTS = 5000

export const useLogisticsStore = create<LogisticsState>((set, get) => ({
  // Normalized data
  locationsById: {},
  statusByLocationId: {},
  eventsById: {},

  // UI state
  windowHours: 24,
  heatFilter: "all",
  showGeofence: false,
  showHeatmap: false,
  showEtaWedge: false,

  // Connection state
  isConnected: false,
  isLoading: true,

  // Actions
  setLocations: (locations: Location[]) => {
    const locationsById: Record<string, Location> = {}
    locations.forEach((loc) => {
      locationsById[loc.location_id] = loc
    })
    set({ locationsById })
  },

  setLocationStatuses: (statuses: LocationStatus[]) => {
    const statusByLocationId: Record<string, LocationStatus> = {}
    statuses.forEach((status) => {
      statusByLocationId[status.location_id] = status
    })
    set({ statusByLocationId })
  },

  mergeEvent: (event: Event) => {
    set((state) => {
      const newEventsById = { ...state.eventsById, [event.event_id]: event }

      // Keep max 5000 events - remove oldest if exceeded
      const eventIds = Object.keys(newEventsById)
      if (eventIds.length > MAX_EVENTS) {
        const sortedEvents = Object.values(newEventsById).sort(
          (a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime(),
        )
        const trimmedEventsById: Record<string, Event> = {}
        sortedEvents.slice(0, MAX_EVENTS).forEach((evt) => {
          trimmedEventsById[evt.event_id] = evt
        })
        return { eventsById: trimmedEventsById }
      }

      return { eventsById: newEventsById }
    })
  },

  mergeLocationStatus: (status: LocationStatus) => {
    set((state) => ({
      statusByLocationId: {
        ...state.statusByLocationId,
        [status.location_id]: status,
      },
    }))
  },

  setWindowHours: (hours: number) => set({ windowHours: hours }),
  setHeatFilter: (filter) => set({ heatFilter: filter }),
  toggleGeofence: () => set((state) => ({ showGeofence: !state.showGeofence })),
  toggleHeatmap: () => set((state) => ({ showHeatmap: !state.showHeatmap })),
  toggleEtaWedge: () => set((state) => ({ showEtaWedge: !state.showEtaWedge })),
  setConnected: (connected: boolean) => set({ isConnected: connected }),
  setLoading: (loading: boolean) => set({ isLoading: loading }),
}))

// Selectors
export const selectLocations = (state: LogisticsState) => state.locationsById
export const selectStatuses = (state: LogisticsState) => state.statusByLocationId
export const selectEvents = (state: LogisticsState) => state.eventsById

export const selectEventsInWindow = (state: LogisticsState) => {
  const events = Object.values(state.eventsById)
  const windowMs = state.windowHours * 60 * 60 * 1000
  const now = Date.now()
  return events.filter((evt) => now - new Date(evt.ts).getTime() <= windowMs)
}

export const selectKPIs = (state: LogisticsState) => {
  const events = Object.values(state.eventsById)
  const windowMs = state.windowHours * 60 * 60 * 1000
  const now = Date.now()
  const eventsInWindow = events.filter((evt) => now - new Date(evt.ts).getTime() <= windowMs)

  const uniqueShipments = new Set(events.map((e) => e.shpt_no))
  const statusCounts = eventsInWindow.reduce(
    (acc, evt) => {
      const status = evt.status.toUpperCase()
      if (status.includes("PLAN")) acc.planned++
      else if (status.includes("TRANSIT")) acc.inTransit++
      else if (status.includes("DELIVER") || status.includes("ARRIV")) acc.arrived++
      else if (status.includes("DELAY")) acc.delayed++
      else if (status.includes("HOLD")) acc.hold++
      else acc.unknown++
      return acc
    },
    { planned: 0, inTransit: 0, arrived: 0, delayed: 0, hold: 0, unknown: 0 },
  )

  return {
    shipments: uniqueShipments.size,
    planned: statusCounts.planned,
    inTransit: statusCounts.inTransit,
    arrived: statusCounts.arrived,
    delayed: statusCounts.delayed,
    hold: statusCounts.hold,
    unknown: statusCounts.unknown,
    eventsInWindow: eventsInWindow.length,
  }
}

export const selectStatusCounts = (state: LogisticsState) => {
  const statuses = Object.values(state.statusByLocationId)
  return statuses.reduce(
    (acc, s) => {
      acc[s.status_code]++
      return acc
    },
    { OK: 0, WARNING: 0, CRITICAL: 0 },
  )
}
