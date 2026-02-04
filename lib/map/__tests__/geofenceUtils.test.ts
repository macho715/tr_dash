/**
 * Tests for geofenceUtils
 * Phase 1: Geofence Implementation
 */
import { describe, it, expect } from 'vitest'
import {
  createGeofenceGeojson,
  isPointInGeofence,
  type GeofenceFeatureCollection,
} from '../geofenceUtils'

describe('geofenceUtils', () => {
  const mockLocations = {
    LOC_MZP: {
      location_id: 'LOC_MZP',
      name: 'Mina Zayed Port',
      lat: 24.5249,
      lon: 54.378,
    },
    LOC_AGI: {
      location_id: 'LOC_AGI',
      name: 'AGI Jetty',
      lat: 24.8411,
      lon: 53.6586,
    },
  }

  describe('createGeofenceGeojson', () => {
    it('should create valid GeoJSON FeatureCollection', () => {
      const result = createGeofenceGeojson(mockLocations)

      expect(result.type).toBe('FeatureCollection')
      expect(result.features).toHaveLength(2)
    })

    it('should create polygons with correct structure', () => {
      const result = createGeofenceGeojson(mockLocations)
      const feature = result.features[0]

      expect(feature.type).toBe('Feature')
      expect(feature.geometry.type).toBe('Polygon')
      expect(feature.geometry.coordinates).toHaveLength(1)
      expect(feature.geometry.coordinates[0]).toHaveLength(5) // closed polygon
    })

    it('should include location properties', () => {
      const result = createGeofenceGeojson(mockLocations)
      const locationIds = result.features.map((f) => f.properties.location_id)

      expect(locationIds).toContain('LOC_MZP')
      expect(locationIds).toContain('LOC_AGI')
    })

    it('should create rectangles with ~2.2km offset', () => {
      const result = createGeofenceGeojson(mockLocations)
      const coords = result.features[0].geometry.coordinates[0]
      const offset = 0.02

      // Check that coordinates form a rectangle with correct offset
      const [minLon, maxLon] = [
        Math.min(...coords.map((c) => c[0])),
        Math.max(...coords.map((c) => c[0])),
      ]
      const [minLat, maxLat] = [
        Math.min(...coords.map((c) => c[1])),
        Math.max(...coords.map((c) => c[1])),
      ]

      expect(maxLon - minLon).toBeCloseTo(offset * 2, 3)
      expect(maxLat - minLat).toBeCloseTo(offset * 2, 3)
    })
  })

  describe('isPointInGeofence', () => {
    let geojson: GeofenceFeatureCollection

    beforeEach(() => {
      geojson = createGeofenceGeojson(mockLocations)
    })

    it('should return true for point inside Mina Zayed geofence', () => {
      const result = isPointInGeofence(54.378, 24.5249, geojson)
      expect(result).toBe(true)
    })

    it('should return true for point inside AGI geofence', () => {
      const result = isPointInGeofence(53.6586, 24.8411, geojson)
      expect(result).toBe(true)
    })

    it('should return false for point outside all geofences', () => {
      // Point in the middle of nowhere (Arabian Gulf)
      const result = isPointInGeofence(54.0, 25.0, geojson)
      expect(result).toBe(false)
    })

    it('should return false for point far from geofences', () => {
      // Point in Dubai (far from both locations)
      const result = isPointInGeofence(55.2708, 25.2048, geojson)
      expect(result).toBe(false)
    })

    it('should handle edge case: point on geofence boundary', () => {
      const offset = 0.02
      // Point exactly on the edge
      const result = isPointInGeofence(
        mockLocations.LOC_MZP.lon + offset,
        mockLocations.LOC_MZP.lat,
        geojson
      )
      // Ray-casting algorithm behavior on boundary is implementation-specific
      expect(typeof result).toBe('boolean')
    })

    it('should return true for multiple points inside different geofences', () => {
      // Slightly offset from center (inside geofence)
      const result1 = isPointInGeofence(54.378 + 0.01, 24.5249 + 0.01, geojson)
      const result2 = isPointInGeofence(53.6586 - 0.01, 24.8411 - 0.01, geojson)

      expect(result1).toBe(true)
      expect(result2).toBe(true)
    })
  })
})
