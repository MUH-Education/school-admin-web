const ZONE = 'Asia/Kolkata'

const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })

/** formatInr(867900) → ₹8,67,900 ; formatInr(-174460) → −₹1,74,460 */
export function formatInr(amount: number): string {
  const text = `₹${inr.format(Math.abs(amount))}`
  return amount < 0 ? `−${text}` : text
}

/** formatDate('2026-10-07') → 7 Oct 2026 */
export function formatDate(iso: string): string {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00+05:30`) : new Date(iso)
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: ZONE,
  })
    .format(date)
    .replace('Sept', 'Sep')
}

/** formatLongDate('2026-10-28') → 28 October 2026 */
export function formatLongDate(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: ZONE,
  }).format(new Date(`${iso}T00:00:00+05:30`))
}

/** formatLongDayMonth('2026-11-02') → 2 November */
export function formatLongDayMonth(iso: string): string {
  return formatLongDate(iso).replace(/ \d{4}$/, '')
}

/** formatDayMonth('2026-10-28') → 28 Oct */
export function formatDayMonth(iso: string): string {
  return formatDate(iso).replace(/ \d{4}$/, '')
}

/** formatTime('2026-10-07T07:42:10+05:30') → 7:42, in Indian time on any laptop */
export function formatTime(iso: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    hour: 'numeric',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: ZONE,
  }).formatToParts(new Date(iso))
  const hour = parts.find((p) => p.type === 'hour')?.value ?? ''
  const minute = parts.find((p) => p.type === 'minute')?.value ?? ''
  return `${Number(hour)}:${minute}`
}

/** formatClock('07:25') → 7:25. For a stop time that comes as plain text. */
export function formatClock(hhmm: string): string {
  const [hour = '', minute = ''] = hhmm.split(':')
  return `${Number(hour)}:${minute}`
}

/**
 * formatDayClock('07:25') → 7:25 ; formatDayClock('15:20') → 3:20 pm.
 * For the bus screens: the morning has no am, the afternoon says pm.
 */
export function formatDayClock(hhmm: string): string {
  const [hour = '', minute = ''] = hhmm.split(':')
  const h = Number(hour)
  if (h < 12) return `${h}:${minute}`
  return `${h > 12 ? h - 12 : h}:${minute} pm`
}

/** formatTimeAmPm('2026-10-07T07:48:00+05:30') → 7:48 am, in Indian time on any laptop */
export function formatTimeAmPm(iso: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: ZONE,
  }).formatToParts(new Date(iso))
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return `${get('hour')}:${get('minute')} ${get('dayPeriod').toLowerCase()}`
}

/** formatWeekdayDate('2026-10-07') → Wednesday 7 October 2026 */
export function formatWeekdayDate(iso: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: ZONE,
  }).formatToParts(new Date(`${iso}T00:00:00+05:30`))
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return `${get('weekday')} ${get('day')} ${get('month')} ${get('year')}`
}

/** formatLoad(1.357) → 1.36× */
export function formatLoad(load: number): string {
  return `${load.toFixed(2)}×`
}

function indiaToday(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONE }).format(now)
}

/** Today's date in India as ISO text, for example 2026-10-07. */
export function todayIso(now: Date = new Date()): string {
  return indiaToday(now)
}

/** Days from today to an ISO date. daysFromToday('2026-10-28') on 7 Oct 2026 → 21 */
export function daysFromToday(iso: string, now: Date = new Date()): number {
  const day = 24 * 60 * 60 * 1000
  return Math.round(
    (Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${indiaToday(now)}T00:00:00Z`)) / day,
  )
}

/** maskPhone('+919812345678') → +91XXXXXX5678 */
export function maskPhone(phone: string): string {
  const prefix = phone.startsWith('+91') ? '+91' : ''
  const rest = phone.slice(prefix.length)
  if (rest.length <= 4) return phone
  return `${prefix}${'X'.repeat(rest.length - 4)}${rest.slice(-4)}`
}

/** The school year runs April to March: 7 Oct 2026 → "2026–27". */
export function sessionLabel(now: Date = new Date()): string {
  const year = Number(
    new Intl.DateTimeFormat('en-GB', { year: 'numeric', timeZone: 'Asia/Kolkata' }).format(now),
  )
  const month = Number(
    new Intl.DateTimeFormat('en-GB', { month: 'numeric', timeZone: 'Asia/Kolkata' }).format(now),
  )
  const start = month >= 4 ? year : year - 1
  return `${start}–${String(start + 1).slice(-2)}`
}
