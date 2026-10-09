import { http, HttpResponse } from 'msw'
import {
  frequencies,
  payModes,
  type ClassFee,
  type CorrectionBody,
  type FeePlanBody,
  type PaymentBody,
} from '@/features/fees/types'
import { classNames } from '@/features/students/types'
import { formatInr, todayIso } from '@/lib/format'
import type { MockPayment } from '../data/fees'
import { db } from '../db'
import {
  currentSession,
  feeToday,
  nextReceiptNo,
  paidByHead,
  planOf,
  planTotals,
  studentFees,
  toFeePayment,
} from '../feesLogic'
import { authorize, errorResponse, wait } from '../http'
import { addHistory, studentById } from '../studentLogic'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const MAX_AMOUNT = 10_000_000

function notFound() {
  return errorResponse(404, 'NOT_FOUND', 'This student does not exist.')
}

function validation(fields: Record<string, string>) {
  return errorResponse(400, 'VALIDATION', 'Check the form.', { fields })
}

const isMoney = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= MAX_AMOUNT

export const feeHandlers = [
  http.get('/api/v1/sessions', async ({ request }) => {
    await wait()
    const me = authorize(request)
    if (me instanceof Response) return me
    return HttpResponse.json(db.sessions)
  }),

  http.get('/api/v1/sessions/:id/class-fees', async ({ request, params }) => {
    await wait()
    const me = authorize(request, 'FEES_VIEW')
    if (me instanceof Response) return me
    const fees = db.classFees.get(Number(params.id))
    if (!fees) return errorResponse(404, 'NOT_FOUND', 'This session does not exist.')
    return HttpResponse.json(fees)
  }),

  http.put('/api/v1/sessions/:id/class-fees', async ({ request, params }) => {
    await wait()
    const me = authorize(request, 'SETTINGS_EDIT')
    if (me instanceof Response) return me
    const id = Number(params.id)
    if (!db.classFees.has(id))
      return errorResponse(404, 'NOT_FOUND', 'This session does not exist.')
    const body = (await request.json()) as ClassFee[]
    const fields: Record<string, string> = {}
    for (const className of classNames) {
      const row = body.find((f) => f.className === className)
      if (!row) fields[className] = 'This class is missing.'
      else if (row.amount !== null && !isMoney(row.amount))
        fields[className] = 'Enter a whole amount.'
    }
    if (Object.keys(fields).length > 0) return validation(fields)
    const saved = classNames.map<ClassFee>((className) => ({
      className,
      amount: body.find((f) => f.className === className)?.amount ?? null,
    }))
    db.classFees.set(id, saved)
    return HttpResponse.json(saved)
  }),

  http.get('/api/v1/students/:id/fees', async ({ request, params }) => {
    await wait()
    const me = authorize(request, 'FEES_VIEW')
    if (me instanceof Response) return me
    const student = studentById(params.id)
    if (!student) return notFound()
    return HttpResponse.json(studentFees(student))
  }),

  http.put('/api/v1/students/:id/fee-plan', async ({ request, params }) => {
    await wait()
    const me = authorize(request, 'FEES_EDIT')
    if (me instanceof Response) return me
    const student = studentById(params.id)
    if (!student) return notFound()
    const body = (await request.json()) as FeePlanBody
    const fields: Record<string, string> = {}
    if (!isMoney(body.schoolFee)) fields.schoolFee = 'Enter the school fee.'
    if (!isMoney(body.busFee)) fields.busFee = 'Enter the bus fee, or 0.'
    if (!isMoney(body.discount)) fields.discount = 'Enter the discount, or 0.'
    else if (body.discount > (body.schoolFee ?? 0) + (body.busFee ?? 0))
      fields.discount = 'The discount is more than the fees.'
    if (isMoney(body.discount) && body.discount > 0 && !body.discountReason?.trim())
      fields.discountReason = 'Say why there is a discount.'
    if (!frequencies.includes(body.frequency)) fields.frequency = 'Pick how often the family pays.'
    if (Object.keys(fields).length > 0) return validation(fields)

    const session = currentSession()
    const existing = planOf(student.id)
    const next = {
      studentId: student.id,
      sessionId: session.id,
      schoolFee: body.schoolFee,
      busFee: body.busFee,
      discount: body.discount,
      discountReason: body.discount > 0 ? (body.discountReason ?? null) : null,
      frequency: body.frequency,
      startsOn:
        existing?.startsOn ??
        (student.admissionDate > session.startsOn ? student.admissionDate : session.startsOn),
      busExtras: existing?.busExtras ?? [],
    }
    if (existing) Object.assign(existing, next)
    else db.feePlans.push(next)
    addHistory(student.id, 'Fee plan saved', me.name ?? me.phone)
    return HttpResponse.json(studentFees(student))
  }),

  http.post('/api/v1/students/:id/payments', async ({ request, params }) => {
    await wait()
    const me = authorize(request, 'FEES_EDIT')
    if (me instanceof Response) return me
    const student = studentById(params.id)
    if (!student) return notFound()
    const body = (await request.json()) as PaymentBody
    const plan = planOf(student.id)
    if (!plan) return errorResponse(409, 'NO_FEE_PLAN', 'This child has no fee plan yet.')

    const fields: Record<string, string> = {}
    if (!isMoney(body.schoolAmount)) fields.schoolAmount = 'Enter a whole amount, or 0.'
    if (!isMoney(body.busAmount)) fields.busAmount = 'Enter a whole amount, or 0.'
    if (!ISO_DATE.test(body.paidOn ?? '')) fields.paidOn = 'Enter the date.'
    else if (body.paidOn > (feeToday > todayIso() ? feeToday : todayIso()))
      fields.paidOn = 'The date is in the future.'
    if (!payModes.includes(body.mode)) fields.mode = 'Pick how it was paid.'
    if (Object.keys(fields).length > 0) return validation(fields)
    if (body.schoolAmount + body.busAmount === 0) {
      return validation({ schoolAmount: 'Enter the amount received.' })
    }

    // Never more than what is left to pay in the year, head by head.
    const totals = planTotals(plan)
    const paid = paidByHead(student.id)
    const tooLarge: Record<string, string> = {}
    if (body.schoolAmount > totals.SCHOOL - paid.SCHOOL) {
      tooLarge.schoolAmount = `Only ${formatInr(totals.SCHOOL - paid.SCHOOL)} is left to pay on the school fee.`
    }
    if (body.busAmount > totals.BUS - paid.BUS) {
      tooLarge.busAmount = `Only ${formatInr(totals.BUS - paid.BUS)} is left to pay on the bus fee.`
    }
    const first = Object.values(tooLarge)[0]
    if (first) return errorResponse(409, 'PAYMENT_TOO_LARGE', first, { fields: tooLarge })

    const payment: MockPayment = {
      id: db.nextPaymentId,
      studentId: student.id,
      receiptNo: nextReceiptNo(),
      paidOn: body.paidOn,
      mode: body.mode,
      schoolAmount: body.schoolAmount,
      busAmount: body.busAmount,
      note: body.note?.trim() || null,
      correctionOf: null,
    }
    db.payments.push(payment)
    return HttpResponse.json(toFeePayment(payment), { status: 201 })
  }),

  http.post('/api/v1/students/:id/payment-corrections', async ({ request, params }) => {
    await wait()
    const me = authorize(request, 'FEES_CORRECT')
    if (me instanceof Response) return me
    const student = studentById(params.id)
    if (!student) return notFound()
    const body = (await request.json()) as CorrectionBody
    if (!body.note?.trim()) return validation({ note: 'Write why the payment was wrong.' })
    const original = db.payments.find((p) => p.id === body.paymentId && p.studentId === student.id)
    if (!original || original.correctionOf !== null) {
      return errorResponse(404, 'NOT_FOUND', 'This payment was not found.')
    }
    if (db.payments.some((p) => p.correctionOf === original.id)) {
      return errorResponse(409, 'ALREADY_CORRECTED', 'This payment was already corrected.')
    }
    const row: MockPayment = {
      id: db.nextPaymentId,
      studentId: student.id,
      receiptNo: nextReceiptNo(),
      paidOn: feeToday,
      mode: original.mode,
      schoolAmount: -original.schoolAmount,
      busAmount: -original.busAmount,
      note: body.note.trim(),
      correctionOf: original.id,
    }
    db.payments.push(row)
    addHistory(student.id, `Payment ${original.receiptNo} corrected`, me.name ?? me.phone)
    return HttpResponse.json(toFeePayment(row), { status: 201 })
  }),
]
