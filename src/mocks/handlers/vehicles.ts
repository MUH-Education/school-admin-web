import { http, HttpResponse } from 'msw'
import type {
  AssignmentBody,
  AttentionItem,
  DocumentsBody,
  Duty,
  VehicleBody,
} from '@/features/vehicles/types'
import { paperOrder } from '@/features/vehicles/labels'
import { daysFromToday } from '@/lib/format'
import type { MockVehicle } from '../data/fleet'
import { db } from '../db'
import {
  addDays,
  duties,
  holderOn,
  paperStatus,
  routeOfVehicle,
  staffById,
  toVehicle,
  toVehicleDetail,
} from '../fleetLogic'
import { authorize, errorResponse, wait } from '../http'
import { MOCK_NOW, MOCK_TODAY } from '../now'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const vehicleTypes = ['SMALL_VAN', 'MID_BUS', 'BIG_BUS']
const owners = ['SCHOOL', 'CONTRACTOR']
const reasons = ['ON_LEAVE', 'LEFT_SCHOOL', 'MOVED', 'OTHER']

function activeVehicle(id: unknown): MockVehicle | undefined {
  return db.vehicles.find((v) => v.id === Number(id) && v.active)
}

function checkVehicleBody(body: Partial<VehicleBody>): Record<string, string> {
  const fields: Record<string, string> = {}
  if (!body.name?.trim()) fields.name = 'Enter the name used in school.'
  if (!body.registrationNo?.trim()) fields.registrationNo = 'Enter the registration number.'
  if (!body.vehicleType || !vehicleTypes.includes(body.vehicleType))
    fields.vehicleType = 'Pick a type.'
  if (!Number.isInteger(body.seats) || (body.seats ?? 0) < 1)
    fields.seats = 'Seats must be 1 or more.'
  if (typeof body.monthlyCost !== 'number' || body.monthlyCost < 0) {
    fields.monthlyCost = 'Enter the cost per month.'
  }
  if (body.ownedBy && !owners.includes(body.ownedBy)) fields.ownedBy = 'Pick who owns it.'
  return fields
}

function verbFor(duty: Duty): string {
  if (duty === 'DRIVER') return 'drives'
  return duty === 'ATTENDANT' ? 'is the attendant on' : 'is the helper on'
}

export const vehicleHandlers = [
  http.get('/api/v1/vehicles/attention', async ({ request }) => {
    await wait()
    const me = authorize(request, 'VEHICLES_VIEW')
    if (me instanceof Response) return me
    const items: AttentionItem[] = []
    for (const v of db.vehicles.filter((x) => x.active)) {
      for (const kind of paperOrder) {
        const daysLeft = daysFromToday(v.papers[kind], MOCK_NOW)
        const status = paperStatus(daysLeft)
        if (status === 'VALID') continue
        items.push({
          subjectType: 'VEHICLE',
          subject: v.name,
          vehicleId: v.id,
          item: kind,
          validTill: v.papers[kind],
          status,
          daysLeft,
        })
      }
    }
    for (const s of db.staff.filter((x) => x.active && x.licenceValidTill)) {
      const daysLeft = daysFromToday(s.licenceValidTill as string, MOCK_NOW)
      const status = paperStatus(daysLeft)
      if (status === 'VALID') continue
      items.push({
        subjectType: 'STAFF',
        subject: s.name,
        vehicleId: null,
        item: 'LICENCE',
        validTill: s.licenceValidTill as string,
        status,
        daysLeft,
      })
    }
    // Ended first, then ending; the closest date first.
    items.sort((a, b) => a.daysLeft - b.daysLeft)
    return HttpResponse.json(items)
  }),

  http.get('/api/v1/vehicles', async ({ request }) => {
    await wait()
    const me = authorize(request, 'VEHICLES_VIEW')
    if (me instanceof Response) return me
    return HttpResponse.json(db.vehicles.filter((v) => v.active).map(toVehicle))
  }),

  http.post('/api/v1/vehicles', async ({ request }) => {
    await wait()
    const me = authorize(request, 'VEHICLES_EDIT')
    if (me instanceof Response) return me
    const body = (await request.json()) as VehicleBody
    const fields = checkVehicleBody(body)
    if (Object.keys(fields).length > 0) {
      return errorResponse(400, 'VALIDATION', 'Check the form.', { fields })
    }
    const nextYear = addDays(MOCK_TODAY, 365)
    const created: MockVehicle = {
      id: db.nextVehicleId++,
      name: body.name.trim(),
      registrationNo: body.registrationNo.trim(),
      vehicleType: body.vehicleType,
      seats: body.seats,
      monthlyCost: body.monthlyCost,
      ownedBy: body.ownedBy ?? 'SCHOOL',
      active: true,
      papers: { FITNESS: nextYear, INSURANCE: nextYear, PERMIT: nextYear, POLLUTION: nextYear },
    }
    db.vehicles.push(created)
    return HttpResponse.json(toVehicleDetail(created), { status: 201 })
  }),

  http.get('/api/v1/vehicles/:id', async ({ request, params }) => {
    await wait()
    const me = authorize(request, 'VEHICLES_VIEW')
    if (me instanceof Response) return me
    const vehicle = activeVehicle(params.id)
    if (!vehicle) return errorResponse(404, 'NOT_FOUND', 'This vehicle does not exist.')
    return HttpResponse.json(toVehicleDetail(vehicle))
  }),

  http.put('/api/v1/vehicles/:id', async ({ request, params }) => {
    await wait()
    const me = authorize(request, 'VEHICLES_EDIT')
    if (me instanceof Response) return me
    const vehicle = activeVehicle(params.id)
    if (!vehicle) return errorResponse(404, 'NOT_FOUND', 'This vehicle does not exist.')
    const body = (await request.json()) as VehicleBody
    const fields = checkVehicleBody(body)
    if (Object.keys(fields).length > 0) {
      return errorResponse(400, 'VALIDATION', 'Check the form.', { fields })
    }
    vehicle.name = body.name.trim()
    vehicle.registrationNo = body.registrationNo.trim()
    vehicle.vehicleType = body.vehicleType
    vehicle.seats = body.seats
    vehicle.monthlyCost = body.monthlyCost
    vehicle.ownedBy = body.ownedBy ?? vehicle.ownedBy
    return HttpResponse.json(toVehicleDetail(vehicle))
  }),

  http.delete('/api/v1/vehicles/:id', async ({ request, params }) => {
    await wait()
    const me = authorize(request, 'VEHICLES_EDIT')
    if (me instanceof Response) return me
    const vehicle = activeVehicle(params.id)
    if (!vehicle) return errorResponse(404, 'NOT_FOUND', 'This vehicle does not exist.')
    const route = routeOfVehicle(vehicle.id)
    if (route) {
      return errorResponse(
        409,
        'VEHICLE_IN_USE',
        `${vehicle.name} runs ${route.name}. Give that route another vehicle first.`,
      )
    }
    vehicle.active = false
    return new HttpResponse(null, { status: 204 })
  }),

  http.put('/api/v1/vehicles/:id/documents', async ({ request, params }) => {
    await wait()
    const me = authorize(request, 'VEHICLES_EDIT')
    if (me instanceof Response) return me
    const vehicle = activeVehicle(params.id)
    if (!vehicle) return errorResponse(404, 'NOT_FOUND', 'This vehicle does not exist.')
    const body = (await request.json()) as Partial<DocumentsBody>
    const fields: Record<string, string> = {}
    for (const kind of paperOrder) {
      const value = body[kind]
      if (typeof value !== 'string' || !ISO_DATE.test(value)) fields[kind] = 'Enter a date.'
    }
    if (Object.keys(fields).length > 0) {
      return errorResponse(400, 'VALIDATION', 'Check the dates.', { fields })
    }
    for (const kind of paperOrder) vehicle.papers[kind] = body[kind] as string
    return HttpResponse.json(toVehicleDetail(vehicle))
  }),

  http.get('/api/v1/vehicles/:id/assignments', async ({ request, params }) => {
    await wait()
    const me = authorize(request, 'VEHICLES_VIEW')
    if (me instanceof Response) return me
    const vehicle = activeVehicle(params.id)
    if (!vehicle) return errorResponse(404, 'NOT_FOUND', 'This vehicle does not exist.')
    const rows = db.assignments
      .filter((a) => a.vehicleId === vehicle.id)
      .sort((a, b) => b.fromDate.localeCompare(a.fromDate) || b.id - a.id)
      .map((a) => ({
        id: a.id,
        duty: a.duty,
        staffId: a.staffId,
        staffName: staffById(a.staffId)?.name ?? 'Unknown',
        fromDate: a.fromDate,
        toDate: a.toDate,
        temporary: a.temporary,
        reason: a.reason,
      }))
    return HttpResponse.json(rows)
  }),

  http.post('/api/v1/vehicles/:id/assignments', async ({ request, params }) => {
    await wait()
    const me = authorize(request, 'VEHICLES_EDIT')
    if (me instanceof Response) return me
    const vehicle = activeVehicle(params.id)
    if (!vehicle) return errorResponse(404, 'NOT_FOUND', 'This vehicle does not exist.')
    const body = (await request.json()) as AssignmentBody

    const fields: Record<string, string> = {}
    if (!duties.includes(body.duty)) fields.duty = 'Pick the job.'
    if (!body.staffId) fields.staffId = 'Pick a person.'
    if (!ISO_DATE.test(body.fromDate ?? '')) fields.fromDate = 'Enter the date.'
    if (!reasons.includes(body.reason)) fields.reason = 'Pick a reason.'
    if (body.temporary && !ISO_DATE.test(body.toDate ?? '')) fields.toDate = 'Enter the last day.'
    if (body.temporary && body.toDate && body.toDate < body.fromDate) {
      fields.toDate = 'The last day must not be before the first day.'
    }
    if (Object.keys(fields).length > 0) {
      return errorResponse(400, 'VALIDATION', 'Check the form.', { fields })
    }

    const person = staffById(body.staffId)
    if (!person || !person.active) {
      return errorResponse(404, 'NOT_FOUND', 'This person does not exist.')
    }
    if (person.type !== body.duty) {
      return errorResponse(409, 'WRONG_STAFF_TYPE', `${person.name} cannot do this job.`)
    }
    const lastDay = body.temporary ? (body.toDate as string) : null
    if (
      body.duty === 'DRIVER' &&
      person.licenceValidTill &&
      person.licenceValidTill < (lastDay ?? body.fromDate)
    ) {
      return errorResponse(
        409,
        'LICENCE_ENDED',
        `${person.name}'s driving licence ends before these days.`,
      )
    }

    // Is the person on another vehicle on any of these days? Look at up to a year.
    const end = lastDay ?? addDays(body.fromDate, 365)
    for (let day = body.fromDate; day <= end; day = addDays(day, 1)) {
      for (const other of db.vehicles.filter((v) => v.active && v.id !== vehicle.id)) {
        for (const duty of duties) {
          if (holderOn(other.id, duty, day)?.staffId === person.id) {
            return errorResponse(
              409,
              'STAFF_BUSY',
              `${person.name} ${verbFor(duty)} ${other.name} on these days.`,
            )
          }
        }
      }
    }

    if (!body.temporary) {
      // "From now on": the person before stops the day before.
      for (const a of db.assignments) {
        if (
          a.vehicleId === vehicle.id &&
          a.duty === body.duty &&
          a.fromDate < body.fromDate &&
          (a.toDate === null || a.toDate >= body.fromDate)
        ) {
          a.toDate = addDays(body.fromDate, -1)
        }
      }
    }
    db.assignments.push({
      id: db.nextAssignmentId++,
      vehicleId: vehicle.id,
      duty: body.duty,
      staffId: person.id,
      fromDate: body.fromDate,
      toDate: lastDay,
      temporary: body.temporary,
      reason: body.reason,
    })
    return HttpResponse.json(toVehicleDetail(vehicle), { status: 201 })
  }),
]
