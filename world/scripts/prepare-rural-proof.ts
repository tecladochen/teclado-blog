import type { TiledManifest } from '../viewer/tiled-types'
import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = fileURLToPath(new URL('../../', import.meta.url))
const source = join(root, 'world/assets/rural-proof-v1')
const destination = join(root, 'public/world/rural-proof-v1')
const scratch = await mkdtemp(join(tmpdir(), 'teclado-rural-export-'))
const width = 4104
const height = 1872
const tileSize = 1024
const gutter = 2
const hash = (data: Buffer) => createHash('sha256').update(data).digest('hex')
interface Raster { data: Buffer, width: number, height: number }
const sources: TiledManifest['sources'] = []
const outputFiles = new Set<string>()

// Minimum-cost native-pixel boundary, no blur, opacity blend, stretching or resampling.
function seam(length: number, low: number, high: number, cost: (along: number, across: number) => number) {
  const step = 3
  const count = Math.floor((high - low) / step) + 1
  const spans = Math.ceil(length / step)
  const parents = new Int16Array(spans * count)
  let previous = new Float64Array(count)
  for (let a = 0; a < spans; a++) {
    const current = new Float64Array(count)
    for (let b = 0; b < count; b++) {
      let best = a === 0 ? 0 : Infinity
      let parent = b
      if (a > 0) {
        for (let c = Math.max(0, b - 1); c <= Math.min(count - 1, b + 1); c++) {
          const candidate = previous[c]! + Math.abs(c - b) * 8
          if (candidate < best) {
            best = candidate
            parent = c
          }
        }
      }
      current[b] = best + cost(a * step, low + b * step) + Math.abs(low + b * step - (low + high) / 2) * 0.06
      parents[a * count + b] = parent
    }
    previous = current
  }
  let cursor = previous.indexOf(Math.min(...previous))
  const result = new Int16Array(length)
  for (let a = spans - 1; a >= 0; a--) {
    for (let p = a * step; p < Math.min(length, (a + 1) * step); p++)
      result[p] = low + cursor * step
    cursor = parents[a * count + cursor]!
  }
  return result
}
function difference(a: Raster, ax: number, ay: number, b: Raster, bx: number, by: number) {
  const ai = (ay * a.width + ax) * 3
  const bi = (by * b.width + bx) * 3
  return Math.abs(a.data[ai]! - b.data[bi]!) + Math.abs(a.data[ai + 1]! - b.data[bi + 1]!) + Math.abs(a.data[ai + 2]! - b.data[bi + 2]!)
}

try {
  await mkdir(destination, { recursive: true })
  const rowSeams: number[][][] = []
  // Only one column's source rasters need to be decoded at a time.
  for (let column = 0; column < 2; column++) {
    const originals: Raster[] = []
    for (const row of ['rear', 'core', 'front']) {
      const id = `c${column}-${row}`
      const bytes = await readFile(join(source, `${id}.png`))
      const metadata = await sharp(bytes).metadata()
      const w = metadata.width!
      const h = metadata.height!
      if (w < 2160 || h < 720 || w > 2176 || h > 728)
        throw new Error(`${id}: native size requires review (${w}x${h})`)
      const left = Math.floor((w - 2160) / 2)
      const top = Math.floor((h - 720) / 2)
      const data = await sharp(bytes).removeAlpha().extract({ left, top, width: 2160, height: 720 }).raw().toBuffer()
      sources.push({ id, hash: hash(bytes), width: w, height: h, crop: [left, top, 2160, 720] })
      originals.push({ data, width: 2160, height: 720 })
    }
    const cuts = [
      seam(2160, 576, 610, (x, y) => difference(originals[0]!, x, y, originals[1]!, x, y - 576)),
      seam(2160, 1190, 1272, (x, y) => difference(originals[1]!, x, y - 576, originals[2]!, x, y - 1152)),
    ]
    rowSeams.push(cuts.map(cut => [...cut]))
    const data = Buffer.alloc(2160 * height * 3)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < 2160; x++) {
        const row = y < cuts[0]![x]! ? 0 : y < cuts[1]![x]! ? 1 : 2
        const from = ((y - row * 576) * 2160 + x) * 3
        const to = (y * 2160 + x) * 3
        originals[row]!.data.copy(data, to, from, from + 3)
      }
    }
    await sharp(data, { raw: { width: 2160, height, channels: 3 } }).png().toFile(join(scratch, `column-${column}.png`))
  }
  async function columnData(column: number): Promise<Raster> {
    return { data: await sharp(join(scratch, `column-${column}.png`)).removeAlpha().raw().toBuffer(), width: 2160, height }
  }
  const columns = [await columnData(0), await columnData(1)]
  const horizontal = seam(height, 1944, 2159, (y, x) => difference(columns[0]!, x, y, columns[1]!, x - 1944, y))
  function region(x: number, y: number, w: number, h: number, border = 0) {
    const outputWidth = w + border * 2
    const outputHeight = h + border * 2
    const data = Buffer.alloc(outputWidth * outputHeight * 3)
    for (let py = 0; py < outputHeight; py++) {
      const wy = Math.max(0, Math.min(height - 1, y + py - border))
      for (let px = 0; px < outputWidth; px++) {
        const wx = Math.max(0, Math.min(width - 1, x + px - border))
        const column = wx < horizontal[wy]! ? 0 : 1
        const from = (wy * 2160 + wx - column * 1944) * 3
        const to = (py * outputWidth + px) * 3
        columns[column]!.data.copy(data, to, from, from + 3)
      }
    }
    return sharp(data, { raw: { width: outputWidth, height: outputHeight, channels: 3 } })
  }
  async function publish(buffer: Buffer, label: string) {
    const filename = `${label}-${hash(buffer).slice(0, 12)}.webp`
    await writeFile(join(destination, filename), buffer)
    outputFiles.add(filename)
    return `/world/rural-proof-v1/${filename}`
  }
  const tiles: TiledManifest['tiles'] = []
  for (let row = 0; row < Math.ceil(height / tileSize); row++) {
    for (let column = 0; column < Math.ceil(width / tileSize); column++) {
      const x = column * tileSize
      const y = row * tileSize
      const w = Math.min(tileSize, width - x)
      const h = Math.min(tileSize, height - y)
      const encoded = await region(x, y, w, h, gutter).webp({ quality: 88, effort: 5 }).toBuffer()
      const id = `${column}-${row}`
      tiles.push({ id, column, row, x, y, width: w, height: h, src: await publish(encoded, `tile-${id}`), bytes: encoded.length, decodedBytes: (w + gutter * 2) * (h + gutter * 2) * 4 })
    }
  }
  const previews: TiledManifest['previews'] = []
  for (let x = 0; x < width; x += 2048) {
    const w = Math.min(2048, width - x)
    const encoded = await region(x, 0, w, height).resize({ width: Math.min(640, w) }).webp({ quality: 65, effort: 4 }).toBuffer()
    previews.push({ x, width: w, src: await publish(encoded, `preview-${x}`), bytes: encoded.length })
  }
  // A project-external QA image; never shipped as a giant texture.
  await region(0, 0, width, height).resize({ width: 1642 }).png().toFile('/private/tmp/teclado-rural-proof-review.png')
  const manifest: TiledManifest = { version: 1, status: 'rural-static-proof', width, height, tileSize, gutter, maxScale: 0.75, initialCenter: [1350, height / 2], tiles, previews, sources }
  await writeFile(join(root, 'world/data/rural-proof-v1.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  await writeFile(join(source, 'export.json'), `${JSON.stringify({ recipe: 'native-q88-gutter2-v1', sources, rowSeams, horizontal: [...horizontal] }, null, 2)}\n`)
  for (const filename of await readdir(destination)) {
    if (!outputFiles.has(filename))
      await rm(join(destination, filename))
  }
  console.log(JSON.stringify({ width, height, tiles: tiles.length, detailBytes: tiles.reduce((n, t) => n + t.bytes, 0), previewBytes: previews.reduce((n, p) => n + p.bytes, 0), decodedBytes: tiles.reduce((n, t) => n + t.decodedBytes, 0) }))
}
finally {
  await rm(scratch, { recursive: true, force: true })
}
