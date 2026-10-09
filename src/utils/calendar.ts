import solarLunar from 'solarlunar'

export interface CalendarDay {
  year: number
  month: number
  day: number
}

export type CalendarEvent = {
  id: string
  title: string
  kind: 'holiday' | 'custom'
} & ({ recurrence: 'once', date: string } | { recurrence: 'solar' | 'lunar', month: number, day: number })

export interface CalendarSettings {
  timeZone: string
  waitSince: string
  events: CalendarEvent[]
}

export interface UpcomingCalendarEvent {
  id: string
  title: string
  kind: 'holiday' | 'custom'
  date: string
  daysLeft: number
}

const dayLength = 86400000

function serial(day: CalendarDay) {
  return Date.UTC(day.year, day.month - 1, day.day) / dayLength
}

export function calendarDate(day: CalendarDay) {
  return `${day.year}-${String(day.month).padStart(2, '0')}-${String(day.day).padStart(2, '0')}`
}

export function getYearRemainingDays(today: CalendarDay) {
  return serial({ year: today.year + 1, month: 1, day: 1 }) - serial(today) - 1
}

export function getCalendarElapsedDays(since: string, today: CalendarDay) {
  return Math.max(0, serial(today) - serial(parseDate(since)))
}

export function getCalendarToday(now: Date, timeZone: string): CalendarDay {
  const parts = new Intl.DateTimeFormat('en', { year: 'numeric', month: 'numeric', day: 'numeric', timeZone }).formatToParts(now)
  const part = (type: string) => Number(parts.find(part => part.type === type)?.value)
  return { year: part('year'), month: part('month'), day: part('day') }
}

function parseDate(value: string): CalendarDay {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new Error(`日历日期格式无效：${value}`)
  const [year, month, day] = value.split('-').map(Number)
  const parsed = new Date(Date.UTC(year, month - 1, day))
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() + 1 !== month || parsed.getUTCDate() !== day)
    throw new Error(`日历日期无效：${value}`)
  return { year, month, day }
}

export function getLunarLabel(day: CalendarDay) {
  const lunar = solarLunar.solar2lunar(day.year, day.month, day.day)
  return lunar === -1 ? '' : `农历${lunar.isLeap ? '闰' : ''}${lunar.monthCn}${lunar.dayCn}`
}

export function getUpcomingCalendarEvents(events: CalendarEvent[], today: CalendarDay): UpcomingCalendarEvent[] {
  const todaySerial = serial(today)
  return events.flatMap((event) => {
    let target: number | undefined
    if (event.recurrence === 'once') {
      target = serial(parseDate(event.date))
    }
    else if (event.recurrence === 'lunar') {
      // Chinese calendar conversion is independent of the browser's ICU version.
      for (let year = Math.max(1900, today.year - 1); year <= Math.min(2100, today.year + 2); year++) {
        const date = solarLunar.lunar2solar(year, event.month, event.day, false)
        if (date === -1)
          continue
        const candidate = serial({ year: date.cYear, month: date.cMonth, day: date.cDay })
        if (candidate >= todaySerial) {
          target = candidate
          break
        }
      }
    }
    else {
      for (let year = today.year; year <= today.year + 8; year++) {
        const date = new Date(Date.UTC(year, event.month - 1, event.day))
        if (date.getUTCMonth() + 1 !== event.month || date.getUTCDate() !== event.day)
          continue
        const candidate = date.getTime() / dayLength
        if (candidate >= todaySerial) {
          target = candidate
          break
        }
      }
    }
    if (target === undefined || target < todaySerial)
      return []
    const date = new Date(target * dayLength)
    return [{ id: event.id, title: event.title, kind: event.kind, date: calendarDate({ year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() }), daysLeft: target - todaySerial }]
  }).sort((a, b) => a.daysLeft - b.daysLeft || a.id.localeCompare(b.id))
}

export function getCalendarMonth(year: number, month: number) {
  const leading = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7
  const length = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return Array.from({ length: Math.ceil((leading + length) / 7) * 7 }, (_, index) => index >= leading && index < leading + length ? index - leading + 1 : null)
}

// Reserve a place for a personal countdown instead of burying it behind holidays.
export function getCalendarHighlights(events: UpcomingCalendarEvent[]) {
  return events.filter((event, index) => events.findIndex(candidate => candidate.kind === event.kind) === index)
}

export function getCalendarMonthEvents(events: CalendarEvent[], year: number, month: number) {
  const prefix = calendarDate({ year, month, day: 1 }).slice(0, 7)
  return getUpcomingCalendarEvents(events, { year, month, day: 1 }).filter(event => event.date.startsWith(prefix))
}
