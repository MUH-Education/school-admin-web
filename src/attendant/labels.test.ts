import { i18n } from '@/i18n'
import { classLabel, clock12, dayLabel, hhmm12, routeLabel, vehicleLabel } from './labels'

describe('labels in Hindi', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('hi')
  })
  const t = i18n.t.bind(i18n)

  it('writes the date as the design does', () => {
    expect(dayLabel('2026-10-07', t)).toBe('बुधवार, 7 अक्टूबर')
    expect(dayLabel('2026-01-01', t)).toBe('गुरुवार, 1 जनवरी')
  })
  it('writes route, van and class', () => {
    expect(routeLabel('Route 4', t)).toBe('रूट 4')
    expect(vehicleLabel('Van 4', t)).toBe('वैन 4')
    expect(vehicleLabel('Bus 2', t)).toBe('बस 2')
    expect(routeLabel('Tohana loop', t)).toBe('Tohana loop')
    expect(classLabel('3 B', t)).toBe('कक्षा 3 B')
    expect(classLabel('UKG', t)).toBe('UKG')
  })
})

describe('labels in English', () => {
  it('writes the date and class in English', async () => {
    await i18n.changeLanguage('en')
    const t = i18n.t.bind(i18n)
    expect(dayLabel('2026-10-07', t)).toBe('Wednesday, 7 October')
    expect(classLabel('3 B', t)).toBe('Class 3 B')
  })
})

describe('clocks', () => {
  it('shows a phone time on a 12-hour clock without am or pm', () => {
    expect(clock12('2026-10-07T07:42:10+05:30')).toBe('7:42')
    expect(clock12('2026-10-07T15:05:00+05:30')).toBe('3:05')
    expect(clock12('2026-10-07T12:30:00+05:30')).toBe('12:30')
    expect(clock12('2026-10-07T00:10:00+05:30')).toBe('12:10')
  })
  it('does the same for school times that come as text', () => {
    expect(hhmm12('08:10')).toBe('8:10')
    expect(hhmm12('14:40')).toBe('2:40')
  })
})
