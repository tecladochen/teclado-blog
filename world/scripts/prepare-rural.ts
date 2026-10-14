import type { Buffer } from 'node:buffer'
import type { TiledManifest } from '../viewer/tiled-types'
import type { PatchSpec } from './rural-assembly'
import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { applyNativePatch, assembleNative, manifestSources, region, sha256 } from './rural-assembly'

const root = fileURLToPath(new URL('../../', import.meta.url))
const version = process.argv[2] ?? 'rural-v2'
if (!/^rural-[a-z0-9-]+$/.test(version))
  throw new Error('Expected a rural asset directory name')
const source = join(root, 'world/assets', version)
const destination = join(root, 'public/world', version)
const recipe: { columns: number, status: string, initialCenter: number[], patches: PatchSpec[] } = JSON.parse(await readFile(join(source, 'recipe.json'), 'utf8'))
const { atlas, records } = await assembleNative(source, recipe.columns)
const patches = []
for (const patch of recipe.patches)
  patches.push(await applyNativePatch(atlas, join(source, 'repairs'), patch, records))
await mkdir(destination, { recursive: true })
const outputFiles = new Set<string>()
async function publish(buffer: Buffer, label: string) {
  const filename = `${label}-${sha256(buffer).slice(0, 12)}.webp`
  await writeFile(join(destination, filename), buffer)
  outputFiles.add(filename)
  return `/world/${version}/${filename}`
}
const tileSize = 1024
const gutter = 2
const tiles: TiledManifest['tiles'] = []
for (let row = 0; row < Math.ceil(atlas.height / tileSize); row++) {
  for (let column = 0; column < Math.ceil(atlas.width / tileSize); column++) {
    const x = column * tileSize
    const y = row * tileSize
    const width = Math.min(tileSize, atlas.width - x)
    const height = Math.min(tileSize, atlas.height - y)
    const raster = region(atlas, { x, y, width, height }, gutter)
    const encoded = await sharp(raster.data, { raw: { width: raster.width, height: raster.height, channels: 3 } }).webp({ quality: 88, effort: 5 }).toBuffer()
    const id = `${column}-${row}`
    tiles.push({ id, column, row, x, y, width, height, src: await publish(encoded, `tile-${id}`), bytes: encoded.length, decodedBytes: raster.width * raster.height * 4 })
  }
}
const previews: TiledManifest['previews'] = []
for (let x = 0; x < atlas.width; x += 2048) {
  const width = Math.min(2048, atlas.width - x)
  const raster = region(atlas, { x, y: 0, width, height: atlas.height })
  const encoded = await sharp(raster.data, { raw: { width: raster.width, height: raster.height, channels: 3 } }).resize({ width: Math.min(640, width) }).webp({ quality: 65, effort: 4 }).toBuffer()
  previews.push({ x, width, src: await publish(encoded, `preview-${x}`), bytes: encoded.length })
}
const manifest: TiledManifest = { version: 1, status: recipe.status, width: atlas.width, height: atlas.height, tileSize, gutter, maxScale: 0.75, initialCenter: recipe.initialCenter, tiles, previews, sources: manifestSources(records) }
const manifestPath = join(root, 'world/data', `${version}.json`)
await writeFile(`${manifestPath}.tmp`, `${JSON.stringify(manifest, null, 2)}\n`)
await rename(`${manifestPath}.tmp`, manifestPath)
await writeFile(join(source, 'export.json'), `${JSON.stringify({ recipe: 'registered-unique-pixels-q88-gutter2-v2', columns: recipe.columns, sources: records, patches }, null, 2)}\n`)
// Local QA only; the full atlas is never shipped as one texture.
await sharp(atlas.data, { raw: { width: atlas.width, height: atlas.height, channels: 3 } }).resize({ width: Math.min(atlas.width, 2016) }).png().toFile(`/private/tmp/teclado-${version}-review.png`)
await sharp(atlas.data, { raw: { width: atlas.width, height: atlas.height, channels: 3 } }).png().toFile(`/private/tmp/teclado-${version}-atlas.png`)
for (const filename of await readdir(destination)) {
  if (!outputFiles.has(filename))
    await rm(join(destination, filename))
}
console.log(JSON.stringify({ width: atlas.width, height: atlas.height, tiles: tiles.length, detailBytes: tiles.reduce((n, t) => n + t.bytes, 0), previewBytes: previews.reduce((n, p) => n + p.bytes, 0), decodedBytes: tiles.reduce((n, t) => n + t.decodedBytes, 0) }))
