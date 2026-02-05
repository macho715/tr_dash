import { GeoJsonLayer } from "@deck.gl/layers"
import type { Location } from "@/types/logistics"
import { createGeofenceGeojson } from "./geofenceUtils"

export function createGeofenceLayer(locations: Location[], visible = true) {
  const geojson = createGeofenceGeojson(locations)

  return new GeoJsonLayer({
    id: "geofence-layer",
    data: geojson,
    visible,
    pickable: false,
    stroked: true,
    filled: true,
    lineWidthMinPixels: 2,
    getFillColor: [100, 150, 255, 40],
    getLineColor: [100, 150, 255, 150],
    getLineWidth: 2,
  })
}
