/* eslint test/no-import-node-test: off */
import type { LibraryWork, MusicArtist, MusicSong } from './library'
import assert from 'node:assert/strict'
import { it } from 'node:test'
import { formatLibraryDate, getCompletionYears, getMusicAlbums, getMusicStats, isLibraryDate, sortWorks } from './library'

function work(id: string, data: Partial<LibraryWork['data']> = {}): LibraryWork {
  return { id, collection: 'library', data: { id, title: id, type: 'book', status: 'planned', addedOn: '2026-10-08', ...data } }
}

function artist(id: string, rank: number): MusicArtist {
  return { id, collection: 'musicArtists', data: { id, name: id, rank } }
}

function song(id: string, artists: string[], language?: string): MusicSong {
  return { id, collection: 'musicSongs', data: {
    id,
    title: id,
    artists: artists.map(id => ({ collection: 'musicArtists', id })),
    addedOn: '2026-10-08',
    language,
  } }
}

it('historical dates preserve precision and reject invalid calendar dates', () => {
  for (const value of ['2023', '2024-02', '2024-02-29', '2026-10-08'])
    assert.equal(isLibraryDate(value), true, value)
  for (const value of ['2023-02-29', '2026-04-31', '2026-00', '2026-13', '2026-10-00', '2026-1', '26', '2026-10-08-extra'])
    assert.equal(isLibraryDate(value), false, value)
  assert.equal(formatLibraryDate('2023'), '2023 年')
  assert.equal(formatLibraryDate('2024-02'), '2024 年 2 月')
})

it('completed records sort by completion, unfinished records sort by addition', () => {
  const works = [
    work('old-completion', { status: 'completed', addedOn: '2026-10-08', completedOn: '2023' }),
    work('new-completion', { status: 'completed', addedOn: '2024', completedOn: '2026-10-08' }),
    work('month-only', { addedOn: '2026-10' }),
    work('year-only', { addedOn: '2026' }),
    work('in-progress', { status: 'in-progress', addedOn: '2026-10-07' }),
  ]
  assert.deepEqual(sortWorks(works).map(work => work.id), ['new-completion', 'in-progress', 'month-only', 'year-only', 'old-completion'])
  assert.equal(works[0].id, 'old-completion')
})

it('annual counts use completion year and exclude unfinished works', () => {
  const works = [
    work('cross-year', { status: 'completed', addedOn: '2025-12', completedOn: '2026-01' }),
    work('movie', { status: 'completed', type: 'movie', completedOn: '2026' }),
    work('season-one', { status: 'completed', type: 'series', completedOn: '2025' }),
    work('watching', { status: 'in-progress' }),
    work('wishlist'),
  ]
  assert.deepEqual(getCompletionYears(works), [
    ['2026', { book: 1, movie: 1, series: 0 }],
    ['2025', { book: 0, movie: 0, series: 1 }],
  ])
  assert.deepEqual(getCompletionYears([]), [])
})

it('personal artist order is preserved and collaborations remain findable under each artist', () => {
  const stats = getMusicStats([artist('first', 1), artist('second', 2), artist('empty', 3)], [
    song('collaboration', ['first', 'second'], '华语'),
    song('solo', ['second'], '英语'),
    song('unknown-language', ['second']),
  ])
  assert.deepEqual(stats.artists.map(artist => [artist.id, artist.songCount]), [['first', 1], ['second', 3], ['empty', 0]])
  assert.throws(() => getMusicStats([], [song('missing', ['missing'])]), /不存在的歌手/)
})

it('album grouping joins collaborations using the credited artist and keeps same-title albums separate', () => {
  const first = song('solo', ['first'])
  first.data.album = '同名专辑'
  const collaboration = song('duet', ['second', 'first'])
  collaboration.data.album = '同名专辑'
  collaboration.data.albumArtist = { collection: 'musicArtists', id: 'first' }
  const other = song('other-album', ['second'])
  other.data.album = '同名专辑'
  const single = song('single', ['first'])
  const albums = getMusicAlbums([first, collaboration, other, single])
  assert.equal(albums.filter(album => album.isAlbum).length, 2)
  assert.deepEqual(albums.find(album => album.artistId === 'first')?.songs.map(song => song.id), ['duet', 'solo'])
  assert.equal(albums.find(album => !album.isAlbum)?.songs[0].id, 'single')
  assert.deepEqual(getMusicAlbums([]), [])
})

it('collection growth counts each song once in its addition year, including collaborations', () => {
  const duet = song('duet', ['first', 'second'])
  duet.data.addedOn = '2024'
  const solo = song('solo', ['first'])
  solo.data.addedOn = '2025-03'
  const latest = song('latest', ['second'])
  const stats = getMusicStats([artist('first', 1), artist('second', 2)], [latest, duet, solo])
  assert.deepEqual(stats.years, [['2024', 1], ['2025', 1], ['2026', 1]])
  assert.equal(stats.artists.reduce((sum, artist) => sum + artist.songCount, 0), 4)
  assert.deepEqual(getMusicStats([], []).years, [])
})
