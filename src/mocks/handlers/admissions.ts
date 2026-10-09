import { http, HttpResponse } from 'msw'
import type { AdmissionRequest, AdmissionResult } from '@/features/admissions/types'
import { frequencies, payModes } from '@/features/fees/types'
import { classNames, occupations } from '@/features/students/types'
import { formatInr } from '@/lib/format'
import { db } from '../db'
import { currentSession, nextReceiptNo, planTotals, splitFirstPayment } from '../feesLogic'
import { enquiryById, isOpen, markAdmitted } from '../enquiriesLogic'
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

  // Part 4. A request without `schoolFee` has no fee plan (the person cannot edit fees).
  if (body.schoolFee !== undefined) {
    const money = (v: unknown): v is number =>
      typeof v === 'number' && Number.isInteger(v) && v >= 0
    if (!money(body.schoolFee)) fields.schoolFee = 'Enter the school fee.'
    if (body.busFee !== undefined && !money(body.busFee)) fields.busFee = 'Enter the bus fee, or 0.'
    if (body.discount !== undefined && !money(body.discount))
      fields.discount = 'Enter the discount, or 0.'
    else if ((body.discount ?? 0) > (body.schoolFee ?? 0) + (body.busFee ?? 0))
      fields.discount = 'The discount is more than the fees.'
    if ((body.discount ?? 0) > 0 && !body.discountReason?.trim())
      fields.discountReason = 'Say why there is a discount.'
    if (!body.frequency || !frequencies.includes(body.frequency))
      fields.frequency = 'Pick how often the family pays.'
    if (body.firstPaymentAmount !== undefined && body.firstPaymentAmount > 0) {
      if (!money(body.firstPaymentAmount)) fields.firstPaymentAmount = 'Enter a whole amount.'
      if (!body.firstPaymentMode || !payModes.includes(body.firstPaymentMode))
        fields.firstPaymentMode = 'Pick how it was paid.'
    }
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

    // An admission from an enquiry: the enquiry must be there and still open.
    const enquiry = body.enquiryId === undefined ? undefined : enquiryById(body.enquiryId)
    if (body.enquiryId !== undefined) {
      if (!enquiry) return errorResponse(404, 'NOT_FOUND', 'This enquiry was not found.')
      if (!isOpen(enquiry.status)) {
        return errorResponse(409, 'BAD_STAGE', 'This enquiry is already closed.')
      }
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

    // A first payment above the total is refused before anything is saved.
    if (body.schoolFee !== undefined) {
      const total = body.schoolFee + (body.usesBus ? (body.busFee ?? 0) : 0) - (body.discount ?? 0)
      if ((body.firstPaymentAmount ?? 0) > total) {
        const message = `The first payment is more than the ${formatInr(total)} for the year.`
        return errorResponse(409, 'PAYMENT_TOO_LARGE', message, {
          fields: { firstPaymentAmount: message },
        })
      }
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

    if (enquiry) markAdmitted(enquiry, id)

    let receiptNo: string | undefined
    if (body.schoolFee !== undefined) {
      const plan = {
        studentId: id,
        sessionId: currentSession().id,
        schoolFee: body.schoolFee,
        busFee: body.usesBus ? (body.busFee ?? 0) : 0,
        discount: body.discount ?? 0,
        discountReason: (body.discount ?? 0) > 0 ? (body.discountReason?.trim() ?? null) : null,
        frequency: body.frequency ?? 'QUARTERLY',
        startsOn:
          admissionDate > currentSession().startsOn ? admissionDate : currentSession().startsOn,
        busExtras: [],
      }
      db.feePlans.push(plan)
      const first = body.firstPaymentAmount ?? 0
      if (first > 0 && planTotals(plan).SCHOOL + planTotals(plan).BUS >= first) {
        const split = splitFirstPayment(plan, first)
        receiptNo = nextReceiptNo()
        db.payments.push({
          id: db.nextPaymentId - 1,
          studentId: id,
          receiptNo,
          paidOn: admissionDate,
          mode: body.firstPaymentMode ?? 'CASH',
          schoolAmount: split.SCHOOL,
          busAmount: split.BUS,
          note: null,
          correctionOf: null,
        })
      }
    }

    const result: AdmissionResult = {
      studentId: id,
      admissionNo,
      ...(receiptNo ? { receiptNo } : {}),
    }
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
