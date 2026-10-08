import { daysFromToday, formatDate, formatInr, formatLoad, formatTime, maskPhone } from './format'

describe('formatInr', () => {
  it('groups in the Indian way', () => {
    expect(formatInr(867900)).toBe('₹8,67,900')
  })
  it('shows a minus sign for negatives', () => {
    expect(formatInr(-174460)).toBe('−₹1,74,460')
  })
  it('shows zero', () => {
    expect(formatInr(0)).toBe('₹0')
  })
})

describe('dates and times', () => {
  it('formats a date', () => {
    expect(formatDate('2026-10-07')).toBe('7 Oct 2026')
  })
  it('formats a time in Indian time, also when the machine is in UTC', () => {
    expect(formatTime('2026-10-07T07:42:10+05:30')).toBe('7:42')
    expect(formatTime('2026-10-07T02:12:10Z')).toBe('7:42')
  })
  it('counts days from today', () => {
    expect(daysFromToday('2026-10-28', new Date('2026-10-07T07:48:00+05:30'))).toBe(21)
  })
})

describe('formatLoad', () => {
  it('shows two decimals and a times sign', () => {
    expect(formatLoad(1.357)).toBe('1.36×')
  })
})

describe('maskPhone', () => {
  it('hides the middle digits', () => {
    expect(maskPhone('+919812345678')).toBe('+91XXXXXX5678')
  })
})
