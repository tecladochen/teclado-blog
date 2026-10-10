/* eslint test/no-import-node-test: off */
import assert from 'node:assert/strict'
import { it } from 'node:test'
import { getSiteDays, renderSiteTree } from './siteTree'

it('site uptime counts calendar days in the site time zone, including the first day', () => {
  assert.equal(getSiteDays('2026-06-25', new Date('2026-06-24T19:46:14-07:00')), 0)
  assert.equal(getSiteDays('2026-06-25', new Date('2026-06-25T15:59:59Z')), 0)
  assert.equal(getSiteDays('2026-06-25', new Date('2026-06-25T16:00:00Z')), 1)
  assert.equal(getSiteDays('2024-02-28', new Date('2024-03-01T00:00:00+08:00')), 2)
})

it('missing, invalid, and future dates never produce a fictional uptime', () => {
  const now = new Date('2026-10-10T12:00:00+08:00')
  for (const date of [null, '2026-2-3', '2025-02-29', '2026-04-31', '2026-10-11'])
    assert.equal(getSiteDays(date, now), null, String(date))
})

it('the fixed mature artwork has a connected trunk and upward branches', () => {
  const drawing = renderSiteTree()
  assert.equal(drawing, renderSiteTree())
  assert.doesNotMatch(drawing, /NaN|Infinity/)
  const trunk = drawing.match(/data-tree-trunk="" d="([^"]+)"/)
  assert.ok(trunk)
  const coordinates = trunk[1].match(/-?\d+(?:\.\d+)?/g)!.map(Number)
  assert.ok(coordinates.filter((_, index) => index % 2 === 1).every(y => y >= 0 && y <= 268))
  for (const limb of drawing.matchAll(/data-tree-limb="" d="([^"]+)"/g)) {
    const points = limb[1].match(/-?\d+(?:\.\d+)?/g)!.map(Number)
    assert.ok(points[0] >= 156 && points[0] <= 164)
    assert.ok(points[1] >= points[3] && points[3] >= points[5] && points[5] >= points[7])
  }
})
