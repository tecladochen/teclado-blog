import { Buffer } from 'node:buffer'
import fs from 'node:fs/promises'
import sharp from 'sharp'

// Fictional records and procedural covers for previewing the library layout.
const assetDir = 'src/assets/library/demo'
const dataDir = 'src/data/library'
const palette = [
  ['#e5d9bb', '#3b5449', '#b27952'],
  ['#344e54', '#ebd7ad', '#a76a50'],
  ['#b96c57', '#f3e6c9', '#524d5f'],
  ['#b4c2b2', '#374940', '#d8ae79'],
  ['#e9ddc8', '#6c5870', '#9e6b52'],
  ['#374453', '#d8b187', '#81978d'],
]

function artwork(index: number, title: string, square: boolean, avatar = false) {
  const [background, foreground, accent] = palette[index % palette.length]
  const height = square ? 480 : 720
  const centerY = square ? 230 : 310
  const motif = index % 4
  const shapes = [
    `<circle cx="240" cy="${centerY}" r="135" fill="${foreground}"/><circle cx="278" cy="${centerY - 40}" r="113" fill="${background}"/><circle cx="318" cy="${centerY + 70}" r="38" fill="${accent}"/>`,
    `<path d="M50 ${centerY + 130}L208 ${centerY - 135}L388 ${centerY + 130}Z" fill="${foreground}"/><path d="M200 ${centerY + 130}L338 ${centerY - 68}L465 ${centerY + 130}Z" fill="${accent}"/>`,
    `<rect x="108" y="${centerY - 140}" width="264" height="280" rx="130" fill="${foreground}"/><rect x="136" y="${centerY - 112}" width="208" height="225" rx="100" fill="${background}"/><path d="M136 ${centerY + 65}H345" stroke="${accent}" stroke-width="35"/>`,
    `<circle cx="240" cy="${centerY}" r="132" fill="${accent}"/><path d="M72 ${centerY + 70}Q165 ${centerY - 40} 250 ${centerY + 70}T435 ${centerY + 70}V${centerY + 150}H72Z" fill="${foreground}"/>`,
  ][motif]
  const titleText = avatar ? '' : `<text x="38" y="${height - 83}" fill="${foreground}" font-family="PingFang SC, sans-serif" font-size="${square ? 26 : 32}" letter-spacing="3">${title}</text><text x="40" y="${height - 45}" fill="${foreground}" font-family="monospace" font-size="13" letter-spacing="3">TECLADO / COLLECTION ${String(index + 1).padStart(2, '0')}</text>`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="${height}" viewBox="0 0 480 ${height}"><rect width="480" height="${height}" fill="${background}"/><path d="M38 40H442M38 56H210" stroke="${foreground}" stroke-width="1" opacity=".4"/>${shapes}${titleText}</svg>`
}

const workSeeds: [string, 'book' | 'movie' | 'series', string, string, 'completed' | 'in-progress' | 'planned', string, string?][] = [
  ['mountain-letters', 'book', '远山来信', '沈知秋', 'completed', '2026-09-20', '2026-10-06'],
  ['last-tram', 'movie', '最后一班电车', '许之洲', 'completed', '2026-09-27', '2026-09-27'],
  ['city-lights', 'series', '城市灯火 · 第一季', '陈见川', 'completed', '2026-08-03', '2026-09-15'],
  ['slow-days', 'book', '缓慢生活的练习', '林澄', 'completed', '2026-05-11', '2026-07-12'],
  ['summer-island', 'movie', '夏日岛屿', '陆声', 'completed', '2026-06-08', '2026-06-08'],
  ['ordinary-days', 'series', '平凡日子 · 第二季', '周慕青', 'completed', '2025-11', '2025-12'],
  ['night-walk', 'book', '夜行笔记', '顾白', 'completed', '2025-06', '2025-08'],
  ['before-rain', 'movie', '雨落之前', '秦远', 'completed', '2025-04-10', '2025-04-10'],
  ['small-universe', 'book', '一间房里的宇宙', '程夏', 'completed', '2024-09', '2024-11'],
  ['north-wind', 'series', '北风吹过的街道', '沈青', 'completed', '2024', '2024'],
  ['forest-notes', 'book', '森林观察手记', '叶序', 'in-progress', '2026-10-07'],
  ['long-weekend', 'series', '漫长周末 · 第一季', '林初', 'in-progress', '2026-10-02'],
  ['light-and-shadow', 'book', '光与影之间', '苏禾', 'in-progress', '2026-09-18'],
  ['ocean-story', 'series', '海的另一边', '夏见', 'in-progress', '2026-09-06'],
  ['quiet-corner', 'book', '安静的角落', '许墨', 'planned', '2026-10-08'],
  ['winter-letter', 'movie', '冬日来信', '何未', 'planned', '2026-10-05'],
  ['after-sunset', 'movie', '日落以后', '乔川', 'planned', '2026-09-26'],
  ['library-stories', 'series', '书店里的故事', '顾初', 'planned', '2026-09-12'],
]

const artistSeeds: [string, string][] = [
  ['lin-ye', '林野'],
  ['chen-yinan', '陈亦南'],
  ['june-harbor', 'June Harbor'],
  ['aoi-rin', '青井凛'],
  ['paper-plane', '纸飞机乐队'],
]

const albumSeeds: [string, string, string[], string, string, string][] = [
  ['dusk-between', '暮色之间', ['lin-ye'], '华语', '2024-09-22', 'evening-breeze'],
  ['rain-notes', '雨天手记', ['chen-yinan'], '华语', '2024-02-21', 'before-rain-stops'],
  ['summer-echo', '夏日回声', ['paper-plane', 'lin-ye'], '华语', '2025-04-23', 'to-the-sea'],
  ['rooms-of-light', 'Rooms of Light', ['june-harbor'], '英语', '2025-11-25', 'slow-morning'],
  ['moon-garden', '月の庭', ['aoi-rin'], '日语', '2025-08-24', 'night-stroll'],
]

for (const name of ['works', 'artists', 'albums']) {
  const entries = JSON.parse(await fs.readFile(`${dataDir}/${name}.json`, 'utf8')) as { id: string }[]
  if (entries.some(entry => !entry.id.startsWith('demo-')))
    throw new Error(`${name}.json 已包含非示例记录，停止生成以保留已有内容。`)
}

await fs.mkdir(assetDir, { recursive: true })
await fs.mkdir(dataDir, { recursive: true })

const works = []
for (const [index, [id, type, title, creator, status, addedOn, completedOn]] of workSeeds.entries()) {
  await sharp(Buffer.from(artwork(index, title, false))).webp({ quality: 80 }).toFile(`${assetDir}/${id}.webp`)
  works.push({ id: `demo-${id}`, type, title, creator, cover: `../../assets/library/demo/${id}.webp`, status, addedOn, ...(completedOn ? { completedOn } : {}) })
}

const artists = []
for (const [index, [id, name]] of artistSeeds.entries()) {
  await sharp(Buffer.from(artwork(index + 2, name, true, true))).resize(160, 160).webp({ quality: 75 }).toFile(`${assetDir}/${id}.webp`)
  artists.push({ id: `demo-${id}`, name, avatar: `../../assets/library/demo/${id}.webp` })
}

const albums = []
for (const [index, [id, title, artistIds, language, addedOn, coverId]] of albumSeeds.entries()) {
  await sharp(Buffer.from(artwork(index + 1, title, true))).webp({ quality: 80 }).toFile(`${assetDir}/${coverId}.webp`)
  albums.push({ id: `demo-${id}`, title, artists: artistIds.map(id => `demo-${id}`), cover: `../../assets/library/demo/${coverId}.webp`, language, addedOn })
}

for (const [name, records] of Object.entries({ works, artists, albums }))
  await fs.writeFile(`${dataDir}/${name}.json`, `${JSON.stringify(records, null, 2)}\n`)

console.log(`已生成示例：${works.length} 部作品、${artists.length} 位歌手、${albums.length} 张专辑。`)
