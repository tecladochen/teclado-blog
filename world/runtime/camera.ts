export interface View { x: number, y: number, width: number, height: number }
interface Point { x: number, y: number }
interface Place extends Point { id: string, label: string }
interface Options {
  size: { width: number, height: number }
  initial: Point
  initialScale?: number
  minScale?: number
  maxScale?: number
  places?: Place[]
}

export function createCamera({ size, initial, initialScale = 1, minScale = 0.6, maxScale = 1.65, places = [] }: Options) {
  const position = { x: initial.x, y: initial.y }
  let width = 1
  let height = 1
  let scale = initialScale
  const minimum = () => Math.max(minScale, width / size.width, height / size.height)
  const maximum = () => Math.max(maxScale, minimum() * 1.5)

  function constrain() {
    scale = Math.max(minimum(), Math.min(maximum(), scale))
    const halfWidth = width / scale / 2
    const halfHeight = height / scale / 2
    position.x = Math.max(halfWidth, Math.min(size.width - halfWidth, position.x))
    position.y = Math.max(halfHeight, Math.min(size.height - halfHeight, position.y))
  }

  const camera = {
    position,
    get width() { return width },
    get height() { return height },
    get scale() { return scale },
    get limits() { return { min: minimum(), max: maximum() } },
    resize(nextWidth: number, nextHeight: number) {
      width = Math.max(1, nextWidth)
      height = Math.max(1, nextHeight)
      constrain()
    },
    move(x: number, y: number) {
      position.x += x
      position.y += y
      constrain()
    },
    worldAt(point: Point): Point {
      return { x: position.x + (point.x - width / 2) / scale, y: position.y + (point.y - height / 2) / scale }
    },
    zoomAt(nextScale: number, anchor: Point = { x: width / 2, y: height / 2 }) {
      const before = camera.worldAt(anchor)
      scale = Math.max(minimum(), Math.min(maximum(), nextScale))
      position.x = before.x - (anchor.x - width / 2) / scale
      position.y = before.y - (anchor.y - height / 2) / scale
      constrain()
    },
    reset() {
      position.x = initial.x
      position.y = initial.y
      scale = initialScale
      constrain()
    },
    goTo(id: string) {
      const place = places.find(place => place.id === id)
      if (!place)
        return
      position.x = place.x
      position.y = place.y
      constrain()
      return place
    },
    view(): View {
      return { x: position.x - width / scale / 2, y: position.y - height / scale / 2, width: width / scale, height: height / scale }
    },
  }
  return camera
}

export type Camera = ReturnType<typeof createCamera>
