export class PanoramaCamera {
  x: number
  y: number
  zoom = 1
  viewWidth = 1
  viewHeight = 1
  private hasViewport = false

  constructor(readonly width: number, readonly height: number, readonly initial: number[], readonly maxScale = 1) {
    this.x = initial[0]!
    this.y = initial[1]!
  }

  // Fixed source-quality cap: resizing the window cannot magnify the artwork.
  // If height-fit exceeds the cap, centre the smaller art rather than upscale.
  get minZoom() { return Math.min(1, this.viewHeight / this.height / this.maxScale) }
  get scale() { return this.maxScale * this.zoom }
  get left() { return this.x - this.viewWidth / this.scale / 2 }
  get top() { return this.y - this.viewHeight / this.scale / 2 }
  get right() { return this.left + this.viewWidth / this.scale }
  get bottom() { return this.top + this.viewHeight / this.scale }
  get progress() {
    const span = this.width - this.viewWidth / this.scale
    return span > 0 ? Math.max(0, this.left) / span : 0
  }

  resize(width: number, height: number) {
    const wasFit = !this.hasViewport || this.zoom <= this.minZoom + 0.00001
    this.viewWidth = Math.max(1, width)
    this.viewHeight = Math.max(1, height)
    this.zoom = wasFit ? this.minZoom : Math.max(this.minZoom, Math.min(1, this.zoom))
    this.hasViewport = true
    this.clamp()
  }

  clamp() {
    const halfWidth = this.viewWidth / this.scale / 2
    const halfHeight = this.viewHeight / this.scale / 2
    this.x = halfWidth >= this.width / 2 ? this.width / 2 : Math.max(halfWidth, Math.min(this.width - halfWidth, this.x))
    this.y = halfHeight >= this.height / 2 ? this.height / 2 : Math.max(halfHeight, Math.min(this.height - halfHeight, this.y))
  }

  pan(dx: number, dy = 0) {
    this.x -= dx / this.scale
    this.y -= dy / this.scale
    this.clamp()
  }

  moveTo(progress: number) {
    const extent = Math.min(this.width, this.viewWidth / this.scale)
    this.x = extent / 2 + Math.max(0, Math.min(1, progress)) * (this.width - extent)
    this.clamp()
  }

  zoomAt(zoom: number, px = this.viewWidth / 2, py = this.viewHeight / 2) {
    const worldX = this.left + px / this.scale
    const worldY = this.top + py / this.scale
    this.zoom = Math.max(this.minZoom, Math.min(1, zoom))
    this.x = worldX - (px - this.viewWidth / 2) / this.scale
    this.y = worldY - (py - this.viewHeight / 2) / this.scale
    this.clamp()
  }

  reset() {
    this.zoom = this.minZoom
    this.x = this.initial[0]!
    this.y = this.initial[1]!
    this.clamp()
  }
}
