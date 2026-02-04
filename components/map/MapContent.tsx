'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.heat'

// Fix default marker icon in Next.js
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})
L.Marker.prototype.options.icon = DefaultIcon

/** Center between Mina Zayed (24.53, 54.38) and AGI (24.84, 53.66) for accurate display */
const DEFAULT_CENTER: [number, number] = [24.69, 54.02]
const DEFAULT_ZOOM = 8

export type HeatPoint = [number, number, number]

export type MapContentProps = {
  heatPoints?: HeatPoint[]
  locations: Record<string, { location_id: string; name: string; lat: number; lon: number }>
  routeSegments: Array<{
    routeId: string
    coords: [number, number][]
    activityId: string
    isHighlighted: boolean
  }>
  trMarkers: Array<{
    trId: string
    lat: number
    lon: number
    status: string
    hasBlockingCollision: boolean
    hasWarningCollision: boolean
    label: string
  }>
  onTrMarkerClick: (trId: string) => void
  mapStatusHex: Record<string, string>
}

function HeatLayer({ heatPoints }: { heatPoints: HeatPoint[] }) {
  const map = useMap()
  useEffect(() => {
    if (!heatPoints?.length) return
    const heat = (L as any).heatLayer(heatPoints, {
      radius: 35,
      blur: 20,
      maxZoom: 12,
      minOpacity: 0.4,
    })
    heat.addTo(map)
    return () => map.removeLayer(heat)
  }, [map, heatPoints])
  return null
}

export function MapContent({
  heatPoints = [],
  locations,
  routeSegments,
  trMarkers,
  onTrMarkerClick,
  mapStatusHex,
}: MapContentProps) {
  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      className="h-full w-full rounded-lg"
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {heatPoints.length > 0 && <HeatLayer heatPoints={heatPoints} />}

      {/* Route polylines (background layer) */}
      {routeSegments.map((seg) => (
        <Polyline
          key={`${seg.routeId}-${seg.activityId}`}
          positions={seg.coords}
          pathOptions={{
            color: seg.isHighlighted ? '#2563eb' : '#64748b',
            weight: seg.isHighlighted ? 4 : 2,
            opacity: 0.8,
          }}
        />
      ))}

      {/* Location markers (nodes: Yard, Jetty, etc.) */}
      {Object.entries(locations).map(([locId, loc]) => {
        const isMinaPort = locId === 'LOC_MZP'
        const isAGI = locId === 'LOC_AGI'
        const isKeyLocation = isMinaPort || isAGI
        const icon = isKeyLocation
          ? L.divIcon({
              className: 'location-marker-key',
              html: `<div style="width:28px;height:28px;border-radius:50%;background:${isMinaPort ? '#0891b2' : '#06b6d4'};border:3px solid #22d3ee;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.4);color:white;font-size:9px;font-weight:bold;">${isMinaPort ? 'MZ' : 'AG'}</div>`,
              iconSize: [28, 28],
              iconAnchor: [14, 14],
            })
          : undefined
        return (
          <Marker
            key={locId}
            position={[loc.lat, loc.lon]}
            {...(icon != null ? { icon } : {})}
          >
            <Popup>{loc.name}</Popup>
          </Marker>
        )
      })}

      {/* TR markers with state styling (patch §4.1) */}
      {trMarkers.map((m) => {
        const bgColor = mapStatusHex[m.status] ?? '#64748b'
        const outlineColor = m.hasBlockingCollision ? '#dc2626' : m.hasWarningCollision ? '#eab308' : 'white'
        const outlineWidth = m.hasBlockingCollision || m.hasWarningCollision ? 3 : 2
        const icon = L.divIcon({
          className: 'tr-marker',
          html: `<div style="width:32px;height:32px;border-radius:50%;background:${bgColor};border:${outlineWidth}px solid ${outlineColor};display:flex;align-items:center;justify-content:center;box-shadow:0 1px 3px rgba(0,0,0,0.3);color:white;font-size:10px;font-weight:bold;">${m.trId.slice(-3)}</div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        })
        return (
          <Marker
            key={m.trId}
            position={[m.lat, m.lon]}
            icon={icon}
            eventHandlers={{
              click: () => onTrMarkerClick(m.trId),
            }}
          >
            <Popup>
              <div className="text-sm">
                <strong>{m.label}</strong>
                <span className="ml-1 text-muted-foreground">({m.status})</span>
              </div>
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}
