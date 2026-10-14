import type { TiledManifest } from '../viewer/tiled-types'
import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'

export const workWidth = 2160
export const workHeight = 720
export const stepX = 1944
export const stepY = 576
export const worldHeight = 1872
export interface Raster { data: Buffer, width: number, height: number }
export interface SharedEdge { x: number, y: number, width: number, height: number, source: Raster, sourceX: number, sourceY: number }
export interface RuralColumn { core: Raster, rear: Raster, front: Raster, composed: Raster }
export interface SourceRecord { id: string, hash: string, width: number, height: number, crop: number[], registrationMeanError: number | null, normalizedTo?: number[] }

export const sha256 = (data: Buffer) => createHash('sha256').update(data).digest('hex')

export function edgeFrom(source: Raster, side: 'left' | 'above' | 'below'): SharedEdge {
  if (side === 'left')
    return { x: 0, y: 0, width: 216, height: 720, source, sourceX: 1944, sourceY: 0 }
  if (side === 'above')
    return { x: 0, y: 0, width: 2160, height: 144, source, sourceX: 0, sourceY: 576 }
  return { x: 0, y: 576, width: 2160, height: 144, source, sourceX: 0, sourceY: 0 }
}

/** Every shared world pixel comes from the same selected parent, without stretching or blending. */
export function copySharedEdges(target: Raster, edges: SharedEdge[]) {
  for (const edge of edges) {
    for (let y = 0; y < edge.height; y++) {
      const start = ((edge.sourceY + y) * edge.source.width + edge.sourceX) * 3
      const destination = ((edge.y + y) * target.width + edge.x) * 3
      edge.source.data.copy(target.data, destination, start, start + edge.width * 3)
    }
  }
}

function registrationError(raw: Raster, left: number, top: number, edges: SharedEdge[]) {
  let error = 0
  let samples = 0
  for (const edge of edges) {
    for (let y = 0; y < edge.height; y += 6) {
      for (let x = 0; x < edge.width; x += 6) {
        const original = ((top + edge.y + y) * raw.width + left + edge.x + x) * 3
        const parent = ((edge.sourceY + y) * edge.source.width + edge.sourceX + x) * 3
        for (let channel = 0; channel < 3; channel++)
          error += Math.abs(raw.data[original + channel]! - edge.source.data[parent + channel]!)
        samples += 3
      }
    }
  }
  return error / samples
}

export async function readWork(source: string, id: string, edges: SharedEdge[], records: SourceRecord[]) {
  const bytes = await readFile(join(source, `${id}.png`))
  const { data, info } = await sharp(bytes).removeAlpha().toColourspace('srgb').raw().toBuffer({ resolveWithObject: true })
  const { width, height } = info
  if (width < workWidth || height < workHeight || width > 2200 || height > 750)
    throw new Error(`${id}: native size requires review (${width}x${height})`)
  const raw = { data, width, height }
  let left = Math.floor((width - workWidth) / 2)
  let top = Math.floor((height - workHeight) / 2)
  let best = Infinity
  if (edges.length) {
    for (let y = 0; y <= height - workHeight; y++) {
      for (let x = 0; x <= width - workWidth; x++) {
        const error = registrationError(raw, x, y, edges)
        if (error < best) {
          best = error
          left = x
          top = y
        }
      }
    }
  }
  const output = Buffer.alloc(workWidth * workHeight * 3)
  for (let y = 0; y < workHeight; y++) {
    const start = ((top + y) * width + left) * 3
    data.copy(output, y * workWidth * 3, start, start + workWidth * 3)
  }
  const raster = { data: output, width: workWidth, height: workHeight }
  copySharedEdges(raster, edges)
  records.push({ id, hash: sha256(bytes), width, height, crop: [left, top, workWidth, workHeight], registrationMeanError: edges.length ? best : null })
  return raster
}

export async function readColumn(source: string, index: number, previous: RuralColumn | undefined, records: SourceRecord[]): Promise<RuralColumn> {
  const core = await readWork(source, `c${index}-core`, previous ? [edgeFrom(previous.core, 'left')] : [], records)
  const rear = await readWork(source, `c${index}-rear`, [edgeFrom(core, 'below'), ...(previous ? [edgeFrom(previous.rear, 'left')] : [])], records)
  const front = await readWork(source, `c${index}-front`, [edgeFrom(core, 'above'), ...(previous ? [edgeFrom(previous.front, 'left')] : [])], records)
  const composed: Raster = { data: Buffer.alloc(workWidth * worldHeight * 3), width: workWidth, height: worldHeight }
  for (let y = 0; y < worldHeight; y++) {
    const row = y < 648 ? 0 : y < 1224 ? 1 : 2
    const raster = [rear, core, front][row]!
    const start = (y - row * stepY) * workWidth * 3
    raster.data.copy(composed.data, y * workWidth * 3, start, start + workWidth * 3)
  }
  return { core, rear, front, composed }
}

export function manifestSources(records: SourceRecord[]): TiledManifest['sources'] {
  return records.map(({ registrationMeanError: _, ...record }) => record)
}

export interface Rectangle { x: number, y: number, width: number, height: number }
export interface PatchSpec extends Rectangle { id: string, border: number }

/** Clamp only sampling gutters; scene pixels keep their native positions and scale. */
export function region(source: Raster, rectangle: Rectangle, gutter = 0): Raster {
  if (rectangle.x < 0 || rectangle.y < 0 || rectangle.width < 1 || rectangle.height < 1 || rectangle.x + rectangle.width > source.width || rectangle.y + rectangle.height > source.height || !Number.isInteger(gutter) || gutter < 0)
    throw new Error('Invalid scene region or sampling gutter')
  const width = rectangle.width + gutter * 2
  const height = rectangle.height + gutter * 2
  const data = Buffer.alloc(width * height * 3)
  for (let y = 0; y < height; y++) {
    const sy = Math.max(0, Math.min(source.height - 1, rectangle.y + y - gutter))
    for (let x = 0; x < width; x++) {
      const sx = Math.max(0, Math.min(source.width - 1, rectangle.x + x - gutter))
      const from = (sy * source.width + sx) * 3
      source.data.copy(data, (y * width + x) * 3, from, from + 3)
    }
  }
  return { data, width, height }
}

/** Shared template pixels aid placement, but must not be pasted as visible rectangles. */
export async function assembleNative(source: string, count: number) {
  if (!Number.isInteger(count) || count < 1)
    throw new Error('A rural scene needs at least one complete column')
  const records: SourceRecord[] = []
  const atlas: Raster = { data: Buffer.alloc((workWidth + (count - 1) * stepX) * worldHeight * 3), width: workWidth + (count - 1) * stepX, height: worldHeight }
  let previous: RuralColumn | undefined
  for (let column = 0; column < count; column++) {
    // The canonical reference reproduces the templates used to paint the next images.
    previous = await readColumn(source, column, previous, records)
    const rows: Raster[] = []
    for (const name of ['rear', 'core', 'front']) {
      const id = `c${column}-${name}`
      const record = records.find(r => r.id === id)!
      const data = await sharp(join(source, `${id}.png`)).removeAlpha().toColourspace('srgb').extract({ left: record.crop[0]!, top: record.crop[1]!, width: workWidth, height: workHeight }).raw().toBuffer()
      rows.push({ data, width: workWidth, height: workHeight })
    }
    const firstX = column === 0 ? 0 : workWidth - stepX
    for (let y = 0; y < worldHeight; y++) {
      const row = y < stepY ? 0 : y < stepY + workHeight ? 1 : 2
      const start = ((y - row * stepY) * workWidth + firstX) * 3
      const destination = (y * atlas.width + column * stepX + firstX) * 3
      rows[row]!.data.copy(atlas.data, destination, start, start + (workWidth - firstX) * 3)
    }
  }
  return { atlas, records }
}

/** Choose a connected boundary through matching native pixels, without alpha blending. */
export function nativeBoundary(length: number, low: number, high: number, cost: (along: number, across: number) => number) {
  if (length < 1 || low < 0 || high < low)
    throw new Error('Invalid boundary range')
  const stride = 3
  const span = Math.ceil(length / stride)
  const count = Math.floor((high - low) / stride) + 1
  const parents = new Int16Array(span * count)
  let previous = new Float64Array(count)
  for (let a = 0; a < span; a++) {
    const next = new Float64Array(count)
    for (let b = 0; b < count; b++) {
      let best = a === 0 ? 0 : Infinity
      let parent = b
      if (a) {
        for (let c = Math.max(0, b - 1); c <= Math.min(count - 1, b + 1); c++) {
          const candidate = previous[c]! + Math.abs(c - b) * 12
          if (candidate < best) {
            best = candidate
            parent = c
          }
        }
      }
      next[b] = best + cost(Math.min(length - 1, a * stride), low + b * stride)
      parents[a * count + b] = parent
    }
    previous = next
  }
  let cursor = previous.indexOf(Math.min(...previous))
  const result = new Int16Array(length)
  for (let a = span - 1; a >= 0; a--) {
    for (let p = a * stride; p < Math.min(length, (a + 1) * stride); p++)
      result[p] = low + cursor * stride
    cursor = parents[a * count + cursor]!
  }
  return result
}

function pixelDifference(a: Raster, b: Raster, x: number, y: number) {
  const p = (y * a.width + x) * 3
  return Math.abs(a.data[p]! - b.data[p]!) + Math.abs(a.data[p + 1]! - b.data[p + 1]!) + Math.abs(a.data[p + 2]! - b.data[p + 2]!)
}

export async function applyNativePatch(atlas: Raster, source: string, patch: PatchSpec, records: SourceRecord[]) {
  if (patch.x < 0 || patch.y < 0 || patch.x + patch.width > atlas.width || patch.y + patch.height > atlas.height || patch.border < 12 || patch.border * 2 >= Math.min(patch.width, patch.height))
    throw new Error(`${patch.id}: invalid native patch placement`)
  const bytes = await readFile(join(source, `${patch.id}.png`))
  let { data, info } = await sharp(bytes).removeAlpha().toColourspace('srgb').raw().toBuffer({ resolveWithObject: true })
  const originalSize = [info.width, info.height]
  let normalizedTo: number[] | undefined
  // The built-in editor returned two portrait repairs ~1.4% below their requested frame.
  // Only repairs may receive this bounded framing correction; working tiles never do.
  if (info.width < patch.width || info.height < patch.height) {
    if (Math.abs(info.width / patch.width - 1) > 0.02 || Math.abs(info.height / patch.height - 1) > 0.02 || Math.abs(info.width / info.height / (patch.width / patch.height) - 1) > 0.003)
      throw new Error(`${patch.id}: repair changed native scale (${info.width}x${info.height})`)
    const normalized = await sharp(bytes).removeAlpha().toColourspace('srgb').resize(patch.width, patch.height, { fit: 'cover', position: 'centre' }).raw().toBuffer({ resolveWithObject: true })
    data = normalized.data
    info = normalized.info
    normalizedTo = [patch.width, patch.height]
  }
  if (info.width - patch.width > 24 || info.height - patch.height > 24)
    throw new Error(`${patch.id}: repair changed native scale (${info.width}x${info.height})`)
  const original = region(atlas, patch)
  const raw: Raster = { data, width: info.width, height: info.height }
  let cropX = 0
  let cropY = 0
  let best = Infinity
  // Register against the unchanged outer context, never stretch the generated repair.
  for (let top = 0; top <= info.height - patch.height; top++) {
    for (let left = 0; left <= info.width - patch.width; left++) {
      let error = 0
      let samples = 0
      for (let y = 0; y < patch.height; y += 12) {
        for (let x = 0; x < patch.width; x += 12) {
          if (x > patch.border && x < patch.width - patch.border && y > patch.border && y < patch.height - patch.border)
            continue
          const a = ((y + top) * raw.width + x + left) * 3
          const b = (y * original.width + x) * 3
          for (let c = 0; c < 3; c++)
            error += Math.abs(raw.data[a + c]! - original.data[b + c]!)
          samples += 3
        }
      }
      if (error / samples < best) {
        best = error / samples
        cropX = left
        cropY = top
      }
    }
  }
  const repaired = region(raw, { x: cropX, y: cropY, width: patch.width, height: patch.height })
  const delta = (x: number, y: number) => pixelDifference(original, repaired, x, y)
  const left = nativeBoundary(patch.height, 12, patch.border, (y, x) => delta(x, y))
  const right = nativeBoundary(patch.height, patch.width - patch.border, patch.width - 13, (y, x) => delta(x, y))
  const top = nativeBoundary(patch.width, 12, patch.border, (x, y) => delta(x, y))
  const bottom = nativeBoundary(patch.width, patch.height - patch.border, patch.height - 13, (x, y) => delta(x, y))
  for (let y = 0; y < patch.height; y++) {
    for (let x = left[y]!; x < right[y]!; x++) {
      if (y < top[x]! || y >= bottom[x]!)
        continue
      const from = (y * repaired.width + x) * 3
      const to = ((y + patch.y) * atlas.width + x + patch.x) * 3
      repaired.data.copy(atlas.data, to, from, from + 3)
    }
  }
  records.push({ id: patch.id, hash: sha256(bytes), width: originalSize[0]!, height: originalSize[1]!, crop: [cropX, cropY, patch.width, patch.height], registrationMeanError: best, ...(normalizedTo ? { normalizedTo } : {}) })
  return { id: patch.id, crop: [cropX, cropY, patch.width, patch.height], left: [...left], right: [...right], top: [...top], bottom: [...bottom] }
}
