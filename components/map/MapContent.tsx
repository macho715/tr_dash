'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.heat'
import { GeofenceLayer } from './GeofenceLayer'
import { HeatmapLegend } from './HeatmapLegend'

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
    status: 'planned' | 'in_progress' | 'completed'
    trId: string
  }>
  trMarkers: Array<{
    trId: string
    lat: number
    lon: number
    status: string
    hasBlockingCollision: boolean
    hasWarningCollision: boolean
    label: string
    currentActivityName: string | null
    currentActivityId: string | null
    locationName: string | null
    eta: string | null
    isHighlighted: boolean
  }>
  onTrMarkerClick: (trId: string) => void
  mapStatusHex: Record<string, string>
  showGeofence?: boolean
  showHeatmapLegend?: boolean
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
      gradient: {
        0.0: '#0198bd', // blue
        0.4: '#49e3ce', // cyan
        0.65: '#d8feb5', // lime
        0.85: '#feedb1', // yellow
        0.95: '#fead54', // orange
        1.0: '#d1374e', // red
      },
    })
    heat.addTo(map)
    return () => {
      map.removeLayer(heat)
    }
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
  showGeofence = false,
  showHeatmapLegend = false,
}: MapContentProps) {
  // Route status styles (patch §4.1 compliance)
  const ROUTE_STATUS_STYLES = {
    planned: { color: '#9ca3af', weight: 2, opacity: 0.6 },
    in_progress: { color: '#3b82f6', weight: 4, opacity: 0.9 },
    completed: { color: '#22c55e', weight: 2, opacity: 0.8 },
  }

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
      <GeofenceLayer locations={locations} visible={showGeofence} />
      <HeatmapLegend visible={showHeatmapLegend} />

      {/* Route polylines with status-based coloring */}
      {routeSegments.map((seg) => {
        const baseStyle = ROUTE_STATUS_STYLES[seg.status]
        const style = seg.isHighlighted
          ? { ...baseStyle, color: '#22d3ee', weight: 4, dashArray: '10, 5' }
          : baseStyle

        return (
          <Polyline
            key={`${seg.routeId}-${seg.activityId}`}
            positions={seg.coords}
            pathOptions={style}
          />
        )
      })}

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

      {/* TR markers with pulsing animation + rich tooltips */}
      {trMarkers.map((m) => {
        const bgColor = mapStatusHex[m.status] ?? '#64748b'
        const outlineColor = m.hasBlockingCollision
          ? '#dc2626'
          : m.hasWarningCollision
          ? '#eab308'
          : m.isHighlighted
          ? '#22d3ee'
          : 'white'
        const outlineWidth = m.hasBlockingCollision || m.hasWarningCollision || m.isHighlighted ? 3 : 2

        // Size and pulse for in_progress
        const size = m.status === 'in_progress' ? 36 : 32
        const pulseClass = m.status === 'in_progress' ? 'tr-marker-pulse' : ''

        const icon = L.divIcon({
          className: `tr-marker ${pulseClass}`,
          html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${bgColor};border:${outlineWidth}px solid ${outlineColor};display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.4);color:white;font-size:10px;font-weight:bold;">${m.trId.slice(-3)}</div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        })

        // Format ETA for display
        const etaDisplay = m.eta
          ? new Date(m.eta).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          : null

        // Calculate time remaining if ETA exists
        const timeRemaining = m.eta
          ? (() => {
              const now = new Date()
              const eta = new Date(m.eta)
              const diffMs = eta.getTime() - now.getTime()
              const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
              const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
              if (diffHours > 0) return `${diffHours}h ${diffMins}m remaining`
              if (diffMins > 0) return `${diffMins}m remaining`
              return 'Due now'
            })()
          : null

        // Badge class based on status
        const statusBadgeClass =
          m.status === 'in_progress'
            ? 'badge-blue'
            : m.status === 'completed'
            ? 'badge-green'
            : m.status === 'blocked'
            ? 'badge-red'
            : m.status === 'delayed'
            ? 'badge-yellow'
            : 'badge-gray'

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
              <div className="tr-marker-tooltip">
                <div className="font-semibold text-base">{m.label}</div>
                <div className="text-sm text-muted-foreground">{m.locationName || 'Unknown Location'}</div>
                {m.currentActivityName && (
                  <div className="mt-1 text-xs">
                    <span className="font-medium">Activity:</span> {m.currentActivityName}
                  </div>
                )}
                {etaDisplay && (
                  <div className="text-xs text-yellow-400">
                    <span className="font-medium">ETA:</span> {etaDisplay}
                    {timeRemaining && <span className="ml-1 text-yellow-300">({timeRemaining})</span>}
                  </div>
                )}
                <div className="mt-2 flex gap-1">
                  <span className={`badge ${statusBadgeClass}`}>{m.status}</span>
                  {m.hasBlockingCollision && <span className="badge badge-red">blocked</span>}
                  {m.hasWarningCollision && <span className="badge badge-yellow">warning</span>}
                </div>
              </div>
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}
