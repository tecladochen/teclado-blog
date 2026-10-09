import type { CollectionEntry } from 'astro:content'

export type LibraryWork = CollectionEntry<'library'>
export type MusicArtist = CollectionEntry<'musicArtists'>
export type MusicSong = CollectionEntry<'musicSongs'>

export const workTypes = { book: '书籍', movie: '电影', series: '剧集' } as const
export const workStatuses = { 'completed': '已看', 'in-progress': '在看', 'planned': '想看' } as const

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

export function sortWorks(works: LibraryWork[]) {
  return [...works].sort((a, b) => {
    const aDate = a.data.status === 'completed' ? a.data.completedOn! : a.data.addedOn
    const bDate = b.data.status === 'completed' ? b.data.completedOn! : b.data.addedOn
    return dateKey(bDate).localeCompare(dateKey(aDate)) || a.id.localeCompare(b.id)
  })
}

export function getCompletionYears(works: LibraryWork[]) {
  const years = new Map<string, { book: number, movie: number, series: number }>()
  for (const { data } of works) {
    if (data.status !== 'completed' || !data.completedOn)
      continue
    const year = data.completedOn.slice(0, 4)
    const counts = years.get(year) ?? { book: 0, movie: 0, series: 0 }
    counts[data.type]++
    years.set(year, counts)
  }
  return [...years.entries()].sort(([a], [b]) => b.localeCompare(a))
}

export function getMusicStats(artists: MusicArtist[], songs: MusicSong[]) {
  const counts = new Map(artists.map(artist => [artist.id, 0]))
  for (const { data } of songs) {
    for (const artist of data.artists) {
      if (!counts.has(artist.id))
        throw new Error(`歌曲「${data.title}」关联了不存在的歌手：${artist.id}`)
      counts.set(artist.id, counts.get(artist.id)! + 1)
    }
    if (data.albumArtist && !counts.has(data.albumArtist.id))
      throw new Error(`歌曲「${data.title}」的专辑歌手不存在：${data.albumArtist.id}`)
  }
  return {
    artists: [...artists].sort((a, b) => a.data.rank - b.data.rank).map(artist => ({
      ...artist,
      songCount: counts.get(artist.id)!,
    })),
    years: [...songs.reduce((years, song) => {
      const year = song.data.addedOn.slice(0, 4)
      years.set(year, (years.get(year) ?? 0) + 1)
      return years
    }, new Map<string, number>())].sort(([a], [b]) => a.localeCompare(b)),
  }
}

/** An album belongs to its credited artist; equal titles need not mean the same album. */
export function getMusicAlbums(songs: MusicSong[]) {
  const groups = new Map<string, {
    key: string
    title: string
    artistId?: string
    isAlbum: boolean
    cover: MusicSong['data']['cover']
    songs: MusicSong[]
  }>()
  const sorted = [...songs].sort((a, b) => dateKey(b.data.addedOn).localeCompare(dateKey(a.data.addedOn)) || a.id.localeCompare(b.id))
  for (const song of sorted) {
    const artistId = song.data.albumArtist?.id ?? song.data.artists[0]?.id
    const key = song.data.album ? JSON.stringify([artistId, song.data.album]) : 'singles'
    let group = groups.get(key)
    if (!group) {
      group = {
        key,
        title: song.data.album ?? '单曲收藏',
        artistId: song.data.album ? artistId : undefined,
        isAlbum: Boolean(song.data.album),
        cover: song.data.cover,
        songs: [],
      }
      groups.set(key, group)
    }
    group.cover ??= song.data.cover
    group.songs.push(song)
  }
  return [...groups.values()]
}
