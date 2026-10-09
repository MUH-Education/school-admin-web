import { http, HttpResponse } from 'msw'
import type { Duty, StaffBody } from '@/features/vehicles/types'
import { normalizePhone } from '@/lib/phone'
import type { MockStaff } from '../data/fleet'
import { db } from '../db'
import { duties, placementOf, toStaff } from '../fleetLogic'
import { authorize, errorResponse, wait } from '../http'
import { MOCK_TODAY } from '../now'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function check(body: Partial<StaffBody>): { fields: Record<string, string>; phone: string | null } {
  const fields: Record<string, string> = {}
  const phone = normalizePhone(body.phone ?? '')
  if (!body.name?.trim()) fields.name = 'Enter the name.'
  if (!body.type || !duties.includes(body.type)) fields.type = 'Pick the work.'
  if (!phone) fields.phone = 'Enter a 10-digit mobile number.'
  if (body.type === 'DRIVER') {
    if (!body.licenceNo?.trim()) fields.licenceNo = 'Enter the licence number.'
    if (!body.licenceValidTill || !ISO_DATE.test(body.licenceValidTill)) {
      fields.licenceValidTill = 'Enter the date the licence ends.'
    }
  }
  return { fields, phone }
}

export const staffHandlers = [
  http.get('/api/v1/staff', async ({ request }) => {
    await wait()
    const me = authorize(request, 'VEHICLES_VIEW')
    if (me instanceof Response) return me
    const type = new URL(request.url).searchParams.get('type')
    const rows = db.staff.filter((s) => s.active && (!type || s.type === type)).map(toStaff)
    return HttpResponse.json(rows)
  }),

  http.post('/api/v1/staff', async ({ request }) => {
    await wait()
    const me = authorize(request, 'VEHICLES_EDIT')
    if (me instanceof Response) return me
    const body = (await request.json()) as StaffBody
    const { fields, phone } = check(body)
    if (Object.keys(fields).length > 0 || !phone) {
      return errorResponse(400, 'VALIDATION', 'Check the form.', { fields })
    }
    const created: MockStaff = {
      id: db.nextStaffId++,
      name: body.name.trim(),
      type: body.type as Duty,
      phone,
      licenceNo: body.type === 'DRIVER' ? (body.licenceNo?.trim() ?? null) : null,
      licenceValidTill: body.type === 'DRIVER' ? (body.licenceValidTill ?? null) : null,
      active: true,
    }
    db.staff.push(created)
    return HttpResponse.json(toStaff(created), { status: 201 })
  }),

  http.put('/api/v1/staff/:id', async ({ request, params }) => {
    await wait()
    const me = authorize(request, 'VEHICLES_EDIT')
    if (me instanceof Response) return me
    const person = db.staff.find((s) => s.id === Number(params.id) && s.active)
    if (!person) return errorResponse(404, 'NOT_FOUND', 'This person does not exist.')
    const body = (await request.json()) as StaffBody
    const { fields, phone } = check(body)
    if (Object.keys(fields).length > 0 || !phone) {
      return errorResponse(400, 'VALIDATION', 'Check the form.', { fields })
    }
    if (body.type !== person.type && placementOf(person.id)) {
      return errorResponse(
        409,
        'WRONG_STAFF_TYPE',
        `${person.name} is on a vehicle. Take them off it before changing their work.`,
      )
    }
    person.name = body.name.trim()
    person.type = body.type
    person.phone = phone
    person.licenceNo = body.type === 'DRIVER' ? (body.licenceNo?.trim() ?? null) : null
    person.licenceValidTill = body.type === 'DRIVER' ? (body.licenceValidTill ?? null) : null
    return HttpResponse.json(toStaff(person))
  }),

  http.delete('/api/v1/staff/:id', async ({ request, params }) => {
    await wait()
    const me = authorize(request, 'VEHICLES_EDIT')
    if (me instanceof Response) return me
    const person = db.staff.find((s) => s.id === Number(params.id) && s.active)
    if (!person) return errorResponse(404, 'NOT_FOUND', 'This person does not exist.')
    const place = placementOf(person.id)
    const comingUp = db.assignments.some(
      (a) => a.staffId === person.id && (a.toDate === null || a.toDate >= MOCK_TODAY),
    )
    if (place || comingUp) {
      return errorResponse(
        409,
        'STAFF_ON_VEHICLE',
        `${person.name} is still on ${place?.vehicleName ?? 'a vehicle'}. Change the person there first.`,
      )
    }
    person.active = false
    return new HttpResponse(null, { status: 204 })
  }),
]
