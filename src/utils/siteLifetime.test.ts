/* eslint test/no-import-node-test: off */
import assert from 'node:assert/strict'
import { it } from 'node:test'
import { getSiteDate, getSiteDays } from './siteLifetime'

it('the date card and uptime roll over together at Shanghai midnight', () => {
  const before = new Date('2026-11-06T15:59:59Z')
  const after = new Date('2026-11-06T16:00:00Z')
  assert.deepEqual(getSiteDate(before), { iso: '2026-11-06', monthDay: '11 / 06', weekdayYear: '周五 · 2026' })
  assert.deepEqual(getSiteDate(after), { iso: '2026-11-07', monthDay: '11 / 07', weekdayYear: '周六 · 2026' })
  assert.equal(getSiteDays('2026-06-25', after)! - getSiteDays('2026-06-25', before)!, 1)
})

it('the date respects the configured time zone through the year boundary', () => {
  const instant = new Date('2026-12-31T16:00:00Z')
  assert.equal(getSiteDate(instant, 'Asia/Shanghai').iso, '2027-01-01')
  assert.equal(getSiteDate(instant, 'America/Los_Angeles').iso, '2026-12-31')
})
