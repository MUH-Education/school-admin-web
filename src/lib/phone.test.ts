import { normalizePhone } from './phone'

describe('normalizePhone', () => {
  it.each(['98123 45678', '09812345678', '+91 98123 45678', '919812345678'])(
    'accepts %s',
    (text) => {
      expect(normalizePhone(text)).toBe('+919812345678')
    },
  )
  it.each(['12345', '98123 4567', '5812345678', 'abcdefghij', ''])('rejects %s', (text) => {
    expect(normalizePhone(text)).toBeNull()
  })
})
