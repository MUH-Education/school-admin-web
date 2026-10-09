import {
  daysFromToday,
  formatClock,
  formatDayClock,
  formatTimeAmPm,
  formatWeekdayDate,
  formatDate,
  formatDayMonth,
  formatInr,
  formatLoad,
  formatLongDate,
  formatTime,
  isoWithOffset,
  nextSessionLabel,
  maskPhone,
  formatMonth,
  plural,
} from './format'

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

describe('more date helpers', () => {
  it('formats a long date and a day with month', () => {
    expect(formatLongDate('2026-10-28')).toBe('28 October 2026')
    expect(formatDayMonth('2026-09-30')).toBe('30 Sep')
  })
  it('formats a stop time', () => {
    expect(formatClock('07:25')).toBe('7:25')
    expect(formatClock('16:05')).toBe('16:05')
  })
})

describe('bus screen times', () => {
  it('shows a stop time with pm only in the afternoon', () => {
    expect(formatDayClock('07:25')).toBe('7:25')
    expect(formatDayClock('12:05')).toBe('12:05 pm')
    expect(formatDayClock('15:20')).toBe('3:20 pm')
  })
  it('shows the time of an answer in Indian time with am or pm', () => {
    expect(formatTimeAmPm('2026-10-07T07:48:00+05:30')).toBe('7:48 am')
    expect(formatTimeAmPm('2026-10-07T02:18:00.000Z')).toBe('7:48 am')
    expect(formatTimeAmPm('2026-10-07T15:32:00+05:30')).toBe('3:32 pm')
  })
  it('writes the day with its weekday', () => {
    expect(formatWeekdayDate('2026-10-07')).toBe('Wednesday 7 October 2026')
  })
})

describe('isoWithOffset', () => {
  it('writes the phone time with the Indian offset, on any laptop', () => {
    expect(isoWithOffset(new Date('2026-10-07T02:12:10Z'))).toBe('2026-10-07T07:42:10+05:30')
  })
  it('moves to the next day after 18:30 UTC', () => {
    expect(isoWithOffset(new Date('2026-10-07T19:00:00Z'))).toBe('2026-10-08T00:30:00+05:30')
  })
})

describe('nextSessionLabel', () => {
  it('is the year after the current school year', () => {
    expect(nextSessionLabel(new Date('2026-10-07T02:12:10Z'))).toBe('2027–28')
    expect(nextSessionLabel(new Date('2027-02-10T02:12:10Z'))).toBe('2027–28')
    expect(nextSessionLabel(new Date('2027-04-02T02:12:10Z'))).toBe('2028–29')
  })
})

describe('formatMonth and plural', () => {
  it('writes the month in short or long form', () => {
    expect(formatMonth('2026-04')).toBe('Apr')
    expect(formatMonth('2026-09')).toBe('Sep')
    expect(formatMonth('2026-10', 'long')).toBe('October')
    expect(formatMonth('2027-01', 'long')).toBe('January')
  })

  it('counts one and many', () => {
    expect(plural(1, 'student')).toBe('1 student')
    expect(plural(0, 'student')).toBe('0 students')
    expect(plural(76, 'village')).toBe('76 villages')
  })
})
