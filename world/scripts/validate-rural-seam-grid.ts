import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'
import sharp from 'sharp'
import { nativeBoundary } from './rural-assembly'

// Further bounded tests use the already retained native atlas as their common base.
const root = resolve('world/assets/rural-pilot-v3/validation')
const presets = {
  'horizontal-left': [0, 362],
  'vertical-upper': [1086, 0],
  'vertical-middle': [1086, 724],
  'junction': [1086, 362],
} as const
const [operation, stageName, basePath, candidatePath, versionArg] = process.argv.slice(2)
const version = versionArg || 'v1'
if (!['v1', 'v2'].includes(version))
  throw new Error('Unknown iteration')
if (!(stageName in presets) || !basePath)
  throw new Error('Usage: prepare/apply STAGE BASE [CANDIDATE]')
const stage = stageName as keyof typeof presets
const [offsetX, offsetY] = presets[stage]
const width = 4344
const height = 1448
const frameWidth = 2172
const frameHeight = 724
const hash = (data: Uint8Array) => createHash('sha256').update(data).digest('hex')
const read = (path: string) => sharp(resolve(path)).removeAlpha().toColourspace('srgb').raw().toBuffer({ resolveWithObject: true })
const base = await read(basePath)
if (base.info.width !== width || base.info.height !== height)
  throw new Error('Base changed size; no automatic resizing')
function extract(pixels: Buffer, x: number = offsetX, y: number = offsetY, w = frameWidth, h = frameHeight) {
  const result = Buffer.alloc(w * h * 3)
  for (let row = 0; row < h; row++) {
    const start = ((y + row) * width + x) * 3
    pixels.copy(result, row * w * 3, start, start + w * 3)
  }
  return result
}
async function save(pixels: Buffer, w: number, h: number, name: string) {
  await sharp(pixels, { raw: { width: w, height: h, channels: 3 } }).png().toFile(resolve(root, name))
}
const input = extract(base.data)
if (operation === 'prepare') {
  await save(input, frameWidth, frameHeight, `${stage}-input.png`)
  await writeFile(resolve(root, `${stage}-plan.json`), `${JSON.stringify({ stage, basePath, offsets: [offsetX, offsetY], frame: [frameWidth, frameHeight], pixelSha256: hash(input), noResize: true }, null, 2)}\n`)
}
else if (operation === 'apply' && candidatePath) {
  const nativeCandidate = await read(candidatePath)
  if (nativeCandidate.info.height !== frameHeight || ![2171, frameWidth].includes(nativeCandidate.info.width))
    throw new Error(`Candidate changed native frame to ${nativeCandidate.info.width}×${nativeCandidate.info.height}`)
  // A missing outermost context column is outside every accepted local region.
  // Retain that one original column; never resize the generated repair.
  const candidate = { data: Buffer.from(input) }
  for (let y = 0; y < frameHeight; y++) {
    const from = y * nativeCandidate.info.width * 3
    nativeCandidate.data.copy(candidate.data, y * frameWidth * 3, from, from + nativeCandidate.info.width * 3)
  }
  const cost = (x: number, y: number) => {
    const p = (y * frameWidth + x) * 3
    const next = (Math.min(y + 1, 723) * frameWidth + Math.min(x + 1, 2171)) * 3
    let sum = 0
    for (let c = 0; c < 3; c++) {
      sum += Math.abs(input[p + c] - candidate.data[p + c])
      sum += (Math.abs(input[p + c] - input[next + c]) + Math.abs(candidate.data[p + c] - candidate.data[next + c])) * 0.5
    }
    return sum
  }
  const vertical = stage.startsWith('vertical')
  const top = vertical ? new Int16Array(frameWidth) : nativeBoundary(frameWidth, stage === 'junction' ? 120 : 20, 200, cost)
  const bottomLow = stage === 'junction' ? 430 : 440
  const bottom = vertical
    ? new Int16Array(frameWidth).fill(frameHeight)
    : nativeBoundary(frameWidth, bottomLow, 680, (x, y) => {
        const protect = stage === 'junction' ? x < 1030 : x >= 980
        return protect && y > bottomLow ? 100000 : cost(x, y)
      })
  const leftLow = stage === 'vertical-middle' ? 1030 : stage === 'junction' ? 820 : 860
  const leftHigh = stage === 'vertical-middle' ? 1070 : stage === 'junction' ? 960 : 930
  const left = stage === 'horizontal-left' ? new Int16Array(frameHeight) : nativeBoundary(frameHeight, leftLow, leftHigh, (y, x) => cost(x, y))
  // Include the complete reconstructed gate and its end post, rather than cutting its rail.
  const right = stage === 'horizontal-left' ? new Int16Array(frameHeight).fill(frameWidth) : nativeBoundary(frameHeight, stage === 'vertical-upper' ? 1360 : 1200, stage === 'vertical-upper' ? 1490 : 1360, (y, x) => cost(x, y))
  const inside = (x: number, y: number) => x >= 0 && x < frameWidth && y >= 0 && y < frameHeight && x >= left[y] && x < right[y] && y >= top[x] && y < bottom[x]
  const result = Buffer.from(base.data)
  let acceptedPixels = 0
  for (let y = 0; y < frameHeight; y++) {
    for (let x = 0; x < frameWidth; x++) {
      if (!inside(x, y))
        continue
      const to = ((offsetY + y) * width + offsetX + x) * 3
      const from = (y * frameWidth + x) * 3
      candidate.data.copy(result, to, from, from + 3)
      acceptedPixels++
    }
  }
  let changedOutside = 0
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (inside(x - offsetX, y - offsetY))
        continue
      const p = (y * width + x) * 3
      changedOutside += Number(result[p] !== base.data[p] || result[p + 1] !== base.data[p + 1] || result[p + 2] !== base.data[p + 2])
    }
  }
  if (changedOutside)
    throw new Error('Pixels outside accepted region changed')
  await save(extract(result), frameWidth, frameHeight, `${stage}-retained-${version}.png`)
  await save(result, width, height, `pilot-${stage}-retained-${version}.png`)
  for (let i = 0; i < 4; i++) {
    const w = i === 3 ? 2171 : 2172
    const name = ['sl1', 'sr1', 'sl2', 'sr2'][i]
    await save(extract(result, (i % 2) * 2172, Math.floor(i / 2) * 724, w, 724), w, 724, `${name}-${stage}-connected-${version}.png`)
  }
  const report = { stage, status: 'awaiting-visual-review', basePath, candidatePath, nativeCandidateSize: [nativeCandidate.info.width, nativeCandidate.info.height], retainedOriginalContextColumns: frameWidth - nativeCandidate.info.width, sourcePixelSha256: hash(base.data), candidateFileSha256: hash(await readFile(resolve(candidatePath))), resultPixelSha256: hash(result), offsets: [offsetX, offsetY], top: [...top], bottom: [...bottom], left: [...left], right: [...right], acceptedPixels, changedOutsidePixelCount: changedOutside, resize: false, blend: false }
  await writeFile(resolve(root, `${stage}-retained-${version}.json`), `${JSON.stringify(report, null, 2)}\n`)
  process.stdout.write(`${stage}: ${acceptedPixels} accepted pixels; outside changes ${changedOutside}\n`)
}
else {
  throw new Error('Unknown operation')
}
