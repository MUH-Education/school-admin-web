import { http, HttpResponse } from 'msw'
import type { RoleCode } from '@/auth/types'
import type { CreateUserBody, UpdateUserBody, User } from '@/features/users/types'
import { normalizePhone } from '@/lib/phone'
import { roleTable } from '../data/roles'
import { sampleAttendants, type MockUser } from '../data/users'
import { db } from '../db'
import { authorize, errorResponse, routeNameOf, wait } from '../http'

const roleCodes: RoleCode[] = [
  'OWNER',
  'OFFICE_ADMIN',
  'TRANSPORT_INCHARGE',
  'ADMISSIONS_DESK',
  'ATTENDANT',
]

function toUser(user: MockUser): User {
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    role: user.role,
    active: user.active,
    route: routeNameOf(user),
  }
}

function activeOwners(): MockUser[] {
  return db.users.filter((u) => u.role === 'OWNER' && u.active)
}

export const userHandlers = [
  http.get('/api/v1/roles', async ({ request }) => {
    await wait()
    const user = authorize(request, 'USERS_MANAGE')
    if (user instanceof Response) return user
    return HttpResponse.json(roleTable)
  }),

  http.get('/api/v1/users', async ({ request }) => {
    await wait()
    const user = authorize(request, 'USERS_MANAGE')
    if (user instanceof Response) return user
    return HttpResponse.json(db.users.map(toUser))
  }),

  http.get('/api/v1/staff', async ({ request }) => {
    await wait()
    const user = authorize(request, 'VEHICLES_VIEW')
    if (user instanceof Response) return user
    const attendants = sampleAttendants.map(({ id, name, type, route }) => ({
      id,
      name,
      type,
      route,
    }))
    return HttpResponse.json(attendants)
  }),

  http.post('/api/v1/users', async ({ request }) => {
    await wait()
    const me = authorize(request, 'USERS_MANAGE')
    if (me instanceof Response) return me
    const body = (await request.json()) as CreateUserBody

    const fields: Record<string, string> = {}
    const phone = normalizePhone(body.phone ?? '')
    if (!phone) fields.phone = 'Enter a 10-digit mobile number.'
    if (!roleCodes.includes(body.role)) fields.role = 'Pick a role.'
    if (body.role === 'ATTENDANT' && !body.staffId) fields.staffId = 'Pick the attendant.'
    if (Object.keys(fields).length > 0 || !phone) {
      return errorResponse(400, 'VALIDATION', 'Check the form.', { fields })
    }
    if (db.users.some((u) => u.phone === phone)) {
      return errorResponse(409, 'PHONE_ALREADY_USED', 'This phone number already has a login.')
    }

    const created: MockUser = {
      id: db.nextUserId++,
      name: body.name?.trim() || null,
      phone,
      role: body.role,
      active: true,
      staffId: body.role === 'ATTENDANT' ? (body.staffId ?? null) : null,
    }
    db.users.push(created)
    return HttpResponse.json(toUser(created), { status: 201 })
  }),

  http.put('/api/v1/users/:id', async ({ request, params }) => {
    await wait()
    const me = authorize(request, 'USERS_MANAGE')
    if (me instanceof Response) return me
    const target = db.users.find((u) => u.id === Number(params.id))
    if (!target) return errorResponse(404, 'NOT_FOUND', 'This user does not exist.')
    const body = (await request.json()) as UpdateUserBody

    let phone = target.phone
    if (body.phone !== undefined) {
      const normalized = normalizePhone(body.phone)
      if (!normalized) {
        return errorResponse(400, 'VALIDATION', 'Check the form.', {
          fields: { phone: 'Enter a 10-digit mobile number.' },
        })
      }
      if (db.users.some((u) => u.id !== target.id && u.phone === normalized)) {
        return errorResponse(409, 'PHONE_ALREADY_USED', 'This phone number already has a login.')
      }
      phone = normalized
    }
    if (body.role !== undefined && !roleCodes.includes(body.role)) {
      return errorResponse(400, 'VALIDATION', 'Check the form.', {
        fields: { role: 'Pick a role.' },
      })
    }

    const turningOff = body.active === false && target.active
    if (turningOff && target.id === me.id) {
      return errorResponse(409, 'CANNOT_DISABLE_SELF', 'You cannot turn off your own login.')
    }
    const losesOwner =
      target.role === 'OWNER' &&
      target.active &&
      (turningOff || (body.role !== undefined && body.role !== 'OWNER'))
    if (losesOwner && activeOwners().length <= 1) {
      return errorResponse(409, 'LAST_OWNER', 'The school must keep at least one active owner.')
    }

    target.phone = phone
    if (body.name !== undefined) target.name = body.name.trim() || null
    if (body.role !== undefined) target.role = body.role
    if (body.active !== undefined) target.active = body.active
    return HttpResponse.json(toUser(target))
  }),
]
