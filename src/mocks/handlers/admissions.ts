import { http, HttpResponse } from 'msw'
import type { AdmissionRequest, AdmissionResult } from '@/features/admissions/types'
import { classNames, occupations } from '@/features/students/types'
import { db } from '../db'
import { authorize, errorResponse, wait } from '../http'
import {
  addHistory,
  childrenOnRoute,
  guardiansOf,
  nextAdmissionNo,
  startEnrolment,
  studentById,
  tenDigits,
  today,
} from '../studentLogic'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function checkAdmission(body: Partial<AdmissionRequest>): Record<string, string> {
  const fields: Record<string, string> = {}
  if (!body.name?.trim()) fields.name = 'Enter the student name.'
  if (!ISO_DATE.test(body.dateOfBirth ?? '')) fields.dateOfBirth = 'Enter the date of birth.'
  if (body.gender !== 'BOY' && body.gender !== 'GIRL') fields.gender = 'Pick boy or girl.'
  if (!classNames.includes(body.className as (typeof classNames)[number]))
    fields.className = 'Pick a class.'
  if (!body.village?.trim()) fields.village = 'Enter the village or locality.'
  if (!body.fatherOccupation || !occupations.includes(body.fatherOccupation))
    fields.fatherOccupation = "Pick the father's occupation."
  if (body.admissionDate && !ISO_DATE.test(body.admissionDate))
    fields.admissionDate = 'Enter the date.'

  if (body.siblingStudentId === undefined) {
    if (!body.fatherName?.trim()) fields.fatherName = "Enter the father's name."
    if (!tenDigits(body.fatherPhone ?? '')) fields.fatherPhone = 'Enter a 10-digit mobile number.'
    if (body.motherPhone && !tenDigits(body.motherPhone))
      fields.motherPhone = 'Enter a 10-digit mobile number.'
    if (body.motherPhone && !body.motherName?.trim()) fields.motherName = "Enter the mother's name."
  } else if (!studentById(body.siblingStudentId)) {
    fields.siblingStudentId = 'This student was not found.'
  }

  if (typeof body.usesBus !== 'boolean') fields.usesBus = 'Say yes or no.'
  if (body.usesBus) {
    if (!body.routeId) fields.routeId = 'Pick a route.'
    if (!body.stopId) fields.stopId = 'Pick a stop.'
  }
  return fields
}

export const admissionHandlers = [
  http.post('/api/v1/admissions', async ({ request }) => {
    await wait()
    const me = authorize(request, 'ADMISSIONS_CREATE')
    if (me instanceof Response) return me
    const body = (await request.json()) as AdmissionRequest
    const fields = checkAdmission(body)
    if (Object.keys(fields).length > 0) {
      return errorResponse(400, 'VALIDATION', 'Check the form.', { fields })
    }

    const route = body.usesBus
      ? db.routes.find((r) => r.id === body.routeId && r.active)
      : undefined
    const stop = route?.stops.find((s) => s.id === body.stopId)
    if (body.usesBus && (!route || !stop)) {
      return route
        ? errorResponse(409, 'STOP_NOT_ON_ROUTE', `That stop is not on ${route.name}.`)
        : errorResponse(400, 'VALIDATION', 'Check the form.', {
            fields: { routeId: 'Pick a route.' },
          })
    }

    const id = db.nextStudentId++
    const admissionNo = nextAdmissionNo()
    const admissionDate = body.admissionDate || today()
    db.students.push({
      id,
      admissionNo,
      name: body.name.trim(),
      dateOfBirth: body.dateOfBirth,
      gender: body.gender,
      className: body.className,
      section: body.section || null,
      admissionDate,
      village: body.village.trim(),
      address: body.address?.trim() || null,
      fatherOccupation: body.fatherOccupation,
      hasPhoto: false,
      active: true,
      leftOn: null,
    })

    if (body.siblingStudentId !== undefined) {
      // "Parents will be copied": the same numbers are linked to the new child.
      for (const g of guardiansOf(body.siblingStudentId)) {
        db.guardians.push({ ...g, id: db.nextGuardianId++, studentId: id })
      }
    } else {
      db.guardians.push({
        id: db.nextGuardianId++,
        studentId: id,
        name: (body.fatherName ?? '').trim(),
        relation: 'FATHER',
        phone: tenDigits(body.fatherPhone ?? '') ?? '',
        receivesSms: body.smsToFather ?? true,
      })
      const motherPhone = tenDigits(body.motherPhone ?? '')
      if (motherPhone) {
        db.guardians.push({
          id: db.nextGuardianId++,
          studentId: id,
          name: (body.motherName ?? '').trim(),
          relation: 'MOTHER',
          phone: motherPhone,
          receivesSms: body.smsToMother ?? true,
        })
      }
    }

    startEnrolment(id, {
      usesBus: Boolean(body.usesBus),
      routeId: route?.id ?? null,
      stopId: stop?.id ?? null,
      fromDate: admissionDate,
      busFee: body.usesBus ? db.settings.busFeePerChild : null,
    })
    addHistory(
      id,
      `Admitted to ${body.className}, ${route ? route.name : 'no bus'}`,
      me.name ?? me.phone,
    )

    const result: AdmissionResult = { studentId: id, admissionNo }
    if (route) {
      const children = childrenOnRoute(route.id)
      const seats = db.vehicles.find((v) => v.id === route.vehicleId)?.seats ?? 0
      if (children > seats) {
        result.warning = {
          code: 'ROUTE_FULL',
          message: `${route.name} has ${children} children on ${seats} seats.`,
        }
      }
    }
    return HttpResponse.json(result, { status: 201 })
  }),
]
