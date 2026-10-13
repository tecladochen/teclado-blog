import { sample } from './definition'

export function henPose(time: number, index: number) {
  const hen = sample.hens[index]!
  const cycle = 64
  const moment = ((time + hen.phase) % cycle + cycle) % cycle
  const segment = Math.floor(moment / 16)
  const elapsed = moment % 16
  const from = hen.route[segment]!
  const to = hen.route[(segment + 1) % hen.route.length]!
  const walking = elapsed < 10
  const progress = Math.min(1, elapsed / 10)
  return {
    x: from[0]! + (to[0]! - from[0]!) * progress,
    y: from[1]! + (to[1]! - from[1]!) * progress,
    facing: to[0]! > from[0]! ? -1 : 1,
    frame: walking ? Math.floor(elapsed * 4) % 2 : elapsed > 12 && Math.sin(elapsed * 3) > 0 ? 3 : 2,
    lift: walking ? Math.abs(Math.sin(elapsed * Math.PI * 4)) * 0.7 : 0,
    height: hen.height,
  }
}

export function residentPose(time: number) {
  const moment = time % 22
  // A brief local sorting gesture, with long still intervals so the scene can breathe.
  const frames = [0, 1, 2, 3, 1, 0]
  const step = moment < 14 ? 0 : Math.min(5, Math.floor((moment - 14) / 1.3))
  const blend = moment < 14 ? 0 : Math.min(1, (moment - 14) / 1.3 - step) / 0.45
  return { frame: frames[step]!, next: frames[Math.min(5, step + 1)]!, blend: Math.min(1, blend) }
}
