import { createHash } from 'node:crypto'
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import sharp from 'sharp'

const moduleRoot = new URL('../', import.meta.url)
const root = new URL('../', moduleRoot)
const source = new URL('assets/sample/source/', moduleRoot)
const ids = ['landscape', 'hen', 'resident'] as const
const bytes = await Promise.all(ids.map(id => readFile(new URL(`${id}.png`, source))))
const hash = createHash('sha256').update(await readFile(new URL(import.meta.url)))
for (const buffer of bytes) hash.update(buffer)
const revision = hash.digest('hex').slice(0, 12)
const parent = new URL('public/world/living-sample/', root)
const target = new URL(`${revision}/`, parent)
const base = `/world/living-sample/${revision}/`
await mkdir(target, { recursive: true })
const landscape = await sharp(bytes[0]).metadata()
await sharp(bytes[0]).webp({ quality: 95 }).toFile(new URL('landscape.webp', target).pathname)

const actors: Record<string, { url: string, width: number, height: number, foot: [number, number] }[]> = {}
for (const [index, id] of ids.entries()) {
  if (id === 'landscape')
    continue
  const meta = await sharp(bytes[index]).metadata()
  if (!meta.hasAlpha || !meta.width || !meta.height || meta.width % 2 || meta.height % 2)
    throw new Error(`${id}: expected a transparent 2×2 sprite sheet`)
  const width = meta.width / 2
  const height = meta.height / 2
  actors[id] = []
  for (let frame = 0; frame < 4; frame++) {
    const cell = await sharp(bytes[index]).extract({ left: frame % 2 * width, top: Math.floor(frame / 2) * height, width, height }).ensureAlpha().raw().toBuffer()
    // Crop/export only; retain the generator's painted alpha and untouched colour pixels.
    let left = width
    let right = 0
    let top = height
    let bottom = 0
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (cell[(y * width + x) * 4 + 3]! > 30) {
          left = Math.min(left, x)
          right = Math.max(right, x)
          top = Math.min(top, y)
          bottom = Math.max(bottom, y)
        }
      }
    }
    if (left > right)
      throw new Error(`${id}: frame ${frame} is empty`)
    const crop = { left: Math.max(0, left - 2), top: Math.max(0, top - 2), width: Math.min(width - left, right - left + 5), height: Math.min(height - top, bottom - top + 5) }
    const name = `${id}-${frame}.webp`
    await sharp(cell, { raw: { width, height, channels: 4 } }).extract(crop).webp({ quality: 96, alphaQuality: 100 }).toFile(new URL(name, target).pathname)
    // A shared foot anchor prevents the sheet's cell padding from shifting the subject.
    const footX = id === 'resident' ? [345, 288, 351, 290][frame]! : [325, 295, 334, 300][frame]!
    actors[id].push({ url: `${base}${name}`, width: crop.width, height: crop.height, foot: [footX - crop.left, bottom - crop.top] })
  }
}
const manifest = {
  revision,
  size: { width: landscape.width!, height: landscape.height! },
  background: `${base}landscape.webp`,
  actors,
}
await writeFile(new URL('assets/sample/manifest.json', moduleRoot), `${JSON.stringify(manifest, null, 2)}\n`)
for (const name of await readdir(parent)) {
  if (/^[a-f\d]{12}$/.test(name) && name !== revision)
    await rm(new URL(`${name}/`, parent), { recursive: true })
}
console.log(`Living sample ${revision}: ${landscape.width}×${landscape.height}, 8 transparent frames`)
