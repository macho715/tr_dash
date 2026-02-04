import type { Layer, PickingInfo } from "@deck.gl/core"
import { ScatterplotLayer, TextLayer } from "@deck.gl/layers"
// @ts-ignore - @deck.gl/extensions may not have type declarations
import { CollisionFilterExtension } from "@deck.gl/extensions"

import type { PoiCategory, PoiLocation } from "@/lib/map/poiTypes"

export type PoiLayersOptions = {
  pois: ReadonlyArray<PoiLocation>
  selectedPoiId?: string | null
  zoom: number
  onSelectPoi?: (poi: PoiLocation) => void
  onHover?: (info: PickingInfo) => void
  visible?: boolean
  /**
   * If true, labels are always attempted.
   * If false, labels appear only at zoom >= labelZoomThreshold.
   */
  forceLabels?: boolean
  labelZoomThreshold?: number
  labelDetailZoomThreshold?: number
}

const EMPHASIZED_POI_IDS = new Set(["mosb-yard"])

function categoryColor(category: PoiCategory): [number, number, number, number] {
  switch (category) {
    case "HVDC_SITE":
      return [56, 189, 248, 220]
    case "PORT":
      return [251, 146, 60, 220]
    case "WAREHOUSE":
      return [34, 197, 94, 220]
    case "OFFICE":
      return [129, 140, 248, 220]
    case "YARD":
      return [250, 204, 21, 220]
    case "AIRPORT":
      return [248, 113, 113, 220]
    default:
      return [148, 163, 184, 220]
  }
}

function getPoiPosition(poi: PoiLocation): [number, number] {
  if (poi.displayJitter) {
    return [poi.longitude + poi.displayJitter[0], poi.latitude + poi.displayJitter[1]]
  }
  return [poi.longitude, poi.latitude]
}

function getLabelSize(poi: PoiLocation, selectedPoiId?: string | null): number {
  const baseSize = EMPHASIZED_POI_IDS.has(poi.id) ? 15 : 13
  return poi.id === selectedPoiId ? baseSize + 2 : baseSize
}

export function createPoiLayers(opts: PoiLayersOptions): Layer[] {
  const {
    pois,
    selectedPoiId,
    zoom,
    onSelectPoi,
    onHover,
    visible = true,
    forceLabels = false,
    labelZoomThreshold = 8.5,
    labelDetailZoomThreshold = 10.5,
  } = opts

  const showLabels = visible && (forceLabels || zoom >= labelZoomThreshold)
  const useDetailedLabels = zoom >= labelDetailZoomThreshold

  const pointsLayer = new ScatterplotLayer<PoiLocation>({
    id: "poi-markers",
    data: pois,
    pickable: true,
    visible,
    radiusUnits: "pixels",
    getPosition: getPoiPosition,
    getRadius: (d) => (d.id === selectedPoiId ? 10 : 7),
    getFillColor: (d) => categoryColor(d.category),
    getLineColor: [15, 23, 42, 200],
    lineWidthUnits: "pixels",
    getLineWidth: (d) => (d.id === selectedPoiId ? 2 : 1),
    stroked: true,
    filled: true,
    onClick: (info) => {
      if (!info?.object) return
      onSelectPoi?.(info.object)
    },
    onHover,
    updateTriggers: {
      getRadius: [selectedPoiId],
      getLineWidth: [selectedPoiId],
    },
  })

  const labelLayer = new TextLayer<PoiLocation>({
    id: "poi-labels",
    data: pois,
    pickable: true,
    visible: showLabels,
    getPosition: getPoiPosition,
    getText: (d) => (useDetailedLabels ? d.displayLabel ?? `${d.code} - ${d.summary}` : d.code),
    sizeUnits: "pixels",
    getSize: (d) => getLabelSize(d, selectedPoiId),
    getPixelOffset: (d) => d.labelOffsetPx ?? [0, -16],
    getTextAnchor: "middle",
    getAlignmentBaseline: "bottom",
    getColor: [15, 23, 42, 235],
    background: true,
    getBackgroundColor: [255, 255, 255, 230],
    backgroundPadding: [6, 4],
    extensions: [new CollisionFilterExtension()],
    // @ts-ignore - getCollisionPriority may not be in type definitions
    getCollisionPriority: (d: PoiLocation) => d.priority ?? 0,
    collisionTestProps: {
      sizeScale: 1.15,
    },
    onClick: (info) => {
      if (!info?.object) return
      onSelectPoi?.(info.object)
    },
    onHover,
    updateTriggers: {
      getSize: [selectedPoiId],
      getText: [useDetailedLabels],
      visible: [showLabels],
    },
  })

  return [pointsLayer, labelLayer]
}

export function getPoiTooltip(info: PickingInfo): { text: string } | null {
  const obj = info?.object as PoiLocation | undefined
  if (!obj) return null

  const lines: string[] = []
  lines.push(`${obj.code} - ${obj.name}`)
  if (obj.address) lines.push(obj.address)
  lines.push(obj.summary)

  return { text: lines.join("\n") }
}
