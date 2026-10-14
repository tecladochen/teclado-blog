import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
// eslint-disable-next-line test/no-import-node-test -- Match the module's existing built-in runner.
import { test } from 'node:test'
import { nativeBoundary, region } from './rural-assembly'

test('interior gutters reuse the neighboring scene pixels, including corners', () => {
  const data = Buffer.from(Array.from({ length: 5 * 5 * 3 }, (_, i) => Math.floor(i / 3)))
  const source = { data, width: 5, height: 5 }
  const cut = region(source, { x: 2, y: 2, width: 1, height: 1 }, 1)
  assert.equal(cut.width, 3)
  assert.equal(cut.height, 3)
  assert.deepEqual([...cut.data.filter((_, i) => i % 3 === 0)], [6, 7, 8, 11, 12, 13, 16, 17, 18])
})

test('outer-world gutters clamp to the edge without wrapping to another row', () => {
  const source = { data: Buffer.from([1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4]), width: 2, height: 2 }
  const cut = region(source, { x: 0, y: 0, width: 2, height: 2 }, 1)
  assert.deepEqual([...cut.data.filter((_, i) => i % 3 === 0)], [1, 1, 2, 2, 1, 1, 2, 2, 3, 3, 4, 4, 3, 3, 4, 4])
  assert.throws(() => region(source, { x: 1, y: 1, width: 2, height: 2 }), /Invalid scene region/)
})

test('native repair boundaries stay in their context band and remain connected', () => {
  const cut = nativeBoundary(101, 12, 90, (along, across) => Math.abs(across - (30 + Math.floor(along / 12) * 3)))
  assert.equal(cut.length, 101)
  for (let i = 0; i < cut.length; i++) {
    assert.ok(cut[i]! >= 12 && cut[i]! <= 90)
    if (i)
      assert.ok(Math.abs(cut[i]! - cut[i - 1]!) <= 3)
  }
  assert.throws(() => nativeBoundary(0, 12, 90, () => 0), /Invalid boundary/)
})
