import type { View } from '../camera'
import { art, sample } from './definition'
import { henPose, residentPose } from './life'

type Images = Record<string, ImageBitmap>

function polygon(points: number[][]) {
  const path = new Path2D()
  points.forEach((point, i) => i ? path.lineTo(point[0]!, point[1]!) : path.moveTo(point[0]!, point[1]!))
  path.closePath()
  return path
}

export function createLifePainter(images: Images) {
  const waterMask = new Path2D()
  for (const shape of sample.water) waterMask.addPath(polygon(shape))

  function sprite(context: CanvasRenderingContext2D, id: 'hen' | 'resident', frame: number, x: number, y: number, height: number, facing = 1) {
    const meta = art.actors[id]![frame]!
    const scale = height / art.actors[id]![0]!.height
    context.save()
    context.translate(x, y)
    context.scale(scale * facing, scale)
    context.drawImage(images[`${id}-${frame}`]!, -meta.foot[0], -meta.foot[1])
    context.restore()
  }

  function shadow(context: CanvasRenderingContext2D, x: number, y: number, radius: number) {
    context.fillStyle = '#35473128'
    context.beginPath()
    context.ellipse(x + radius * 0.2, y + 1, radius, radius * 0.28, -0.25, 0, Math.PI * 2)
    context.fill()
  }

  function rotor(context: CanvasRenderingContext2D, time: number) {
    const { x, y, radius } = sample.rotor
    context.save()
    context.translate(x, y)
    // Rotation happens in the wheel's plane BEFORE projection into the painted scene.
    context.transform(0.67, 0.12, 0, 1, 0, 0)
    context.rotate(time * 0.24 + Math.sin(time * 0.22) * 0.07)
    context.lineJoin = 'round'
    for (let i = 0; i < 4; i++) {
      context.save()
      context.rotate(i * Math.PI / 2)
      context.fillStyle = '#725635'
      context.fillRect(-2, -radius, 4, radius)
      const blade = polygon([[-4, -radius + 2], [13, -radius + 4], [10, -17], [-4, -13]])
      context.fillStyle = '#c49e65'
      context.fill(blade)
      context.strokeStyle = '#654c32'
      context.lineWidth = 1
      context.stroke(blade)
      context.save()
      context.clip(blade)
      for (let grain = 0; grain < 9; grain++) {
        context.strokeStyle = grain % 2 ? '#edd1a263' : '#7c593f47'
        context.beginPath()
        context.moveTo(-4 + grain * 2, -radius + 4)
        context.lineTo(-3 + grain * 1.8, -16)
        context.stroke()
      }
      context.restore()
      context.restore()
    }
    context.fillStyle = '#5c5b47'
    context.beginPath()
    context.arc(0, 0, 5, 0, Math.PI * 2)
    context.fill()
    context.fillStyle = '#d1b788'
    context.beginPath()
    context.arc(-1, -1, 2, 0, Math.PI * 2)
    context.fill()
    context.restore()
  }

  function water(context: CanvasRenderingContext2D, time: number) {
    context.save()
    context.clip(waterMask)
    context.lineCap = 'round'
    for (const [runIndex, run] of sample.waterRuns.entries()) {
      for (let i = 0; i < 14; i++) {
        const progress = (time * 0.04 + i / 14 + runIndex * 0.21) % 1 * (run.length - 1)
        const segment = Math.floor(progress)
        const mix = progress - segment
        const from = run[segment]!
        const to = run[segment + 1]!
        const offset = Math.sin(i * 17.3) * 5
        const x = from[0]! + (to[0]! - from[0]!) * mix + offset
        const y = from[1]! + (to[1]! - from[1]!) * mix
        context.strokeStyle = `rgba(236,244,217,${0.13 + Math.sin(mix * Math.PI) * 0.13})`
        context.lineWidth = 0.8 + i % 3 * 0.25
        context.beginPath()
        context.moveTo(x - 5, y)
        context.quadraticCurveTo(x, y + 1.6, x + 5, y - 0.4)
        context.stroke()
      }
    }
    for (let i = 0; i < 3; i++) {
      const phase = (time * 0.45 + i / 3) % 1
      context.strokeStyle = `rgba(236,244,217,${(1 - phase) * 0.32})`
      context.lineWidth = 0.9
      context.beginPath()
      context.ellipse(1335, 324, 3 + phase * 14, 1 + phase * 4, -0.08, 0, Math.PI * 2)
      context.stroke()
    }
    context.restore()
    // Delicate short highlights follow the existing painted spillway, never its masonry.
    const [from, middle, to] = sample.pouring
    for (let i = 0; i < 3; i++) {
      const t = (time * 0.9 + i / 3) % 1
      const x = (1 - t) ** 2 * from![0]! + 2 * (1 - t) * t * middle![0]! + t ** 2 * to![0]!
      const y = (1 - t) ** 2 * from![1]! + 2 * (1 - t) * t * middle![1]! + t ** 2 * to![1]!
      context.strokeStyle = '#f5f1d56b'
      context.lineWidth = 1.1
      context.beginPath()
      context.moveTo(x, y)
      context.lineTo(x - 1.5, y + 3.5)
      context.stroke()
    }
  }

  function flecks(context: CanvasRenderingContext2D, time: number) {
    // Very occasional leaves below the shade tree; no global image wobble or particle curtain.
    for (let i = 0; i < 3; i++) {
      const phase = (time + i * 14) % 48
      if (phase > 8)
        continue
      const x = 563 + i * 27 + Math.sin(phase * 0.75 + i) * 10
      const y = 318 + phase * 10 + i * 7
      context.save()
      context.translate(x, y)
      context.rotate(Math.sin(phase + i) * 0.7)
      context.globalAlpha = Math.sin(phase / 8 * Math.PI) * 0.6
      context.fillStyle = i % 2 ? '#a8aa54' : '#b7a662'
      context.beginPath()
      context.ellipse(0, 0, 2.4, 1, 0.5, 0, Math.PI * 2)
      context.fill()
      context.restore()
    }
  }

  return {
    background: images.landscape!,
    draw(context: CanvasRenderingContext2D, time: number, view: View) {
      const visible = (x: number, y: number, margin = 100) => x > view.x - margin && x < view.x + view.width + margin && y > view.y - margin && y < view.y + view.height + margin
      if (visible(sample.rotor.x, sample.rotor.y))
        rotor(context, time)
      if (view.x + view.width > 1300)
        water(context, time)
      if (visible(580, 370))
        flecks(context, time)
      const resident = residentPose(time)
      const actions = sample.hens.map((_, index) => {
        const hen = henPose(time, index)
        return { y: hen.y, draw() {
          if (!visible(hen.x, hen.y))
            return
          shadow(context, hen.x, hen.y, 10)
          sprite(context, 'hen', hen.frame, hen.x, hen.y - hen.lift, hen.height, hen.facing)
        } }
      })
      actions.push({ y: sample.resident.y, draw() {
        const { x, y, height } = sample.resident
        if (!visible(x, y))
          return
        shadow(context, x, y, 15)
        context.save()
        sprite(context, 'resident', resident.frame, x, y, height)
        context.globalAlpha = resident.blend
        sprite(context, 'resident', resident.next, x, y, height)
        context.restore()
      } })
      actions.sort((a, b) => a.y - b.y).forEach(action => action.draw())
    },
    dispose() {
      Object.values(images).forEach(image => image.close())
    },
  }
}
