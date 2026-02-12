declare module "@deck.gl/aggregation-layers" {
  import type { Layer, LayerProps } from "@deck.gl/core"

  export type HeatmapLayerProps<DataT = unknown> = LayerProps<DataT> & {
    data?: ReadonlyArray<DataT>
    getPosition?: (d: DataT) => [number, number]
    getWeight?: (d: DataT) => number
    radiusPixels?: number
    intensity?: number
    threshold?: number
    colorRange?: Array<[number, number, number, number]>
  }

  export class HeatmapLayer<DataT = unknown> extends Layer<DataT> {
    constructor(props?: HeatmapLayerProps<DataT>)
  }
}
