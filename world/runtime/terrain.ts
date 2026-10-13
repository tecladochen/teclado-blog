import type { View } from './scene'
import { activeRegion } from './layout'

export function createTerrain(images: Record<string, ImageBitmap>) {
  const patterns = new Map<string, CanvasPattern>()
  const paths = activeRegion.lands.map(land => ({ ...land, shape: new Path2D(land.path) }))
  function pattern(context: CanvasRenderingContext2D, name: string) {
    if (!patterns.has(name)) {
      const p = context.createPattern(images[`texture-${name}`]!, 'repeat')!
      patterns.set(name, p)
    }
    return patterns.get(name)!
  }
  function curve(points: number[][]) {
    const path = new Path2D()
    const first = points[0]!
    path.moveTo(first[0]! * 70, first[1]! * 42)
    for (let i = 1; i < points.length - 1; i++) {
      const a = points[i]!
      const b = points[i + 1]!
      path.quadraticCurveTo(a[0]! * 70, a[1]! * 42, (a[0]! + b[0]!) * 35, (a[1]! + b[1]!) * 21)
    }
    const end = points.at(-1)!
    path.lineTo(end[0]! * 70, end[1]! * 42)
    return path
  }
  const waters = activeRegion.waters.map(w => ({ ...w, shape: curve(w.points) }))
  const roads = activeRegion.roads.map(r => ({ ...r, shape: curve(r.points) }))
  const ponds = activeRegion.ponds.map((p) => {
    const shape = new Path2D()
    // Irregular banks preserve the general planned extent without a perfect diagram ellipse.
    for (let i = 0; i <= 120; i++) {
      const angle = i / 120 * Math.PI * 2
      const rough = 1 + 0.018 * Math.sin(angle * 7) + 0.01 * Math.cos(angle * 11)
      const x = (p.center[0]! + Math.cos(angle) * p.radii[0]! * rough) * 70 + (p.id === 'pond' ? Math.sin(angle) * p.radii[1]! * 42 * 0.9 : 0)
      const y = (p.center[1]! + Math.sin(angle) * p.radii[1]! * rough) * 42
      if (i === 0)
        shape.moveTo(x, y)
      else shape.lineTo(x, y)
    }
    shape.closePath()
    return shape
  })
  const plants = activeRegion.plants
  return {
    ground(context: CanvasRenderingContext2D, view: View) {
      context.fillStyle = pattern(context, 'meadow')
      context.fillRect(view.x, view.y, view.width, view.height)
      for (const land of paths) {
        const scaled = new Path2D()
        scaled.addPath(land.shape, new DOMMatrix().scale(70, 42))
        context.save()
        context.globalAlpha = land.id === 'forest' || land.id === 'bamboo' ? 0.6 : 0.92
        context.fillStyle = pattern(context, land.texture)
        context.fill(scaled)
        context.restore()
      }
      context.lineCap = 'round'
      context.lineJoin = 'round'
      for (const water of waters) {
        context.strokeStyle = pattern(context, 'forest')
        context.lineWidth = water.widthM * 56 + 35
        context.globalAlpha = 0.5
        context.stroke(water.shape)
        context.globalAlpha = 1
        context.strokeStyle = pattern(context, 'water')
        context.lineWidth = water.widthM * 56
        context.stroke(water.shape)
      }
      for (const pond of ponds) {
        context.fillStyle = pattern(context, 'water')
        context.fill(pond)
        context.strokeStyle = pattern(context, 'forest')
        context.globalAlpha = 0.5
        context.lineWidth = 24
        context.stroke(pond)
        context.globalAlpha = 1
      }
      // Rice bunds follow the site slope, with paths and irrigation separating real field parcels.
      for (let row = 0; row < 4; row++) {
        const path = curve([[145 + row * 3, 28 + row * 11], [174, 27 + row * 12], [204, 35 + row * 11], [225 + row * 3, 42 + row * 11]])
        context.strokeStyle = pattern(context, 'meadow')
        context.lineWidth = 46
        context.stroke(path)
        context.strokeStyle = pattern(context, 'road')
        context.lineWidth = 26
        context.stroke(path)
      }
      // Narrow curved working gaps make cultivated rows legible at the fixed ground scale.
      for (const id of ['tea', 'beans', 'garden']) {
        const land = paths.find(p => p.id === id)!
        context.save()
        const clip = new Path2D()
        clip.addPath(land.shape, new DOMMatrix().scale(70, 42))
        context.clip(clip)
        context.strokeStyle = pattern(context, 'road')
        context.lineWidth = id === 'tea' ? 24 : 18
        const start = id === 'tea' ? 23 : id === 'garden' ? 151 : 180
        const end = id === 'tea' ? 60 : id === 'garden' ? 178 : 232
        for (let y = start; y < end; y += id === 'tea' ? 2.8 : 2.2) {
          context.stroke(curve(id === 'tea' ? [[327, y + 5], [345, y - 2], [367, y + 6]] : id === 'garden' ? [[194, y + 1], [210, y - 1], [225, y + 3]] : [[210, y + 1], [238, y - 1], [277, y + 3]]))
        }
        context.restore()
      }
      for (const road of roads) {
        context.strokeStyle = pattern(context, 'road')
        for (let feather = 36; feather >= 0; feather -= 6) {
          context.globalAlpha = feather === 0 ? 1 : 0.11
          context.lineWidth = road.widthM * 52 + feather
          context.stroke(road.shape)
        }
        context.globalAlpha = 1
      }
      // Crossings are actual small decks/culverts, keeping dry access over the water network.
      for (const crossing of activeRegion.crossings) {
        const x = crossing.point[0]! * 70
        const y = crossing.point[1]! * 42
        if (x < view.x - 250 || x > view.x + view.width + 250 || y < view.y - 200 || y > view.y + view.height + 200)
          continue
        const width = crossing.water === 'creek' ? 330 : 140
        const height = crossing.widthReferenceM * 42
        context.fillStyle = pattern(context, 'road')
        context.fillRect(x - width / 2, y - height / 2, width, height)
        context.strokeStyle = '#67563d'
        context.lineWidth = 5
        for (let dx = -width / 2; dx <= width / 2; dx += 23) {
          context.beginPath()
          context.moveTo(x + dx, y - height / 2)
          context.lineTo(x + dx, y + height / 2)
          context.stroke()
        }
        for (const dy of [-height / 2 - 5, height / 2 + 5]) {
          context.beginPath()
          context.moveTo(x - width / 2, y + dy)
          context.lineTo(x + width / 2, y + dy)
          context.stroke()
        }
      }
    },
    vegetation(context: CanvasRenderingContext2D, view: View) {
      for (const p of plants) {
        const x = p.x - p.width / 2
        const y = p.y - p.height
        if (x > view.x + view.width || x + p.width < view.x || y > view.y + view.height || p.y < view.y)
          continue
        const image = images[`sprite-${p.sprite}`]!
        if (p.flip) {
          context.save()
          context.translate(p.x, 0)
          context.scale(-1, 1)
          context.drawImage(image, -p.width / 2, y, p.width, p.height)
          context.restore()
        }
        else {
          context.drawImage(image, x, y, p.width, p.height)
        }
      }
    },
  }
}
