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

/** formatLoad(1.357) → 1.36× */
export function formatLoad(load: number): string {
  return `${load.toFixed(2)}×`
}

function indiaToday(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONE }).format(now)
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
