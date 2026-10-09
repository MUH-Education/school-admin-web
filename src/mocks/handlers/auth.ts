import { http, HttpResponse } from 'msw'
import type { AuthUser, OtpRequestBody, OtpVerifyBody } from '@/auth/types'
import { normalizePhone } from '@/lib/phone'
import { rolePermissions } from '../data/roles'
import { sampleAttendants, type MockUser } from '../data/users'
import { db } from '../db'
import { authorize, errorResponse, tokenFor, wait } from '../http'

const OTP_CODE = '000000'
const MAX_ATTEMPTS = 5

export function toAuthUser(user: MockUser): AuthUser {
  const staff = sampleAttendants.find((s) => s.id === user.staffId)
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    role: user.role,
    permissions: rolePermissions[user.role],
    route:
      staff?.route && staff.vehicle
        ? { id: Number(staff.route.replace(/\D/g, '')), name: staff.route, vehicle: staff.vehicle }
        : null,
  }
}

export const authHandlers = [
  http.post('/api/v1/auth/otp/request', async ({ request }) => {
    await wait()
    const body = (await request.json()) as OtpRequestBody
    const phone = normalizePhone(body.phone ?? '')
    if (!phone) {
      return errorResponse(400, 'VALIDATION', 'Enter a valid mobile number.', {
        fields: { phone: 'Enter a valid mobile number.' },
      })
    }
    db.otpAttempts.set(phone, 0)
    // Same answer for a known and an unknown number.
    return HttpResponse.json({
      message: 'If this number is registered, a code has been sent.',
      expiresInSeconds: 300,
      resendAfterSeconds: 60,
    })
  }),

  http.post('/api/v1/auth/otp/verify', async ({ request }) => {
    await wait()
    const body = (await request.json()) as OtpVerifyBody
    const phone = normalizePhone(body.phone ?? '')
    const user = phone ? db.users.find((u) => u.phone === phone && u.active) : undefined
    if (!phone || !user) {
      return errorResponse(401, 'OTP_INVALID', 'The code is wrong or too old.')
    }
    const attempts = db.otpAttempts.get(phone) ?? 0
    if (attempts >= MAX_ATTEMPTS) {
      return errorResponse(429, 'OTP_LOCKED', 'Too many wrong tries.')
    }
    if (body.otp !== OTP_CODE) {
      db.otpAttempts.set(phone, attempts + 1)
      return errorResponse(401, 'OTP_INVALID', 'The code is wrong or too old.')
    }
    return HttpResponse.json({
      token: tokenFor(user),
      expiresAt: '2026-11-06T09:15:00+05:30',
      user: toAuthUser(user),
    })
  }),

  http.get('/api/v1/auth/me', async ({ request }) => {
    await wait()
    const user = authorize(request)
    if (user instanceof Response) return user
    return HttpResponse.json(toAuthUser(user))
  }),

  http.post('/api/v1/auth/logout', async ({ request }) => {
    const user = authorize(request)
    if (user instanceof Response) return user
    return new HttpResponse(null, { status: 204 })
  }),
]
