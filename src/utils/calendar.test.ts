/* eslint test/no-import-node-test: off */
import type { CalendarEvent } from './calendar'
import assert from 'node:assert/strict'
import { it } from 'node:test'
import { getCalendarElapsedDays, getCalendarHighlights, getCalendarMonth, getCalendarMonthEvents, getCalendarToday, getLunarLabel, getUpcomingCalendarEvents, getYearRemainingDays } from './calendar'

it('the configured timezone determines today on either side of midnight', () => {
  const now = new Date('2026-10-10T02:00:00Z')
  assert.deepEqual(getCalendarToday(now, 'America/Los_Angeles'), { year: 2026, month: 10, day: 9 })
  assert.deepEqual(getCalendarToday(now, 'Asia/Shanghai'), { year: 2026, month: 10, day: 10 })
})

it('countdowns use calendar days across DST, keep today and remove expired one-off events', () => {
  const events: CalendarEvent[] = [
    { id: 'expired', title: '过去', kind: 'custom', recurrence: 'once', date: '2026-03-07' },
    { id: 'today', title: '今天', kind: 'custom', recurrence: 'once', date: '2026-03-08' },
    { id: 'tomorrow', title: '明天', kind: 'custom', recurrence: 'once', date: '2026-03-09' },
  ]
  assert.deepEqual(getUpcomingCalendarEvents(events, { year: 2026, month: 3, day: 8 }).map(event => [event.id, event.daysLeft]), [['today', 0], ['tomorrow', 1]])
  assert.throws(() => getUpcomingCalendarEvents([{ ...events[0], recurrence: 'once', date: '2026-02-30' }], { year: 2026, month: 1, day: 1 }), /日期无效/)
})

it('annual events advance across years and February 29 waits for an actual leap day', () => {
  const events: CalendarEvent[] = [
    { id: 'new-year', title: '元旦', kind: 'holiday', recurrence: 'solar', month: 1, day: 1 },
    { id: 'leap', title: '生日', kind: 'custom', recurrence: 'solar', month: 2, day: 29 },
  ]
  assert.deepEqual(getUpcomingCalendarEvents(events, { year: 2026, month: 12, day: 31 }).map(event => [event.id, event.date]), [['new-year', '2027-01-01'], ['leap', '2028-02-29']])
})

it('lunar holidays match published calendar dates and roll forward after the day', () => {
  const spring: CalendarEvent = { id: 'spring', title: '春节', kind: 'holiday', recurrence: 'lunar', month: 1, day: 1 }
  const autumn: CalendarEvent = { id: 'autumn', title: '中秋', kind: 'holiday', recurrence: 'lunar', month: 8, day: 15 }
  assert.equal(getUpcomingCalendarEvents([spring], { year: 2026, month: 10, day: 9 })[0].date, '2027-02-06')
  assert.equal(getUpcomingCalendarEvents([spring], { year: 2027, month: 2, day: 6 })[0].daysLeft, 0)
  assert.equal(getUpcomingCalendarEvents([spring], { year: 2027, month: 2, day: 7 })[0].date, '2028-01-26')
  assert.equal(getUpcomingCalendarEvents([autumn], { year: 2026, month: 9, day: 1 })[0].date, '2026-09-25')
  assert.equal(getLunarLabel({ year: 2026, month: 9, day: 25 }), '农历八月十五')
})

it('year remaining days exclude today and waiting days use elapsed calendar days', () => {
  assert.equal(getYearRemainingDays({ year: 2026, month: 10, day: 9 }), 83)
  assert.equal(getYearRemainingDays({ year: 2026, month: 12, day: 31 }), 0)
  assert.equal(getYearRemainingDays({ year: 2024, month: 1, day: 1 }), 365)
  assert.equal(getCalendarElapsedDays('2025-07-18', { year: 2026, month: 10, day: 9 }), 448)
  assert.equal(getCalendarElapsedDays('2026-10-09', { year: 2026, month: 10, day: 9 }), 0)
})

it('month grids start on Monday, include leap days, and show events even before today', () => {
  const february = getCalendarMonth(2024, 2)
  assert.deepEqual(february.slice(0, 4), [null, null, null, 1])
  assert.equal(february.filter(Boolean).length, 29)
  assert.equal(february.length % 7, 0)
  assert.deepEqual(getCalendarMonthEvents([{ id: 'national-day', title: '国庆', kind: 'holiday', recurrence: 'solar', month: 10, day: 1 }], 2026, 10).map(event => event.date), ['2026-10-01'])
})

it('the nearest personal countdown remains visible among multiple earlier holidays', () => {
  const events: CalendarEvent[] = [
    { id: 'new-year', title: '元旦', kind: 'holiday', recurrence: 'solar', month: 1, day: 1 },
    { id: 'spring', title: '春节', kind: 'holiday', recurrence: 'lunar', month: 1, day: 1 },
    { id: 'birthday', title: '生日', kind: 'custom', recurrence: 'solar', month: 5, day: 20 },
    { id: 'trip', title: '旅行', kind: 'custom', recurrence: 'once', date: '2027-06-01' },
  ]
  assert.deepEqual(getCalendarHighlights(getUpcomingCalendarEvents(events, { year: 2026, month: 10, day: 9 })).map(event => event.id), ['new-year', 'birthday'])
  assert.deepEqual(getCalendarHighlights([]), [])
})
