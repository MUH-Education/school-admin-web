import type { TFunction } from 'i18next'
import { formatTime } from '@/lib/format'

/** "Route 4" → "रूट 4" in Hindi. A name that does not follow the pattern is shown as it is. */
export function routeLabel(name: string, t: TFunction): string {
  const match = /^Route (\d+)$/i.exec(name)
  return match ? t('label.route', { n: match[1] }) : name
}

/** "Van 4" → "वैन 4", "Bus 2" → "बस 2". */
export function vehicleLabel(name: string, t: TFunction): string {
  const van = /^Van (\d+)$/i.exec(name)
  if (van) return t('label.van', { n: van[1] })
  const bus = /^Bus (\d+)$/i.exec(name)
  if (bus) return t('label.bus', { n: bus[1] })
  return name
}

/** "3 B" → "कक्षा 3 B"; "UKG" stays "UKG". */
export function classLabel(className: string, t: TFunction): string {
  return /^\d/.test(className) ? t('label.classNumber', { name: className }) : className
}

/** Phone time as 12-hour clock without am or pm, as in the designs: 14:50 → 2:50, 07:42 → 7:42. */
export function clock12(iso: string): string {
  const [hour = '0', minute = '00'] = formatTime(iso).split(':')
  return `${Number(hour) % 12 || 12}:${minute}`
}

/** "14:40" → "2:40", "08:10" → "8:10". For school times that come as plain text. */
export function hhmm12(hhmm: string): string {
  const [hour = '0', minute = '00'] = hhmm.split(':')
  return `${Number(hour) % 12 || 12}:${minute}`
}

/** "2026-10-07" → "बुधवार, 7 अक्टूबर" (or "Wednesday, 7 October"). */
export function dayLabel(date: string, t: TFunction): string {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number)
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
  return t('calendar.dayMonth', {
    weekday: t(`calendar.weekday${weekday}` as 'calendar.weekday0'),
    day,
    month: t(`calendar.month${month - 1}` as 'calendar.month0'),
  })
}
