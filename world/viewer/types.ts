export interface PanoramaSection {
  id: string
  start: number
  width: number
  top?: number
  height?: number
  bounds?: number[]
  clip: number[]
  outline: number[][]
  src: string
  pixelWidth: number
  pixelHeight: number
  bytes: number
  decodedBytes: number
}

export interface PanoramaManifest {
  version: number
  width: number
  height: number
  initialCenter: number[]
  maxScale?: number
  views?: { name: string, center: number[], fit?: boolean }[]
  sections: PanoramaSection[]
}
