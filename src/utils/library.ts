import type { CollectionEntry } from 'astro:content'

export type LibraryWork = CollectionEntry<'library'>
export type MusicArtist = CollectionEntry<'musicArtists'>
export type MusicAlbum = CollectionEntry<'musicAlbums'>

export const workTypes = { book: '书籍', movie: '电影', series: '剧集' } as const

/** Reject missing/duplicate IDs before the content loader can drop or overwrite entries. */
export function parseLibraryEntries(text: string) {
  const entries: unknown = JSON.parse(text)
  if (!Array.isArray(entries))
    throw new Error('书影音数据须为 JSON 数组')
  const ids = new Set<string>()
  for (const [index, entry] of entries.entries()) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry) || typeof entry.id !== 'string' || !entry.id.trim())
      throw new Error(`第 ${index + 1} 条数据须填写非空的字符串 id`)
    if (ids.has(entry.id))
      throw new Error(`书影音数据 id 重复：${entry.id}`)
    ids.add(entry.id)
  }
  return entries
}

export function getWorkCountLabel(types: LibraryWork['data']['type'][]) {
  const counts = { book: 0, movie: 0, series: 0 }
  types.forEach(type => counts[type]++)
  return Object.entries(workTypes).map(([type, label]) => {
    const count = counts[type as keyof typeof counts]
    return count ? `${count} ${type === 'book' ? '本书' : `部${label}`}` : ''
  }).filter(Boolean).join(' · ') || '暂无作品'
}

/** Keep imprecise historical dates without inventing a month or day. */
export function isLibraryDate(value: string) {
  if (!/^\d{4}(?:-\d{2})?(?:-\d{2})?$/.test(value))
    return false
  const [year, month = 1, day = 1] = value.split('-').map(Number)
  if (year < 1000 || year > 9999)
    return false
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

export function formatLibraryDate(value: string) {
  const [year, month, day] = value.split('-')
  return `${year} 年${month ? ` ${Number(month)} 月` : ''}${day ? ` ${Number(day)} 日` : ''}`
}

function dateKey(value: string) {
  return value.padEnd(10, '-00')
}

/** Personal completion takes precedence; release dates support historical imports. */
export function getWorkDate(data: LibraryWork['data']) {
  return data.completedOn ?? data.releasedOn
}

export function sortWorks(works: LibraryWork[], order = works.map(work => work.id)) {
  const positions = new Map(order.map((id, index) => [id, index]))
  return [...works].sort((a, b) => {
    const aDate = (a.data.status === 'completed' ? getWorkDate(a.data) : a.data.addedOn) ?? ''
    const bDate = (b.data.status === 'completed' ? getWorkDate(b.data) : b.data.addedOn) ?? ''
    return dateKey(bDate).localeCompare(dateKey(aDate))
      || (positions.get(a.id) ?? order.length) - (positions.get(b.id) ?? order.length)
  })
}

export function getWorkYears(works: LibraryWork[]) {
  const years = new Map<string, { book: number, movie: number, series: number }>()
  for (const { data } of works) {
    const date = getWorkDate(data)
    if (data.status !== 'completed' || !date)
      continue
    const year = date.slice(0, 4)
    const counts = years.get(year) ?? { book: 0, movie: 0, series: 0 }
    counts[data.type]++
    years.set(year, counts)
  }
  return [...years.entries()].sort(([a], [b]) => b.localeCompare(a))
}

export function sortMusicAlbums(albums: MusicAlbum[], order = albums.map(album => album.id)) {
  // Content-store serialization may reorder IDs; use the source file for ties.
  const positions = new Map(order.map((id, index) => [id, index]))
  return [...albums].sort((a, b) => dateKey(b.data.addedOn ?? '').localeCompare(dateKey(a.data.addedOn ?? ''))
    || (positions.get(a.id) ?? order.length) - (positions.get(b.id) ?? order.length))
}

export function getMusicArtists(artists: MusicArtist[], albums: MusicAlbum[]) {
  const ids = new Set(artists.map(artist => artist.id))
  for (const { data } of albums) {
    for (const artist of data.artists) {
      if (!ids.has(artist.id))
        throw new Error(`专辑「${data.title}」关联了不存在的歌手：${artist.id}`)
    }
  }
  return artists
}
