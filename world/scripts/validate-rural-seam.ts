import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'
import sharp from 'sharp'
import { nativeBoundary } from './rural-assembly'

// Native-pixel preparation/assembly for the bounded v3 experiment, not a publishing pipeline.
const root = resolve('world/assets/rural-pilot-v3')
const validation = resolve(root, 'validation')
const worldWidth = 4344
const worldHeight = 1448
const windowRect = { left: 2172, top: 362, width: 2172, height: 724 }
const sourceNames = ['sl1-v1', 'sr1-v1', 'sl2-v1', 'sr2-v1']
const hash = (data: Uint8Array) => createHash('sha256').update(data).digest('hex')

async function basePixels() {
  const result = Buffer.alloc(worldWidth * worldHeight * 3, 224)
  for (let i = 0; i < sourceNames.length; i++) {
    const { data, info } = await sharp(resolve(root, `${sourceNames[i]}.png`)).removeAlpha().toColourspace('srgb').raw().toBuffer({ resolveWithObject: true })
    if (info.height !== 724 || info.width !== (i === 3 ? 2171 : 2172))
      throw new Error('Source size changed; review before proceeding')
    for (let y = 0; y < info.height; y++) {
      const destination = ((Math.floor(i / 2) * 724 + y) * worldWidth + (i % 2) * 2172) * 3
      data.copy(result, destination, y * info.width * 3, (y + 1) * info.width * 3)
    }
  }
  return result
}

function extract(data: Buffer) {
  const result = Buffer.alloc(windowRect.width * windowRect.height * 3)
  for (let y = 0; y < windowRect.height; y++) {
    const start = ((windowRect.top + y) * worldWidth + windowRect.left) * 3
    data.copy(result, y * windowRect.width * 3, start, start + windowRect.width * 3)
  }
  return result
}

async function png(data: Buffer, width: number, height: number, path: string) {
  await sharp(data, { raw: { width, height, channels: 3 } }).png().toFile(path)
}

await mkdir(validation, { recursive: true })
const original = await basePixels()
const input = extract(original)
const [operation, candidatePath] = process.argv.slice(2)
if (operation === 'prepare') {
  await png(input, windowRect.width, windowRect.height, resolve(validation, 'horizontal-right-input.png'))
  await writeFile(resolve(validation, 'horizontal-right-plan.json'), `${JSON.stringify({
    status: 'awaiting-local-edit',
    sourceNames,
    world: [worldWidth, worldHeight],
    windowRect,
    seamInWindow: 362,
    requestedEditBand: [200, 490],
    inputPixelSha256: hash(input),
    noResize: true,
    evaluation: ['geometry at former seam', 'new patch perimeter', 'native sharpness', 'unchanged pixels outside accepted region'],
  }, null, 2)}\n`)
}
else if ((operation === 'inspect' || operation === 'apply') && candidatePath) {
  const bytes = await readFile(resolve(candidatePath))
  const { data, info } = await sharp(bytes).removeAlpha().toColourspace('srgb').raw().toBuffer({ resolveWithObject: true })
  if (info.width !== windowRect.width || info.height !== windowRect.height)
    throw new Error(`Candidate ${info.width}×${info.height} differs from ${windowRect.width}×${windowRect.height}; no automatic resizing`)
  const bands = [[0, 200], [200, 490], [490, 724]]
  const differences = bands.map(([start, end]) => {
    let sum = 0
    let changed = 0
    for (let p = start * info.width * 3; p < end * info.width * 3; p++) {
      sum += Math.abs(data[p] - input[p])
      changed += Number(data[p] !== input[p])
    }
    const count = (end - start) * info.width * 3
    return { rows: [start, end], meanChannelDifference: sum / count, changedChannelFraction: changed / count }
  })
  const report = { status: 'awaiting-visual-review', nativeSize: [info.width, info.height], candidateSha256: hash(bytes), differences }
  await writeFile(resolve(validation, 'horizontal-right-inspection.json'), `${JSON.stringify(report, null, 2)}\n`)
  process.stdout.write(`${JSON.stringify(report)}\n`)
  if (operation === 'apply') {
    // Select matching context without alpha blending; actual object continuity needs visual QA.
    // Keep the original nursery roof and other principal objects outside the accepted region.
    const repaired = Buffer.from(original)
    const cost = (x: number, y: number) => {
      const p = (y * info.width + x) * 3
      let difference = 0
      let gradient = 0
      for (let c = 0; c < 3; c++) {
        difference += Math.abs(data[p + c] - input[p + c])
        gradient += Math.abs(input[p + c] - input[p + info.width * 3 + c])
        gradient += Math.abs(data[p + c] - data[p + info.width * 3 + c])
      }
      return difference + gradient * 0.5
    }
    const top = nativeBoundary(2171, 20, 200, cost)
    const bottom = nativeBoundary(2171, 490, 680, (x, y) => {
      // The canopy is a complete object; do not route the selection through it.
      if (x < 1300 && y > 490)
        return 100000
      return cost(x, y)
    })
    let acceptedPixels = 0
    for (let x = 0; x < 2171; x++) {
      for (let y = top[x]; y < bottom[x]; y++) {
        const from = (y * info.width + x) * 3
        const to = ((windowRect.top + y) * worldWidth + windowRect.left + x) * 3
        data.copy(repaired, to, from, from + 3)
        acceptedPixels++
      }
    }
    let changedOutside = 0
    for (let y = 0; y < worldHeight; y++) {
      for (let x = 0; x < worldWidth; x++) {
        const localX = x - windowRect.left
        const localY = y - windowRect.top
        if (localX >= 0 && localX < 2171 && localY >= top[localX] && localY < bottom[localX])
          continue
        const p = (y * worldWidth + x) * 3
        changedOutside += Number(original[p] !== repaired[p] || original[p + 1] !== repaired[p + 1] || original[p + 2] !== repaired[p + 2])
      }
    }
    if (changedOutside)
      throw new Error('Pixels outside the repair changed')
    await png(extract(repaired), windowRect.width, windowRect.height, resolve(validation, 'horizontal-right-retained-v1.png'))
    await png(repaired, worldWidth, worldHeight, resolve(validation, 'pilot-retained-v1.png'))
    for (const [name, topOffset, width] of [['sr1-connected-v1', 0, 2172], ['sr2-connected-v1', 724, 2171]] as const) {
      const tile = Buffer.alloc(width * 724 * 3)
      for (let y = 0; y < 724; y++) {
        const start = ((topOffset + y) * worldWidth + 2172) * 3
        repaired.copy(tile, y * width * 3, start, start + width * 3)
      }
      await png(tile, width, 724, resolve(validation, `${name}.png`))
    }
    await writeFile(resolve(validation, 'horizontal-right-retained-v1.json'), `${JSON.stringify({
      status: 'awaiting-visual-review-of-new-boundaries',
      sourcePixelSha256: hash(original),
      resultPixelSha256: hash(repaired),
      candidateSha256: hash(bytes),
      acceptedWindow: windowRect,
      top: [...top],
      bottom: [...bottom],
      acceptedPixels,
      unchangedOutsidePixelCount: worldWidth * worldHeight - acceptedPixels,
      changedOutsidePixelCount: changedOutside,
      resize: false,
      blend: false,
    }, null, 2)}\n`)
  }
}
else {
  throw new Error('Usage: validate-rural-seam.ts prepare | inspect CANDIDATE | apply CANDIDATE')
}
