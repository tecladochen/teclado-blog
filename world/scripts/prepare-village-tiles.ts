import { createHash } from 'node:crypto'
import { mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = fileURLToPath(new URL('../../', import.meta.url))
const source = `${root}world/assets/village-tiles-v3/`
const destination = `${root}public/world/village-tiles-v3/`
await mkdir(destination, { recursive: true })
const width = 2170
const geometry = [{ id: 'rear', top: 0 }, { id: 'core', top: 524 }, { id: 'front', top: 1048 }]
const masters = await Promise.all(geometry.map(async (tile) => {
  const original = await readFile(`${source}${tile.id}.png`)
  const { data, info } = await sharp(original).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  if (info.width < 2170 || info.width > 2172 || info.height < 724 || info.height > 725)
    throw new Error(`${tile.id}: changed local pixel scale; review placement before export`)
  return { ...tile, original, data, width: info.width, height: info.height, channels: info.channels }
}))
const height = masters[2]!.top + masters[2]!.height

// Walk horizontally through shared foliage/grass. Only vector masks are made;
// each source raster retains its original pixel scale and colours.
function horizontalSeam(upper: typeof masters[number], lower: typeof masters[number], from: number, to: number) {
  const step = 5
  const columns = Math.ceil(width / step) + 1
  const candidates = Math.floor((to - from) / step) + 1
  const parents = new Int16Array(columns * candidates)
  let previous = new Float64Array(candidates)
  const sample = (tile: typeof masters[number], x: number, y: number, channel: number) => {
    const px = Math.max(0, Math.min(tile.width - 1, Math.round(x)))
    const py = Math.max(0, Math.min(tile.height - 1, Math.round(y - tile.top)))
    return tile.data[(py * tile.width + px) * tile.channels + channel]!
  }
  for (let column = 0; column < columns; column++) {
    const current = new Float64Array(candidates)
    const x = Math.min(width, column * step)
    for (let candidate = 0; candidate < candidates; candidate++) {
      const y = from + candidate * step
      let error = 0
      for (const offset of [-5, 0, 5]) {
        for (let channel = 0; channel < 3; channel++)
          error += Math.abs(sample(upper, x, y + offset, channel) - sample(lower, x, y + offset, channel))
      }
      error = error / 9 + Math.abs(y - (from + to) / 2) * 0.08
      let parent = candidate
      let best = column === 0 ? 0 : Infinity
      if (column > 0) {
        for (let neighbour = Math.max(0, candidate - 1); neighbour <= Math.min(candidates - 1, candidate + 1); neighbour++) {
          const cost = previous[neighbour]! + Math.abs(candidate - neighbour) * 8
          if (cost < best) {
            best = cost
            parent = neighbour
          }
        }
      }
      current[candidate] = best + error
      parents[column * candidates + candidate] = parent
    }
    previous = current
  }
  let cursor = previous.indexOf(Math.min(...previous))
  const points: number[][] = []
  for (let column = columns - 1; column >= 0; column--) {
    points.push([Math.min(width, column * step), from + cursor * step])
    cursor = parents[column * candidates + cursor]!
  }
  return points.reverse()
}

// These narrow ranges keep every roof and the village road/fence intact.
const seams = [horizontalSeam(masters[0]!, masters[1]!, 540, 590), horizontalSeam(masters[1]!, masters[2]!, 1185, 1230)]
const boundaries = [[[0, 0], [width, 0]], ...seams, [[0, height], [width, height]]]
const sections = []
for (const [index, tile] of masters.entries()) {
  const webp = await sharp(tile.original).webp({ quality: 90, effort: 6 }).toBuffer()
  const hash = createHash('sha256').update(webp).digest('hex').slice(0, 12)
  const filename = `${tile.id}-${hash}.webp`
  await writeFile(`${destination}${filename}`, webp)
  const outline = [...boundaries[index]!, ...boundaries[index + 1]!.toReversed()]
  sections.push({
    id: tile.id,
    start: 0,
    top: tile.top,
    width: tile.width,
    height: tile.height,
    clip: [0, width],
    bounds: [0, Math.min(...outline.map(p => p[1]!)), width, Math.max(...outline.map(p => p[1]!))],
    outline,
    src: `/world/village-tiles-v3/${filename}`,
    pixelWidth: tile.width,
    pixelHeight: tile.height,
    bytes: webp.length,
    decodedBytes: tile.width * tile.height * 4,
    sourceHash: createHash('sha256').update(tile.original).digest('hex'),
  })
}
const manifest = {
  version: 3,
  status: 'village-space-proof',
  width,
  height,
  initialCenter: [width / 2, height / 2],
  maxScale: 0.75,
  views: [
    { name: '村落全景', center: [1085, height / 2], fit: true },
    { name: '院落日常', center: [640, 900] },
    { name: '后巷邻里', center: [1020, 360] },
    { name: '前方田渠', center: [1100, 1420] },
    { name: '菜园育苗', center: [1610, 900] },
  ],
  seams,
  sections,
}
await writeFile(`${root}world/data/village-tiles-v3.json`, `${JSON.stringify(manifest, null, 2)}\n`)
const current = new Set(sections.map(section => section.src.split('/').pop()))
for (const filename of await readdir(destination)) {
  if (/^(?:rear|core|front)-[a-f0-9]{12}\.webp$/.test(filename) && !current.has(filename))
    await unlink(`${destination}${filename}`)
}
console.log(JSON.stringify({ width, height, sections: sections.map(({ id, bytes, decodedBytes }) => ({ id, bytes, decodedBytes })), totalBytes: sections.reduce((sum, tile) => sum + tile.bytes, 0) }))
