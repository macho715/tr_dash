import type { Location } from "@/types/logistics"

type GeofenceFeature = {
  type: "Feature"
  properties: {
    location_id: string
    name?: string
    siteType?: string
  }
  geometry: {
    type: "Polygon"
    coordinates: number[][][]
  }
}

export type GeofenceFeatureCollection = {
  type: "FeatureCollection"
  features: GeofenceFeature[]
}

export function createGeofenceGeojson(locations: Location[]): GeofenceFeatureCollection {
  return {
    type: "FeatureCollection",
    features: locations.map((loc) => {
      const offset = 0.02
      return {
        type: "Feature",
        properties: {
          location_id: loc.location_id,
          name: loc.name,
          siteType: loc.siteType,
        },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [loc.lon - offset, loc.lat - offset],
              [loc.lon + offset, loc.lat - offset],
              [loc.lon + offset, loc.lat + offset],
              [loc.lon - offset, loc.lat + offset],
              [loc.lon - offset, loc.lat - offset],
            ],
          ],
        },
      }
    }),
  }
}

function isPointInPolygon(point: [number, number], ring: number[][]) {
  let isInside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    const intersects =
      yi > point[1] !== yj > point[1] &&
      point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi
    if (intersects) isInside = !isInside
  }
  return isInside
}

export function isPointInGeofence(
  lon: number,
  lat: number,
  geojson: GeofenceFeatureCollection,
) {
  return geojson.features.some((feature) => {
    const ring = feature.geometry.coordinates[0]
    if (!ring?.length) return false
    return isPointInPolygon([lon, lat], ring)
  })
}
