export interface BackgroundTile {
  id: string
  column: number
  row: number
  x: number
  y: number
  width: number
  height: number
  src: string
  bytes: number
  decodedBytes: number
}

export interface BackgroundPreview {
  x: number
  width: number
  src: string
  bytes: number
}

export interface TiledManifest {
  version: number
  status: string
  width: number
  height: number
  tileSize: number
  gutter: number
  maxScale: number
  initialCenter: number[]
  tiles: BackgroundTile[]
  previews: BackgroundPreview[]
  sources: { id: string, hash: string, width: number, height: number, crop: number[] }[]
}
