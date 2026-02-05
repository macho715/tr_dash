/**
 * Geofence utilities for TR Dashboard
 * Phase 1: Geofence Implementation
 * SSOT Compliance: Read-only operations on locations data
 */

export type GeofenceFeature = {
  type: 'Feature'
  geometry: {
    type: 'Polygon'
    coordinates: [number, number][][]
  }
  properties: {
    location_id: string
    name: string
  }
}

export type GeofenceFeatureCollection = {
  type: 'FeatureCollection'
  features: GeofenceFeature[]
}

/**
 * Generate GeoJSON FeatureCollection from locations
 * Creates rectangular geofences with ~2.2km offset
 */
export function createGeofenceGeojson(
  locations: Record<string, { location_id: string; name: string; lat: number; lon: number }>
): GeofenceFeatureCollection {
  const offset = 0.02 // ~2.2km

  return {
    type: 'FeatureCollection',
    features: Object.values(locations).map((loc) => ({
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [loc.lon - offset, loc.lat - offset],
          [loc.lon + offset, loc.lat - offset],
          [loc.lon + offset, loc.lat + offset],
          [loc.lon - offset, loc.lat + offset],
          [loc.lon - offset, loc.lat - offset], // close polygon
        ]],
      },
      properties: {
        location_id: loc.location_id,
        name: loc.name,
      },
    })),
  }
}

/**
 * Ray-casting algorithm for point-in-polygon detection
 * From LOGI-MASTER-DASH reference
 * @param lon - Longitude of point to test
 * @param lat - Latitude of point to test
 * @param geojson - GeoJSON FeatureCollection containing polygons
 * @returns true if point is inside any polygon
 */
export function isPointInGeofence(
  lon: number,
  lat: number,
  geojson: GeofenceFeatureCollection
): boolean {
  return geojson.features.some((feature) => {
    const ring = feature.geometry.coordinates[0]
    let inside = false

    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i]
      const [xj, yj] = ring[j]
      const intersects =
        yi > lat !== yj > lat &&
        lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
      if (intersects) inside = !inside
    }

    return inside
  })
}
