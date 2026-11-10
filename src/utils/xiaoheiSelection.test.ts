/* eslint test/no-import-node-test: off */
import type { XiaoheiSelection } from '~/types/companion'
import assert from 'node:assert/strict'
import { it } from 'node:test'
import { getSiteDate } from './siteLifetime'
import { selectXiaoheiAnimation } from './xiaoheiSelection'

const ids = ['L06', 'L29', 'L10']
const daily: XiaoheiSelection = { mode: 'daily', fixed: 'L06', startsOn: '2026-11-10', enabled: ids }

it('fixed mode takes precedence over the daily rotation', () => {
  const fixed: XiaoheiSelection = { ...daily, mode: 'fixed', fixed: 'L10' }
  assert.equal(selectXiaoheiAnimation(fixed, ids, '2026-11-10'), 'L10')
  assert.equal(selectXiaoheiAnimation(fixed, ids, '2027-01-01'), 'L10')
})

it('follows the configured order and wraps, regardless of catalog order or duplicate entries', () => {
  const config = { ...daily, enabled: ['L06', 'L29', 'L29', 'missing', 'L10'] }
  const catalog = ['L10', 'L29', 'L06']
  assert.equal(selectXiaoheiAnimation(config, catalog, '2026-11-10'), 'L06')
  assert.equal(selectXiaoheiAnimation(config, catalog, '2026-11-11'), 'L29')
  assert.equal(selectXiaoheiAnimation(config, catalog, '2026-11-12'), 'L10')
  assert.equal(selectXiaoheiAnimation(config, catalog, '2026-11-13'), 'L06')
})

it('uses Shanghai midnight, including a page kept open overnight', () => {
  const before = getSiteDate(new Date('2026-11-10T15:59:59Z')).iso
  const after = getSiteDate(new Date('2026-11-10T16:00:00Z')).iso
  assert.equal(selectXiaoheiAnimation(daily, ids, before), 'L06')
  assert.equal(selectXiaoheiAnimation(daily, ids, after), 'L29')
})

it('handles a single pose and falls back before the start or without a usable rotation', () => {
  assert.equal(selectXiaoheiAnimation({ ...daily, enabled: ['L29', 'missing'] }, ids, '2026-12-06'), 'L29')
  assert.equal(selectXiaoheiAnimation({ ...daily, enabled: ['L29'] }, ids, '2026-11-09'), 'L06')
  assert.equal(selectXiaoheiAnimation({ ...daily, enabled: [] }, ids, '2026-11-10'), 'L06')
  assert.equal(selectXiaoheiAnimation({ ...daily, mode: 'fixed', fixed: 'missing' }, ids, '2026-11-10'), 'L06')
  assert.equal(selectXiaoheiAnimation(daily, ids, 'invalid'), 'L06')
  assert.equal(selectXiaoheiAnimation(daily, [], '2026-11-10'), undefined)
})
