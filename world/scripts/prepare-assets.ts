import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const moduleRoot = new URL('../', import.meta.url)
const root = new URL('../', moduleRoot)
const records = new URL('assets/source/', moduleRoot)
const equipment = JSON.parse(await readFile(new URL('assets/plan.json', moduleRoot), 'utf8'))
const sources = ['textures', 'trees', 'verges', 'home', 'grain', 'garden', 'orchard', 'tea', 'barn', 'forest', 'pond', 'lotus', 'mill']
const bytes: Record<string, Buffer> = Object.fromEntries(await Promise.all(sources.map(async id => [id, await readFile(new URL(`${id}.png`, records))])))
const hash = createHash('sha256').update('whole-farm-v11-complete-edges-native-crops-layout9')
for (const buffer of Object.values(bytes)) hash.update(buffer)
hash.update(await readFile(fileURLToPath(import.meta.url)))
hash.update(JSON.stringify(equipment))
const revision = hash.digest('hex').slice(0, 12)
const target = new URL(`public/world/farm-v11/${revision}/`, root)
const base = `/world/farm-v11/${revision}/`
await mkdir(target, { recursive: true })
const projection = { x: 70, y: 42, height: 80 }
const wholeWorld = { width: 420 * projection.x, height: 240 * projection.y }
const textures: Record<string, string> = {}
const svgAssets: Record<string, string> = {}
async function output(name: string, input: Buffer) {
  const buffer = await sharp(input).webp({ quality: 94, alphaQuality: 100 }).toBuffer()
  await writeFile(new URL(`${name}.webp`, target), buffer)
  svgAssets[name] = `data:image/png;base64,${input.toString('base64')}`
  return `${base}${name}.webp`
}
// Mechanical stochastic overlap suppresses recognizable repeat motifs; no image is enlarged.
for (const [i, name] of ['meadow', 'forest', 'road', 'water', 'rice', 'crops'].entries()) {
  const cell = await sharp(bytes.textures).extract({ left: i % 3 * 512, top: Math.floor(i / 3) * 512, width: 512, height: 512 }).png().toBuffer()
  const tile = await sharp(cell).resize({ width: name === 'rice' || name === 'crops' ? 128 : 256 }).png().toBuffer()
  const meta = await sharp(tile).metadata()
  const size = meta.width!
  const data = await sharp(tile).ensureAlpha().raw().toBuffer()
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const t = Math.max(0, Math.min(1, x / 64, (size - 1 - x) / 64, y / 64, (size - 1 - y) / 64))
      data[(y * size + x) * 4 + 3] = Math.round(t * 255)
    }
  }
  const soft = await sharp(data, { raw: { width: size, height: size, channels: 4 } }).png().toBuffer()
  const flipped = await sharp(soft).flop().toBuffer()
  const layers: { input: Buffer, left: number, top: number }[] = []
  for (let y = 0; y < 1536; y += size) {
    for (let x = 0; x < 1536; x += size) layers.push({ input: tile, left: x, top: y })
  }
  let state = 917 + i * 13
  for (let y = 0; y < 1536 - size; y += size / 2) {
    for (let x = 0; x < 1536 - size; x += size / 2) {
      state = (state * 1664525 + 1013904223) >>> 0
      layers.push({ input: state % 2 ? soft : flipped, left: x + state % 61, top: y + (state >>> 9) % 61 })
    }
  }
  const assembled = await sharp({ create: { width: 1536, height: 1536, channels: 3, background: '#899a60' } }).composite(layers).png().toBuffer()
  const cut = await sharp(assembled).extract({ left: 256, top: 256, width: 1024, height: 1024 }).png().toBuffer()
  textures[name] = await output(`texture-${name}`, cut)
}
const sprites: Record<string, { url: string, width: number, height: number }> = {}
const treeMeta = await sharp(bytes.trees).metadata()
const cell = Math.floor(treeMeta.width! / 2)
for (const [i, name] of ['shade', 'young', 'fruit', 'bamboo'].entries()) {
  const extracted = await sharp(bytes.trees).extract({ left: i % 2 * cell, top: Math.floor(i / 2) * cell, width: cell, height: cell }).png().toBuffer()
  const input = await sharp(extracted).trim({ threshold: 15 }).resize({ width: name === 'shade' ? 440 : name === 'young' ? 280 : 350, withoutEnlargement: true }).png().toBuffer()
  const meta = await sharp(input).metadata()
  sprites[name] = { url: await output(`plant-${name}`, input), width: meta.width!, height: meta.height! }
}
for (const [i, name] of ['reeds', 'flowers', 'ferns', 'stones'].entries()) {
  const input = await sharp(bytes.verges).extract({ left: i % 2 * 768, top: Math.floor(i / 2) * 512, width: 768, height: 512 }).resize({ width: 210 }).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width, height } = input.info
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const edge = Math.max(0, Math.min(1, x / 24, (width - x - 1) / 24, y / 24, (height - y - 1) / 24))
      input.data[(y * width + x) * 4 + 3] *= edge
    }
  }
  const png = await sharp(input.data, { raw: { width, height, channels: 4 } }).png().toBuffer()
  sprites[name] = { url: await output(`verge-${name}`, png), width, height }
}
const definitions = [
  { id: 'home', label: '院落与厨房侧院', center: [180, 135] },
  { id: 'grain', label: '晒场、干仓与机具服务', center: [211, 105] },
  { id: 'garden', label: '菜园、苗圃与风车', center: [210, 156] },
  { id: 'orchard', label: '果品分拣与蜂箱', center: [294, 116] },
  { id: 'tea', label: '茶坡与摊叶棚', center: [329, 74] },
  { id: 'barn', label: '棚舍与草料', center: [289, 171] },
  { id: 'forest', label: '竹木材料与编作', center: [64, 135] },
  { id: 'mill', label: '溪畔水磨', center: [123, 104] },
  { id: 'pond', label: '鱼塘东岸', center: [155, 185] },
  { id: 'lotus', label: '荷莲浅塘', center: [72, 194] },
  { id: 'mushrooms', label: '林下段木养护', center: [59, 71] },
]
const tiles: { id: string, x: number, y: number, width: number, height: number, url: string }[] = []
const patches: { id: string, label: string, center: number[], x: number, y: number, width: number, height: number, overview: string }[] = []
for (const item of definitions) {
  let input = item.id === 'mushrooms' ? await sharp(bytes.forest).extract({ left: 0, top: 110, width: 735, height: 440 }).png().toBuffer() : bytes[item.id]
  // The older mill proof is reduced to the same door/resident scale; nothing is enlarged.
  if (item.id === 'mill')
    input = await sharp(input).resize({ width: 1536, withoutEnlargement: true }).png().toBuffer()
  const raw = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width, height } = raw.info
  const x = Math.round(item.center[0]! * projection.x - width / 2)
  const y = Math.round(item.center[1]! * projection.y - height / 2)
  // Mechanical assembly mask: soft, slightly irregular outer ground overlap. Internal artwork is untouched.
  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const distance = Math.min(px, (width - 1 - px) * 4, py * 6, height - 1 - py)
      const feather = item.id === 'mushrooms' ? 65 : 150 + 20 * Math.sin(px / 73) * Math.sin(py / 97)
      const t = Math.max(0, Math.min(1, distance / feather))
      raw.data[(py * width + px) * 4 + 3] *= t * t * (3 - 2 * t)
    }
  }
  const png = await sharp(raw.data, { raw: { width, height, channels: 4 } }).png().toBuffer()
  const overview = await output(`scene-${item.id}`, await sharp(png).resize({ width: Math.min(512, width) }).png().toBuffer())
  svgAssets[`native-${item.id}`] = `data:image/png;base64,${png.toString('base64')}`
  const patch = { ...item, x, y, width, height, overview }
  patches.push(patch)
  for (let ty = 0; ty < height; ty += 768) {
    for (let tx = 0; tx < width; tx += 768) {
      const id = `${item.id}-${tx / 768}-${ty / 768}`
      const w = Math.min(768, width - tx)
      const h = Math.min(768, height - ty)
      const url = await output(id, await sharp(png).extract({ left: tx, top: ty, width: w, height: h }).png().toBuffer())
      tiles.push({ id, x: x + tx, y: y + ty, width: w, height: h, url })
    }
  }
}
const lands = [
  { id: 'forest', texture: 'forest', path: 'M0 0H83 Q82 45 70 87 Q67 103 51 116L0 110Z' },
  { id: 'bamboo', texture: 'forest', path: 'M0 140Q38 125 55 146Q77 178 63 209L0 221Z' },
  { id: 'tea', texture: 'crops', path: 'M329 21Q345 10 365 28Q366 43 345 61Q326 53 329 21Z' },
  { id: 'orchard', texture: 'meadow', path: 'M277 84Q301 77 329 84Q352 99 368 118L340 136Q310 131 285 119Q269 106 277 84Z' },
  { id: 'pasture', texture: 'meadow', path: 'M304 151Q343 135 391 154L420 183V240H298Q287 196 304 151Z' },
  { id: 'hayfield', texture: 'meadow', path: 'M348 197Q375 180 410 205L420 240H340Z' },
  { id: 'garden', texture: 'crops', path: 'M197 153Q205 149 218 154L224 177Q211 183 195 170Z' },
  { id: 'beans', texture: 'crops', path: 'M220 180Q247 170 270 192L274 231Q243 239 213 228Q208 204 220 180Z' },
  { id: 'paddy', texture: 'rice', path: 'M138 16Q178 8 216 23L232 46L238 80Q209 95 171 77L141 58Z' },
]
const roads = equipment.roads as { id: string, points: number[][], widthM: number }[]
const rerouted: Record<string, number[][]> = {
  'main-road': [[0, 118], [48, 120], [105, 128], [139, 122], [164, 143], [181, 146], [193, 138], [225, 121], [277, 127], [332, 132], [420, 127]],
  'garden-road': [[181, 146], [190, 146], [196, 151], [204, 166], [208, 167]],
  'pond-road': [[169, 145], [166, 149], [153, 163], [163, 172], [162, 186]],
  'forest-road': [[169, 145], [139, 122], [105, 128], [48, 120], [60, 127], [62, 135], [60, 150], [42, 174]],
}
for (const road of roads) {
  if (rerouted[road.id])
    road.points = rerouted[road.id]!
}
// Short approaches make the paths in the detailed artwork meet the farm network.
roads.push(
  { id: 'home-entry', widthM: 1.5, points: [[181, 146], [186, 145], [190, 143]] },
  { id: 'grain-entry', widthM: 3, points: [[207, 119], [207, 114], [211, 116]] },
  { id: 'garden-entry', widthM: 1.5, points: [[200, 145], [198, 151], [204, 166]] },
  { id: 'barn-entry', widthM: 3, points: [[276, 165], [280, 172], [289, 182]] },
  { id: 'forest-entry', widthM: 2, points: [[60, 127], [54, 133], [60, 146]] },
  { id: 'orchard-entry', widthM: 2, points: [[290, 126], [294, 127], [301, 121]] },
)
const waters = equipment.water.map((item: { id: string, points: number[][] }) => ({ id: item.id, points: item.points, widthM: item.id === 'creek' ? 3.8 : item.id === 'mill-race' ? 1.1 : 0.65 }))
const ponds = equipment.waterBodies
let seed = 31771
function random() {
  seed = (seed * 1664525 + 1013904223) >>> 0
  return seed / 4294967296
}
function segmentDistance(x: number, y: number, a: number[], b: number[]) {
  const dx = b[0]! - a[0]!
  const dy = b[1]! - a[1]!
  const t = Math.max(0, Math.min(1, ((x - a[0]!) * dx + (y - a[1]!) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(x - a[0]! - t * dx, y - a[1]! - t * dy)
}
function nearLine(x: number, y: number, lines: { points: number[][], widthM: number }[], extra: number) {
  return lines.some(line => line.points.slice(1).some((b, i) => segmentDistance(x, y, line.points[i]!, b) < line.widthM / 2 + extra))
}
function inPond(x: number, y: number, margin = 0) {
  return ponds.some((p: { center: number[], radii: number[] }) => ((x - p.center[0]!) / (p.radii[0]! + margin)) ** 2 + ((y - p.center[1]!) / (p.radii[1]! + margin)) ** 2 < 1)
}
function cropField(x: number, y: number) {
  return (x > 136 && x < 239 && y < 82) || (x > 214 && x < 276 && y > 178) || (x > 328 && x < 367 && y < 62) || (x > 345 && y > 196) || (x > 196 && x < 224 && y > 152 && y < 178)
}
function insidePatch(x: number, y: number) {
  return patches.some(p => x * 70 > p.x + 80 && x * 70 < p.x + p.width - 80 && y * 42 > p.y + 30 && y * 42 < p.y + p.height + 80)
}
const plants: { sprite: string, x: number, y: number, width: number, height: number, flip: boolean }[] = []
function plant(sprite: string, x: number, y: number, scale = 1) {
  const s = sprites[sprite]!
  if (['shade', 'young', 'fruit', 'bamboo'].includes(sprite)) {
    const width = s.width * scale
    const height = s.height * scale
    if (patches.some(p => x * 70 + width / 2 > p.x + 120 && x * 70 - width / 2 < p.x + p.width - 120 && y * 42 > p.y + 55 && y * 42 - height < p.y + p.height - 180))
      return
  }
  plants.push({ sprite, x: Math.round(x * 70), y: Math.round(y * 42), width: Math.round(s.width * scale), height: Math.round(s.height * scale), flip: random() > 0.5 })
}
for (let y = 3; y < 240; y += 5.5) {
  for (let x = 3; x < 420; x += 5.5) {
    const px = x + (random() - 0.5) * 4
    const py = y + (random() - 0.5) * 4
    const forest = px < 74 && py < 111
    const bamboo = px < 59 && py > 146 && py < 216
    const orchard = px > 278 && px < 361 && py > 84 && py < 132
    const grove = px > 150 && px < 236 && py > 110 && py < 173
    const forestMargin = px < 90 && py > 102 && py < 163
    const chance = forest ? 0.91 : bamboo ? 0.81 : orchard ? 0.87 : cropField(px, py) ? 0.008 : grove ? 0.66 : forestMargin ? 0.63 : px > 300 && py > 145 ? 0.045 : 0.16
    if (random() > chance || insidePatch(px, py) || inPond(px, py, 3) || nearLine(px, py, roads, 3) || nearLine(px, py, waters, 2))
      continue
    plant(bamboo ? 'bamboo' : orchard ? 'fruit' : forest ? 'shade' : grove && random() > 0.7 ? 'fruit' : random() > 0.45 ? 'young' : 'shade', px, py, 0.85 + random() * 0.15)
  }
}
// Sparse native ground clumps break the texture repetition; banks have continuous reeds and stones.
for (let i = 0; i < 3000; i++) {
  const x = random() * 420
  const y = random() * 240
  if (insidePatch(x, y) || inPond(x, y) || cropField(x, y) || nearLine(x, y, roads, 0.2))
    continue
  plant(x < 75 ? 'ferns' : random() > 0.85 ? 'stones' : 'flowers', x, y, 0.55 + random() * 0.4)
}
for (const line of waters) {
  for (let i = 1; i < line.points.length; i++) {
    const a = line.points[i - 1]!
    const b = line.points[i]!
    const length = Math.hypot(b[0]! - a[0]!, b[1]! - a[1]!)
    for (let d = 0; d < length; d += 1.8) {
      const side = random() > 0.5 ? 1 : -1
      const x = a[0]! + (b[0]! - a[0]!) * d / length + side * (line.widthM / 2 + 0.6)
      const y = a[1]! + (b[1]! - a[1]!) * d / length
      if (!insidePatch(x, y) && !inPond(x, y) && !nearLine(x, y, roads, 1))
        plant(random() > 0.4 ? 'reeds' : 'stones', x, y, 0.65 + random() * 0.3)
    }
  }
}
for (const p of ponds) {
  for (let angle = 0; angle < Math.PI * 2; angle += 0.09) {
    const x = p.center[0] + Math.cos(angle) * (p.radii[0] + 1.2) + (p.id === 'pond' ? Math.sin(angle) * p.radii[1] * 42 / 70 * 0.9 : 0)
    const y = p.center[1] + Math.sin(angle) * (p.radii[1] + 0.8)
    if (!insidePatch(x, y) && !nearLine(x, y, roads, 1))
      plant(random() > 0.25 ? 'reeds' : 'stones', x, y, 0.75)
  }
}
for (const road of roads) {
  for (let i = 1; i < road.points.length; i++) {
    const a = road.points[i - 1]!
    const b = road.points[i]!
    const dx = b[0]! - a[0]!
    const dy = b[1]! - a[1]!
    const length = Math.hypot(dx, dy)
    for (let d = 0; d < length; d += 2.3) {
      const side = random() > 0.5 ? 1 : -1
      const x = a[0]! + dx * d / length - dy / length * (road.widthM / 2 + 0.65) * side
      const y = a[1]! + dy * d / length + dx / length * (road.widthM / 2 + 0.65) * side
      if (!insidePatch(x, y) && !inPond(x, y) && !nearLine(x, y, waters, 0.6))
        plant(random() > 0.9 ? 'stones' : 'flowers', x, y, 0.55 + random() * 0.2)
    }
  }
}
plants.sort((a, b) => a.y - b.y)
const places = [
  ...patches.map(p => ({ id: p.id, label: p.label, x: p.x + p.width / 2, y: p.y + p.height / 2 })),
  { id: 'paddy', label: '上游稻田', x: 190 * 70, y: 48 * 42 },
  { id: 'beans', label: '旱地豆作', x: 239 * 70, y: 210 * 42 },
  { id: 'pasture', label: '轮休草场与割草地', x: 350 * 70, y: 185 * 42 },
  { id: 'tea-slope', label: '坡上茶垄', x: 347 * 70, y: 39 * 42 },
]
const manifest = {
  version: 11,
  revision,
  scale: 1,
  wholeWorld,
  projection,
  landMetres: equipment.world,
  bounds: { x: 0, y: 0, ...wholeWorld },
  overview: `${base}overview.webp`,
  textures,
  sprites,
  lands,
  roads,
  waters,
  ponds,
  crossings: equipment.crossings,
  patches,
  tiles,
  plants,
  places,
  note: 'Complete static farm assembled from native hand-painted scenes, terrain textures and transparent vegetation. Artistic projection follows the accepted 420×240m plan; not a surveyed engineering model. No actor/machinery animation yet.',
}
// Raster art in a mechanical SVG compositor gives the minimap the same ground and scene arrangement.
const patterns = Object.keys(textures).map(name => `<pattern id="${name}" width="1024" height="1024" patternUnits="userSpaceOnUse"><image href="${svgAssets[`texture-${name}`]}" width="1024" height="1024"/></pattern>`).join('')
function line(points: number[][]) {
  return points.map((p, i) => `${i ? 'L' : 'M'}${p[0]! * 70},${p[1]! * 42}`).join(' ')
}
const shapes = lands.map(l => `<path d="${l.path}" transform="scale(70 42)" fill="url(#land-${l.texture})"/>`).join('')
const landPatterns = Object.keys(textures).map(name => `<pattern id="land-${name}" width="${1024 / 70}" height="${1024 / 42}" patternUnits="userSpaceOnUse"><image href="${svgAssets[`texture-${name}`]}" width="${1024 / 70}" height="${1024 / 42}"/></pattern>`).join('')
const waterSvg = waters.map((w: { points: number[][], widthM: number }) => `<path d="${line(w.points)}" fill="none" stroke="#827953" stroke-width="${w.widthM * 56 + 30}"/><path d="${line(w.points)}" fill="none" stroke="url(#water)" stroke-width="${w.widthM * 56}"/>`).join('')
const pondSvg = ponds.map((p: { id: string, center: number[], radii: number[] }) => `<ellipse transform="translate(${p.center[0]! * 70} ${p.center[1]! * 42}) matrix(1 0 ${p.id === 'pond' ? 0.9 : 0} 1 0 0) translate(${-p.center[0]! * 70} ${-p.center[1]! * 42})" cx="${p.center[0]! * 70}" cy="${p.center[1]! * 42}" rx="${p.radii[0]! * 70}" ry="${p.radii[1]! * 42}" fill="url(#water)" stroke="#918565" stroke-width="28"/>`).join('')
const roadSvg = roads.map(r => `<path d="${line(r.points)}" fill="none" stroke="#af9d73" stroke-width="${r.widthM * 52 + 20}"/><path d="${line(r.points)}" fill="none" stroke="url(#road)" stroke-width="${r.widthM * 52}"/>`).join('')
const sceneSvg = patches.map(p => `<image href="${svgAssets[`native-${p.id}`]}" x="${p.x}" y="${p.y}" width="${p.width}" height="${p.height}"/>`).join('')
const spriteDefs = Object.keys(sprites).map(name => `<image id="sprite-${name}" href="${svgAssets[['shade', 'young', 'fruit', 'bamboo'].includes(name) ? `plant-${name}` : `verge-${name}`]}" width="1" height="1" preserveAspectRatio="none"/>`).join('')
const plantSvg = plants.map(p => `<use href="#sprite-${p.sprite}" transform="translate(${p.x - p.width / 2} ${p.y - p.height}) scale(${p.width} ${p.height})"/>`).join('')
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="2400" height="${Math.round(2400 * wholeWorld.height / wholeWorld.width)}" viewBox="0 0 ${wholeWorld.width} ${wholeWorld.height}"><defs>${patterns}${landPatterns}${spriteDefs}</defs><rect width="100%" height="100%" fill="url(#meadow)"/><g stroke-linecap="round" stroke-linejoin="round">${shapes}${waterSvg}${pondSvg}${roadSvg}</g>${sceneSvg}${plantSvg}</svg>`
await sharp(Buffer.from(svg), { limitInputPixels: false }).webp({ quality: 94 }).toFile(fileURLToPath(new URL('overview.webp', target)))
await sharp(Buffer.from(svg), { limitInputPixels: false }).png().toFile(fileURLToPath(new URL('docs/overview.png', moduleRoot)))
// Publish the manifest only after the full revision exists, then retire generated predecessors.
await writeFile(new URL('manifest.json', target), `${JSON.stringify(manifest, null, 2)}\n`)
await writeFile(new URL('assets/manifest.json', moduleRoot), `${JSON.stringify(manifest, null, 2)}\n`)
const releases = new URL('public/world/farm-v11/', root)
for (const entry of await readdir(releases, { withFileTypes: true })) {
  if (entry.isDirectory() && /^[a-f0-9]{12}$/.test(entry.name) && entry.name !== revision)
    await rm(new URL(`${entry.name}/`, releases), { recursive: true })
}
console.log(`Prepared whole farm ${wholeWorld.width}×${wholeWorld.height}, ${patches.length} native scenes, ${plants.length} plants/verges, ${tiles.length} detail tiles. Revision ${revision}`)
