import { PolygonLayer } from "@deck.gl/layers"
import type { Location } from "@/types/logistics"

// TODO: Implement actual ETA wedge geometry based on vessel ETA data
// For now, this is a stub that creates simple wedge-like shapes

interface WedgeData {
  location_id: string
  polygon: [number, number][]
}

function generateWedgePolygons(locations: Location[]): WedgeData[] {
  // Filter to only PORT and BERTH locations for ETA wedges
  const portLocations = locations.filter((loc) => loc.siteType === "PORT" || loc.siteType === "BERTH")

  return portLocations.map((loc) => {
    // Create a simple wedge shape pointing towards the sea
    // TODO: Replace with actual ETA-based wedge geometry
    const centerLon = loc.lon
    const centerLat = loc.lat
    const wedgeLength = 0.03 // ~3km
    const wedgeWidth = 0.015 // ~1.5km spread

    return {
      location_id: loc.location_id,
      polygon: [
        [centerLon, centerLat],
        [centerLon + wedgeLength, centerLat - wedgeWidth],
        [centerLon + wedgeLength, centerLat + wedgeWidth],
        [centerLon, centerLat],
      ],
    }
  })
}

export function createEtaWedgeLayer(locations: Location[], visible = true) {
  const wedges = generateWedgePolygons(locations)

  return new PolygonLayer<WedgeData>({
    id: "eta-wedge-layer",
    data: wedges,
    visible,
    pickable: false,
    stroked: true,
    filled: true,
    extruded: false,
    getPolygon: (d) => d.polygon,
    getFillColor: [255, 200, 100, 60],
    getLineColor: [255, 200, 100, 150],
    lineWidthMinPixels: 2,
  })
}
