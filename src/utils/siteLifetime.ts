const DAY = 86400000

function calendarDay(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
    return null
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(0)
  date.setUTCFullYear(year, month - 1, day)
  date.setUTCHours(0, 0, 0, 0)
  return date.toISOString().slice(0, 10) === value ? date.getTime() / DAY : null
}

export function getSiteDays(startedOn: string | null, now = new Date(), timeZone = 'Asia/Shanghai'): number | null {
  if (!startedOn)
    return null
  const start = calendarDay(startedOn)
  if (start === null)
    return null
  const parts = new Intl.DateTimeFormat('en', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  const part = (type: string) => parts.find(p => p.type === type)?.value
  const today = calendarDay(`${part('year')}-${part('month')}-${part('day')}`)
  return today === null || today < start ? null : today - start
}

/** Calendar labels share the uptime time zone, independent of the visitor's zone. */
export function getSiteDate(now = new Date(), timeZone = 'Asia/Shanghai') {
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  }).formatToParts(now)
  const part = (type: string) => parts.find(p => p.type === type)!.value
  return {
    iso: `${part('year')}-${part('month')}-${part('day')}`,
    monthDay: `${part('month')} / ${part('day')}`,
    weekdayYear: `${part('weekday')} · ${part('year')}`,
  }
}
