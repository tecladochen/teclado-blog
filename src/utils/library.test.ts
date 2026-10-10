/* eslint test/no-import-node-test: off */
import type { LibraryWork, MusicAlbum, MusicArtist } from './library'
import assert from 'node:assert/strict'
import { it } from 'node:test'
import { formatLibraryDate, getMusicArtists, getWorkCountLabel, getWorkDate, getWorkYears, isLibraryDate, parseLibraryEntries, sortMusicAlbums, sortWorks } from './library'

function work(id: string, data: Partial<LibraryWork['data']> = {}): LibraryWork {
  return { id, collection: 'library', data: { id, title: id, type: 'book', status: 'planned', addedOn: '2026-10-08', ...data } }
}

function artist(id: string): MusicArtist {
  return { id, collection: 'musicArtists', data: { id, name: id } }
}

function album(id: string, artists: string[], data: Partial<MusicAlbum['data']> = {}): MusicAlbum {
  return { id, collection: 'musicAlbums', data: {
    id,
    title: id,
    artists: artists.map(id => ({ collection: 'musicArtists', id })),
    ...data,
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
  assert.deepEqual(getWorkYears(works), [
    ['2026', { book: 1, movie: 1, series: 0 }],
    ['2025', { book: 0, movie: 0, series: 1 }],
  ])
  assert.deepEqual(getWorkYears([]), [])
})

it('historical imports use release dates until a personal completion date is supplied', () => {
  const historical = work('historical', { status: 'completed', releasedOn: '2009-03' })
  const recent = work('recent', { status: 'completed', releasedOn: '2025-07-25' })
  const personal = work('personal', { status: 'completed', releasedOn: '2005-10-22', completedOn: '2026-10-09' })
  const entries = [historical, personal, recent]
  assert.equal(getWorkDate(historical.data), '2009-03')
  assert.equal(getWorkDate(personal.data), '2026-10-09')
  assert.deepEqual(sortWorks(entries).map(work => work.id), ['personal', 'recent', 'historical'])
  assert.deepEqual(getWorkYears(entries).map(([year]) => year), ['2026', '2025', '2009'])
})

it('batch imports retain the source-file order when completion dates are equal', () => {
  const works = [work('a-book', { status: 'completed', completedOn: '2026-10-10' }), work('z-movie', { status: 'completed', type: 'movie', completedOn: '2026-10-10' })]
  assert.deepEqual(sortWorks(works, ['z-movie', 'a-book']).map(work => work.id), ['z-movie', 'a-book'])
  assert.deepEqual(sortWorks(works).map(work => work.id), ['a-book', 'z-movie'])
})

it('all album artist references must resolve, including collaborators', () => {
  const artists = [artist('second'), artist('first')]
  assert.deepEqual(getMusicArtists(artists, [album('duet', ['first', 'second'])]).map(artist => artist.id), ['second', 'first'])
  assert.throws(() => getMusicArtists(artists, [album('missing', ['missing'])]), /不存在的歌手/)
})

it('album dates may be imprecise or absent, with dated albums first and stable order', () => {
  const albums = [album('z-no-date', ['first']), album('year', ['first'], { addedOn: '2026' }), album('a-no-date', ['first']), album('day', ['first'], { addedOn: '2026-03-08' })]
  assert.deepEqual(sortMusicAlbums(albums).map(album => album.id), ['day', 'year', 'z-no-date', 'a-no-date'])
  assert.equal(albums[0].id, 'z-no-date')
  assert.deepEqual(sortMusicAlbums(albums, ['a-no-date', 'z-no-date']).map(album => album.id), ['day', 'year', 'a-no-date', 'z-no-date'])
})

it('work summaries count only the supplied types, with clear units and an empty state', () => {
  assert.equal(getWorkCountLabel(['book', 'movie', 'book', 'series']), '2 本书 · 1 部电影 · 1 部剧集')
  assert.equal(getWorkCountLabel(['series']), '1 部剧集')
  assert.equal(getWorkCountLabel([]), '暂无作品')
})

it('JSON data rejects duplicate or missing IDs instead of silently losing entries', () => {
  assert.deepEqual(parseLibraryEntries('[{"id":"book-one"}]'), [{ id: 'book-one' }])
  assert.deepEqual(parseLibraryEntries('[]'), [])
  assert.throws(() => parseLibraryEntries('[{"id":"one"},{"id":"one"}]'), /id 重复/)
  for (const input of ['[{}]', '[null]', '[{"id":" "}]', '[{"id":42}]'])
    assert.throws(() => parseLibraryEntries(input), /须填写/)
  assert.throws(() => parseLibraryEntries('{"id":"one"}'), /JSON 数组/)
})

it('legacy unfinished works can omit added dates and sort behind dated works', () => {
  const entries = [work('no-date', { addedOn: undefined }), work('dated', { addedOn: '2025' })]
  assert.deepEqual(sortWorks(entries).map(work => work.id), ['dated', 'no-date'])
})
