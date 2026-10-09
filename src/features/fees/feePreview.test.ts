import { formatInr } from '@/lib/format'
import { describePayments, feePreview, type FeePreviewInput } from './feePreview'
import { dueDates, splitAmount } from './schedule'

const base: FeePreviewInput = {
  schoolFee: 30000,
  busFee: 8800,
  discount: 0,
  frequency: 'QUARTERLY',
  paidToday: 9700,
  startsOn: '2026-10-07',
}

describe('feePreview', () => {
  it('feePreviewExample38800: ₹30,000 + ₹8,800 − ₹0 = ₹38,800, four payments of ₹9,700', () => {
    const p = feePreview(base)
    expect(p.total).toBe(38800)
    expect(p.paidToday).toBe(9700)
    expect(p.stillToPay).toBe(29100)
    expect(p.payments).toEqual([9700, 9700, 9700, 9700])
    expect(p.next).toEqual({ amount: 9700, dueDate: '2027-01-01' })
    expect(describePayments(p.payments, formatInr)).toBe('4 payments of ₹9,700 in the year.')
  })

  it('busFeeIsHiddenWhenNoBus: a bus fee of 0 adds nothing', () => {
    const p = feePreview({ ...base, busFee: 0, paidToday: 0 })
    expect(p.total).toBe(30000)
    expect(p.payments).toEqual([7500, 7500, 7500, 7500])
  })

  it('takes the discount off the total', () => {
    const p = feePreview({ ...base, discount: 2000, paidToday: 0 })
    expect(p.total).toBe(36800)
    expect(p.stillToPay).toBe(36800)
    expect(p.payments).toEqual([9200, 9200, 9200, 9200])
  })

  it('counts an empty box as 0', () => {
    const p = feePreview({
      ...base,
      schoolFee: null,
      busFee: null,
      discount: null,
      paidToday: null,
    })
    expect(p).toMatchObject({ total: 0, paidToday: 0, stillToPay: 0, payments: [], next: null })
  })

  it('gives the odd rupees to the last payment when the total does not divide evenly', () => {
    const p = feePreview({ ...base, schoolFee: 30001, busFee: 8800, paidToday: 0 })
    expect(p.total).toBe(38801)
    expect(p.payments).toEqual([9700, 9700, 9700, 9701])
    expect(p.payments.reduce((a, b) => a + b, 0)).toBe(38801)
    expect(p.next).toEqual({ amount: 9700, dueDate: '2026-10-07' })
    expect(describePayments(p.payments, formatInr)).toBe(
      '4 payments in the year: 3 of ₹9,700 and the last of ₹9,701.',
    )
  })

  it('splits 12 monthly payments with the odd rupees in the last one', () => {
    const p = feePreview({
      ...base,
      frequency: 'MONTHLY',
      schoolFee: 30000,
      busFee: 8805,
      paidToday: 3233,
    })
    expect(p.total).toBe(38805)
    expect(p.payments).toHaveLength(12)
    expect(p.payments.slice(0, 11).every((n) => n === 3233)).toBe(true)
    expect(p.payments[11]).toBe(38805 - 3233 * 11)
    expect(p.next).toEqual({ amount: 3233, dueDate: '2026-11-01' })
  })

  it('has one payment when the family pays once a year', () => {
    const p = feePreview({ ...base, frequency: 'YEARLY', paidToday: 0 })
    expect(p.payments).toEqual([38800])
    expect(p.next).toEqual({ amount: 38800, dueDate: '2026-10-07' })
    expect(describePayments(p.payments, formatInr)).toBe('1 payment of ₹38,800 in the year.')
  })

  it('moves the next payment on when the money paid today is more than one payment', () => {
    const p = feePreview({ ...base, paidToday: 15000 })
    expect(p.stillToPay).toBe(23800)
    // 9,700 covers the first payment; 5,300 of the second is paid, 4,400 is left.
    expect(p.next).toEqual({ amount: 4400, dueDate: '2027-01-01' })
  })

  it('has no next payment when everything is paid, and flags too much', () => {
    expect(feePreview({ ...base, paidToday: 38800 })).toMatchObject({ stillToPay: 0, next: null })
    expect(feePreview({ ...base, paidToday: 40000 })).toMatchObject({
      stillToPay: 0,
      paidTooLarge: true,
    })
    expect(feePreview({ ...base, discount: 50000 })).toMatchObject({
      total: 0,
      discountTooLarge: true,
    })
  })

  it('shows no payments until the family says how often it pays', () => {
    const p = feePreview({ ...base, frequency: null })
    expect(p.total).toBe(38800)
    expect(p.payments).toEqual([])
    expect(p.next).toBeNull()
  })
})

describe('payment dates', () => {
  it('starts on the admission date, then on the 1st of a month, a step apart', () => {
    expect(dueDates('2026-10-07', 'QUARTERLY')).toEqual([
      '2026-10-07',
      '2027-01-01',
      '2027-04-01',
      '2027-07-01',
    ])
    expect(dueDates('2026-04-01', 'MONTHLY').slice(0, 3)).toEqual([
      '2026-04-01',
      '2026-05-01',
      '2026-06-01',
    ])
    expect(dueDates('2026-12-15', 'YEARLY')).toEqual(['2026-12-15'])
  })

  it('splits whole rupees, never losing one', () => {
    expect(splitAmount(38800, 4)).toEqual([9700, 9700, 9700, 9700])
    expect(splitAmount(10, 3)).toEqual([3, 3, 4])
    expect(splitAmount(2, 4)).toEqual([0, 0, 0, 2])
  })
})
