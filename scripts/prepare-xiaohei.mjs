import { Buffer } from 'node:buffer'
import { copyFile, mkdir, writeFile } from 'node:fs/promises'
import process from 'node:process'
import sharp from 'sharp'

// Convert a selected GIF without redrawing its cels or changing their timing.
// Usage: node scripts/prepare-xiaohei.mjs [source.gif] [L06] [--keep-background]
const id = process.argv[3] ?? 'L06'
const keepBackground = process.argv.includes('--keep-background')
if (!/^L\d{2}$/.test(id))
  throw new Error('Expected an animation ID such as L06')
const directory = new URL(`../src/assets/companions/xiaohei/${id}/`, import.meta.url)
await mkdir(directory, { recursive: true })
const source = new URL(`${id}.gif`, directory)
if (process.argv[2])
  await copyFile(process.argv[2], source)
const metadata = await sharp(source.pathname, { animated: true }).metadata()
const { width, pageHeight: height, pages: count, delay } = metadata
if (!width || !height || !count || !delay)
  throw new Error('Expected a complete animated GIF')

// Browsers play GIF delays below 20 ms at 100 ms.
const delays = delay.map(value => value < 20 ? 100 : value)
function gcd(a, b) {
  while (b)
    [a, b] = [b, a % b]
  return a
}
// Equal CSS steps can preserve unequal GIF holds by repeating the same cel.
const step = delays.reduce(gcd)
const duration = delays.reduce((sum, value) => sum + value, 0)
const steps = duration / step

let left = width
let top = height
let right = 0
let bottom = 0
const frames = []
for (let page = 0; page < count; page++) {
  const original = await sharp(source.pathname, { page }).ensureAlpha().raw().toBuffer()
  if (keepBackground) {
    frames.push(original)
    continue
  }
  const frame = Buffer.from(original)
  const whitePixel = pixel => original[pixel * 4 + 3] === 0 || Math.min(original[pixel * 4], original[pixel * 4 + 1], original[pixel * 4 + 2]) >= 245
  const background = new Uint8Array(width * height)
  const queue = []
  function visit(pixel) {
    if (!background[pixel] && whitePixel(pixel)) {
      background[pixel] = 1
      queue.push(pixel)
    }
  }
  // Flood only the exterior white, preserving enclosed white eyes and details.
  for (let x = 0; x < width; x++) {
    visit(x)
    visit((height - 1) * width + x)
  }
  for (let y = 0; y < height; y++) {
    visit(y * width)
    visit(y * width + width - 1)
  }
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const pixel = queue[cursor]
    const x = pixel % width
    const y = Math.floor(pixel / width)
    if (x > 0)
      visit(pixel - 1)
    if (x + 1 < width)
      visit(pixel + 1)
    if (y > 0)
      visit(pixel - width)
    if (y + 1 < height)
      visit(pixel + width)
  }
  const white = offset => background[offset / 4] === 1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4
      if (white(offset) || original[offset + 3] === 0) {
        frame.fill(0, offset, offset + 4)
        continue
      }
      // Only decontaminate the one-pixel contour next to the white background.
      // Project onto nearby original outline colors to recover fractional alpha.
      let touchesWhite = false
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (x + dx >= 0 && x + dx < width && y + dy >= 0 && y + dy < height)
            touchesWhite ||= white(((y + dy) * width + x + dx) * 4)
        }
      }
      if (touchesWhite) {
        let best
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            if (x + dx < 0 || x + dx >= width || y + dy < 0 || y + dy >= height)
              continue
            const neighbor = ((y + dy) * width + x + dx) * 4
            if (Math.min(...original.subarray(neighbor, neighbor + 3)) > 175)
              continue
            let dot = 0
            let length = 0
            for (let channel = 0; channel < 3; channel++) {
              const component = 255 - original[neighbor + channel]
              dot += (255 - original[offset + channel]) * component
              length += component * component
            }
            const alpha = dot / length
            if (alpha <= 0 || alpha >= 0.98)
              continue
            let error = 0
            for (let channel = 0; channel < 3; channel++)
              error += (original[offset + channel] - (alpha * original[neighbor + channel] + (1 - alpha) * 255)) ** 2
            const score = error + (dx * dx + dy * dy) * 2
            if (error < 90 && (!best || score < best.score))
              best = { alpha, score }
          }
        }
        if (best) {
          for (let channel = 0; channel < 3; channel++)
            frame[offset + channel] = Math.max(0, Math.min(255, Math.round((original[offset + channel] - (1 - best.alpha) * 255) / best.alpha)))
          frame[offset + 3] = Math.round(best.alpha * original[offset + 3])
        }
      }
      left = Math.min(left, x)
      top = Math.min(top, y)
      right = Math.max(right, x)
      bottom = Math.max(bottom, y)
    }
  }
  frames.push(frame)
}

// One common crop for every cel prevents position changes / animation jitter.
left = Math.max(0, left - 2)
top = Math.max(0, top - 2)
const crop = keepBackground
  ? { left: 0, top: 0, width, height }
  : { left, top, width: Math.min(width, right + 3) - left, height: Math.min(height, bottom + 3) - top }
const stripWidth = crop.width * steps
if (stripWidth > 16383)
  throw new Error(`Animation strip exceeds WebP's width limit: ${stripWidth}px`)
const cels = await Promise.all(frames.map(frame => sharp(frame, { raw: { width, height, channels: 4 } }).extract(crop).png().toBuffer()))
let leftOffset = 0
const inputs = cels.flatMap((input, index) => Array.from({ length: delays[index] / step }, () => {
  const left = leftOffset
  leftOffset += crop.width
  return { input, left, top: 0 }
}))
await sharp({ create: { width: stripWidth, height: crop.height, channels: 4, background: '#00000000' } })
  .composite(inputs)
  .webp({ lossless: true })
  .toFile(new URL('rest-strip.webp', directory).pathname)
await sharp(cels[0]).webp({ lossless: true }).toFile(new URL('poster.webp', directory).pathname)
await writeFile(new URL('animation.json', directory), `${JSON.stringify({ width: crop.width, height: crop.height, count: steps, duration }, null, 2)}\n`)
console.log(`${id}: ${count} original cels, ${steps} steps at ${step} ms, ${crop.width} × ${crop.height}; ${keepBackground ? 'background preserved' : 'white matte removed'}`)
