/* eslint test/no-import-node-test: off */
import type { XiaoheiSelection } from '~/types/companion'
import assert from 'node:assert/strict'
import { it } from 'node:test'
import { getSiteDate } from './siteLifetime'
import { selectXiaoheiAnimation } from './xiaoheiSelection'

const ids = ['L02', 'L04', 'L05', 'L06', 'L08', 'L10', 'L11']
const daily: XiaoheiSelection = { mode: 'daily', fixed: 'L02', enabled: ids }

it('fixed mode preserves L02 across dates', () => {
  for (const date of ['2026-11-06', '2026-11-07', '2027-01-01'])
    assert.equal(selectXiaoheiAnimation({ ...daily, mode: 'fixed' }, ids, date), 'L02')
})

it('daily selection is stable across reloads, array ordering and duplicates', () => {
  const day = '2026-11-06'
  const selection = selectXiaoheiAnimation(daily, ids, day)
  assert.equal(selectXiaoheiAnimation(daily, ids, day), selection)
  assert.equal(selectXiaoheiAnimation({ ...daily, enabled: [...ids].reverse().concat(ids[0]) }, [...ids].reverse(), day), selection)
})

it('every day changes, every cycle visits the entire pool, including cycle boundaries', () => {
  for (const size of [2, 3, 7]) {
    const pool = ids.slice(0, size)
    const config = { ...daily, enabled: pool }
    const start = Math.floor(Date.parse('2026-11-01') / 86400000 / size) * size
    let previous: string | undefined
    for (let cycle = 0; cycle < 30; cycle++) {
      const selected = new Set()
      for (let index = 0; index < size; index++) {
        const date = new Date((start + cycle * size + index) * 86400000).toISOString().slice(0, 10)
        const id = selectXiaoheiAnimation(config, ids, date)
        assert.ok(pool.includes(id!))
        assert.notEqual(id, previous)
        selected.add(id)
        previous = id
      }
      assert.equal(selected.size, size)
    }
  }
})

it('uses Shanghai midnight, including a page kept open overnight', () => {
  const before = getSiteDate(new Date('2026-11-06T15:59:59Z')).iso
  const after = getSiteDate(new Date('2026-11-06T16:00:00Z')).iso
  assert.notEqual(selectXiaoheiAnimation(daily, ids, before), selectXiaoheiAnimation(daily, ids, after))
})

it('handles a single pose, disabled or invalid IDs and an empty catalog', () => {
  assert.equal(selectXiaoheiAnimation({ ...daily, enabled: ['L05', 'missing'] }, ids, '2026-11-06'), 'L05')
  assert.equal(selectXiaoheiAnimation({ ...daily, enabled: [] }, ids, '2026-11-06'), 'L02')
  assert.equal(selectXiaoheiAnimation({ ...daily, mode: 'fixed', fixed: 'missing' }, ids, '2026-11-06'), 'L02')
  assert.equal(selectXiaoheiAnimation(daily, ids, 'invalid'), 'L02')
  assert.equal(selectXiaoheiAnimation(daily, [], '2026-11-06'), undefined)
})
