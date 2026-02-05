import { ScatterplotLayer } from "@deck.gl/layers"
import type { PickingInfo } from "@deck.gl/core"
import type { Location, LocationStatus, StatusCode } from "@/types/logistics"

// Color mapping for status codes (RGBA)
const STATUS_COLORS: Record<StatusCode, [number, number, number, number]> = {
  OK: [34, 197, 94, 200], // Green
  WARNING: [251, 191, 36, 200], // Amber
  CRITICAL: [239, 68, 68, 200], // Red
}

interface LocationWithStatus extends Location {
  status?: LocationStatus
}

export function createLocationLayer(
  locations: Location[],
  statusByLocationId: Record<string, LocationStatus>,
  onHover?: (info: PickingInfo<LocationWithStatus>) => void,
  { visible = true }: { visible?: boolean } = {},
) {
  const data: LocationWithStatus[] = locations.map((loc) => ({
    ...loc,
    status: statusByLocationId[loc.location_id],
  }))

  return new ScatterplotLayer<LocationWithStatus>({
    id: "location-layer",
    data,
    pickable: true,
    visible,
    opacity: 0.8,
    stroked: true,
    filled: true,
    radiusScale: 1,
    radiusMinPixels: 10,
    radiusMaxPixels: 50,
    lineWidthMinPixels: 2,
    getPosition: (d) => [d.lon, d.lat],
    getRadius: (d) => {
      const occupancy = d.status?.occupancy_rate ?? 0.5
      return 500 + occupancy * 1500 // Scale radius by occupancy
    },
    getFillColor: (d) => {
      const statusCode = d.status?.status_code ?? "OK"
      return STATUS_COLORS[statusCode]
    },
    getLineColor: [255, 255, 255, 150],
    onHover,
    updateTriggers: {
      getRadius: [statusByLocationId],
      getFillColor: [statusByLocationId],
    },
  })
}
