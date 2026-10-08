import { api, setToken } from '@/api/client'
import type { LoginResponse } from '@/auth/types'
import type { User } from '@/features/users/types'

async function loginAs(phone: string): Promise<void> {
  await api('POST', '/auth/otp/request', { phone })
  const result = await api<LoginResponse>('POST', '/auth/otp/verify', { phone, otp: '000000' })
  setToken(result.token)
}

describe('mock auth and users', () => {
  it('logs in with 000000 and refuses a wrong code', async () => {
    await expect(
      api('POST', '/auth/otp/verify', { phone: '98123 40001', otp: '111111' }),
    ).rejects.toMatchObject({ code: 'OTP_INVALID' })
    await loginAs('98123 40001')
    const me = await api<{ role: string }>('GET', '/auth/me')
    expect(me.role).toBe('OWNER')
  })

  it('answers the same for an unknown number', async () => {
    const result = await api<{ message: string }>('POST', '/auth/otp/request', {
      phone: '9000000000',
    })
    expect(result.message).toMatch(/If this number is registered/)
  })

  it('locks after five wrong codes', async () => {
    await api('POST', '/auth/otp/request', { phone: '9812340001' })
    for (let i = 0; i < 5; i++) {
      await api('POST', '/auth/otp/verify', { phone: '9812340001', otp: '999999' }).catch(() => {})
    }
    await expect(
      api('POST', '/auth/otp/verify', { phone: '9812340001', otp: '000000' }),
    ).rejects.toMatchObject({ code: 'OTP_LOCKED' })
  })

  it('gives 403 to a role without the permission and 401 without a token', async () => {
    await expect(api('GET', '/users')).rejects.toMatchObject({ status: 401 })
    await loginAs('9812340004')
    await expect(api('GET', '/users')).rejects.toMatchObject({ status: 403 })
  })

  it('adds a user and shows them in the next GET', async () => {
    await loginAs('9812340001')
    await api('POST', '/users', { phone: '9876500000', role: 'OFFICE_ADMIN' })
    const users = await api<User[]>('GET', '/users')
    expect(users.some((u) => u.phone === '+919876500000')).toBe(true)
  })

  it('returns the three business errors', async () => {
    await loginAs('9812340001')
    await expect(
      api('POST', '/users', { phone: '9812340002', role: 'OFFICE_ADMIN' }),
    ).rejects.toMatchObject({ code: 'PHONE_ALREADY_USED' })
    await expect(api('PUT', '/users/1', { active: false })).rejects.toMatchObject({
      code: 'CANNOT_DISABLE_SELF',
    })
    await api('POST', '/users', { phone: '9876500001', role: 'OWNER' })
    await loginAs('9876500001')
    await api('PUT', '/users/1', { active: false })
    await expect(api('PUT', '/users/100', { role: 'OFFICE_ADMIN' })).rejects.toMatchObject({
      code: 'LAST_OWNER',
    })
  })

  it('needs a staff member for the Attendant role', async () => {
    await loginAs('9812340001')
    await expect(
      api('POST', '/users', { phone: '9876500002', role: 'ATTENDANT' }),
    ).rejects.toMatchObject({
      status: 400,
      fields: { staffId: expect.any(String) },
    })
  })
})
