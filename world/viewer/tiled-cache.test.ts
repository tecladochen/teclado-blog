import assert from 'node:assert/strict'
// eslint-disable-next-line test/no-import-node-test -- Use the existing built-in runner.
import { it } from 'node:test'
import { ByteCache, visiblePreviewIndices, visibleTileIds } from './tiled-cache'

it('queries nearby previews without scanning a long world or dropping its narrow final strip', () => {
  let reads = 0
  const previews = Array.from({ length: 10000 }, (_, index) => ({
    get x() {
      reads++
      return index * 2048
    },
    width: index === 9999 ? 8 : 2048,
  }))
  const finalX = 9999 * 2048
  assert.deepEqual(visiblePreviewIndices({ left: finalX, right: finalX + 8 }, previews), [9999])
  assert.ok(reads < 30)
  assert.deepEqual(visiblePreviewIndices({ left: 2048, right: 4096 }, previews), [1])
  assert.deepEqual(visiblePreviewIndices({ left: -100, right: 100 }, previews), [0])
})

it('queries only intersecting cells regardless of the distant world length', () => {
  const bounds = { left: 0, top: 0, right: 2048, bottom: 1872 }
  assert.deepEqual(visibleTileIds(bounds, 4104, 1872, 1024), ['0-0', '1-0', '0-1', '1-1'])
  assert.deepEqual(visibleTileIds(bounds, 1000000, 1872, 1024), ['0-0', '1-0', '0-1', '1-1'])
})

it('clamps prefetch at the world edge, including narrow final tiles', () => {
  assert.deepEqual(visibleTileIds({ left: 4096, top: 1024, right: 4104, bottom: 1872 }, 4104, 1872, 1024), ['4-1'])
  assert.deepEqual(visibleTileIds({ left: -400, top: -400, right: 100, bottom: 100 }, 4104, 1872, 1024), ['0-0'])
  assert.deepEqual(visibleTileIds({ left: 5000, top: 0, right: 6000, bottom: 100 }, 4104, 1872, 1024), [])
})

it('evicts by bytes and recency while preserving all visible textures', () => {
  const released: string[] = []
  const cache = new ByteCache<string>(10, value => released.push(value))
  cache.put('a', 'A', 4)
  cache.put('b', 'B', 4)
  cache.put('c', 'C', 4)
  cache.get('a')
  cache.trim(new Set(['c']))
  assert.deepEqual(released, ['B'])
  assert.equal(cache.bytes, 8)
  cache.put('d', 'D', 20)
  cache.trim(new Set(['d']))
  assert.equal(cache.get('d'), 'D')
  assert.deepEqual(released, ['B', 'C', 'A'])
  cache.clear()
  assert.equal(cache.bytes, 0)
  assert.equal(released.at(-1), 'D')
})
