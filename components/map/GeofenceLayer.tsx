/**
 * GeofenceLayer component for TR Dashboard
 * Phase 1: Geofence Implementation
 * Renders semi-transparent polygons around key locations
 */
'use client'

import { Polygon } from 'react-leaflet'

type Location = {
  location_id: string
  name: string
  lat: number
  lon: number
}

type GeofenceLayerProps = {
  locations: Record<string, Location>
  visible: boolean
}

/**
 * Renders geofence polygons as semi-transparent boundaries around locations
 * Uses ~2.2km offset (0.02°) to create rectangular geofences
 */
export function GeofenceLayer({ locations, visible }: GeofenceLayerProps) {
  if (!visible) return null

  const offset = 0.02 // ~2.2km

  return (
    <>
      {Object.values(locations).map((loc) => {
        const bounds: [number, number][] = [
          [loc.lat - offset, loc.lon - offset],
          [loc.lat - offset, loc.lon + offset],
          [loc.lat + offset, loc.lon + offset],
          [loc.lat + offset, loc.lon - offset],
        ]

        return (
          <Polygon
            key={loc.location_id}
            positions={bounds}
            pathOptions={{
              color: '#6495ED',
              fillColor: '#6495ED',
              fillOpacity: 0.15,
              weight: 2,
              dashArray: '5, 5',
            }}
          />
        )
      })}
    </>
  )
}
