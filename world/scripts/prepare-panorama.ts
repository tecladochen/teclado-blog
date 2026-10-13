import { createHash } from 'node:crypto'
import { mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { findSeam } from './panorama-seams'

const root = fileURLToPath(new URL('../../', import.meta.url))
const source = `${root}world/assets/panorama-v1/`
const destination = `${root}public/world/panorama-v1/`
await mkdir(destination, { recursive: true })
await mkdir(`${root}world/data`, { recursive: true })

const geometry = [
  { id: 'west', start: 0, source: 'west.png' },
  { id: 'middle', start: 2100, source: 'middle-v2.png' },
  { id: 'east', start: 4200, source: 'east.png' },
]
const masters = await Promise.all(geometry.map(async (section) => {
  const { data, info } = await sharp(`${source}${section.source}`).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  return { ...section, width: 3000, pixelWidth: info.width, pixelHeight: info.height, channels: info.channels, data }
}))
const seams = [
  findSeam(masters[0]!, masters[1]!, 1000, [[2000, 2420, 300, 600], [2100, 2390, 20, 290]]),
  findSeam(masters[1]!, masters[2]!, 1000, [[4660, 5100, 440, 800], [4550, 4920, 65, 260]]),
]
const boundaries = [[[0, 0], [0, 1000]], ...seams.map(seam => seam.points), [[7200, 0], [7200, 1000]]]
const sections = []
for (const [index, section] of geometry.entries()) {
  const original = await readFile(`${source}${section.source}`)
  const metadata = await sharp(original).metadata()
  if (!metadata.width || !metadata.height || metadata.width / metadata.height !== 3)
    throw new Error(`${section.id}: expected a 3:1 master`)
  // Preserve geometry and original resolution; this step only encodes delivery copies.
  const webp = await sharp(original).webp({ quality: 88, effort: 6 }).toBuffer()
  const hash = createHash('sha256').update(webp).digest('hex').slice(0, 12)
  const filename = `${section.id}-${hash}.webp`
  await writeFile(`${destination}${filename}`, webp)
  sections.push({
    ...section,
    clip: [Math.min(...boundaries[index]!.map(point => point[0]!)), Math.max(...boundaries[index + 1]!.map(point => point[0]!))],
    outline: [...boundaries[index + 1]!, ...boundaries[index]!.toReversed()],
    width: 3000,
    src: `/world/panorama-v1/${filename}`,
    pixelWidth: metadata.width,
    pixelHeight: metadata.height,
    bytes: webp.length,
    decodedBytes: metadata.width * metadata.height * 4,
    sourceHash: createHash('sha256').update(original).digest('hex'),
  })
}
const manifest = {
  version: 1,
  status: 'composition-draft',
  width: 7200,
  height: 1000,
  initialCenter: [1150, 500],
  seams,
  sections,
}
await writeFile(`${root}world/data/panorama-v1.json`, `${JSON.stringify(manifest, null, 2)}\n`)
const current = new Set(sections.map(section => section.src.split('/').pop()))
for (const filename of await readdir(destination)) {
  if (/^(?:west|middle|east)-[a-f0-9]{12}\.webp$/.test(filename) && !current.has(filename))
    await unlink(`${destination}${filename}`)
}
console.log(JSON.stringify({ sections: sections.map(({ id, bytes, decodedBytes }) => ({ id, bytes, decodedBytes })), totalBytes: sections.reduce((sum, item) => sum + item.bytes, 0) }))
