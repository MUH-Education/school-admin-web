import { api, setToken } from '@/api/client'
import { ApiError } from '@/api/errors'
import type { ClassFee, FeePayment, Session, StudentFees } from '@/features/fees/types'
import type { AdmissionResult } from '@/features/admissions/types'
import type { StudentPage } from '@/features/students/types'

const OWNER = 1
const TRANSPORT = 3
const ADMISSIONS = 4
const ISHAAN = 1
const MOHIT = 4
const ROHIT = 6

function loginAs(userId: number): void {
  setToken(`mock-token-${userId}`)
}

async function failure(call: Promise<unknown>): Promise<ApiError> {
  try {
    await call
  } catch (error) {
    if (error instanceof ApiError) return error
  }
  throw new Error('The call should have failed')
}

const fees = (id: number) => api<StudentFees>('GET', `/students/${id}/fees`)

describe('mock fees: 7 October 2026', () => {
  it('lists the sessions for any login, with 2026–27 as the current one', async () => {
    loginAs(TRANSPORT)
    const sessions = await api<Session[]>('GET', '/sessions')
    expect(sessions.map((s) => s.label)).toEqual(['2026–27', '2027–28'])
    expect(sessions.find((s) => s.current)?.label).toBe('2026–27')
  })

  it('has a school fee for all 15 classes in the current session', async () => {
    loginAs(OWNER)
    const list = await api<ClassFee[]>('GET', '/sessions/1/class-fees')
    expect(list).toHaveLength(15)
    expect(list.find((f) => f.className === 'Class 4')?.amount).toBe(30000)
    const next = await api<ClassFee[]>('GET', '/sessions/2/class-fees')
    expect(next.every((f) => f.amount === null)).toBe(true)
  })

  it('saves the class fees only for SETTINGS_EDIT', async () => {
    loginAs(ADMISSIONS)
    const list = await api<ClassFee[]>('GET', '/sessions/1/class-fees')
    expect((await failure(api('PUT', '/sessions/1/class-fees', list))).status).toBe(403)
    loginAs(OWNER)
    const changed = list.map((f) => (f.className === 'Class 5' ? { ...f, amount: 30000 } : f))
    await api('PUT', '/sessions/1/class-fees', changed)
    const again = await api<ClassFee[]>('GET', '/sessions/1/class-fees')
    expect(again.find((f) => f.className === 'Class 5')?.amount).toBe(30000)
    const bad = await failure(
      api('PUT', '/sessions/1/class-fees', [{ className: 'Class 5', amount: -5 }]),
    )
    expect(bad.fields['Class 5']).toBeDefined()
  })

  it("shows Ishaan's fees as in the StudentProfile design", async () => {
    loginAs(OWNER)
    const f = await fees(ISHAAN)
    expect(f).toMatchObject({
      total: 30000,
      paidSoFar: 22500,
      stillToPay: 7500,
      pendingNow: 0,
      status: 'ON_TIME',
      nextPayment: { amount: 7500, dueDate: '2027-01-01' },
    })
    expect(f.heads.map((h) => h.head)).toEqual(['SCHOOL'])
    expect(f.payments).toHaveLength(3)
  })

  it('marks Mohit Delayed (6 days late) and Rohit Defaulted (98 days late)', async () => {
    loginAs(OWNER)
    const mohit = await fees(MOHIT)
    expect(mohit.status).toBe('DELAYED')
    expect(mohit.pendingNow).toBeGreaterThan(0)
    const rohit = await fees(ROHIT)
    expect(rohit.status).toBe('DEFAULTED')
    expect(rohit.pendingNow).toBeGreaterThan(mohit.pendingNow - 1)
  })

  it('answers the fee status in the student list, and null for a child without a plan', async () => {
    loginAs(OWNER)
    const statusOf = async (q: string) =>
      (await api<StudentPage>('GET', `/students?q=${encodeURIComponent(q)}`)).items[0]?.feeStatus
    expect(await statusOf('Ishaan')).toBe('ON_TIME')
    expect(await statusOf('Mohit')).toBe('DELAYED')
    expect(await statusOf('Rohit Kumar')).toBe('DEFAULTED')
    // Student 13 has no fee plan in the sample.
    const rows = [
      ...(await api<StudentPage>('GET', '/students')).items,
      ...(await api<StudentPage>('GET', '/students?page=2')).items,
      ...(await api<StudentPage>('GET', '/students?page=3')).items,
    ]
    expect(rows.some((s) => s.feeStatus === null)).toBe(true)
  })

  it('does not answer fees without FEES_VIEW', async () => {
    loginAs(TRANSPORT)
    expect((await failure(fees(ISHAAN))).status).toBe(403)
    const page = await api<StudentPage>('GET', '/students')
    expect(page.items.every((s) => s.feeStatus === null)).toBe(true)
  })

  it('records a payment, gives a receipt number and lowers what is left', async () => {
    loginAs(OWNER)
    const payment = await api<FeePayment>('POST', `/students/${ISHAAN}/payments`, {
      schoolAmount: 7500,
      busAmount: 0,
      paidOn: '2026-10-07',
      mode: 'UPI',
    })
    expect(payment.receiptNo).toMatch(/^R-2026-\d{4}$/)
    const f = await fees(ISHAAN)
    expect(f.paidSoFar).toBe(30000)
    expect(f.stillToPay).toBe(0)
    expect(f.nextPayment).toBeNull()
    expect(f.payments[0]?.receiptNo).toBe(payment.receiptNo)
  })

  it('refuses a payment above what is left, with PAYMENT_TOO_LARGE and a message', async () => {
    loginAs(OWNER)
    const error = await failure(
      api('POST', `/students/${ISHAAN}/payments`, {
        schoolAmount: 7501,
        busAmount: 0,
        paidOn: '2026-10-07',
        mode: 'CASH',
      }),
    )
    expect(error.code).toBe('PAYMENT_TOO_LARGE')
    expect(error.message).toBe('Only ₹7,500 is left to pay on the school fee.')
    expect(error.fields.schoolAmount).toBe(error.message)
  })

  it('lets only the owner correct a payment, with a note, once', async () => {
    loginAs(ADMISSIONS)
    const before = await fees(ISHAAN)
    const target = before.payments[0]
    if (!target) throw new Error('no payment')
    const body = { paymentId: target.id, note: 'Wrong child' }
    expect(
      (await failure(api('POST', `/students/${ISHAAN}/payment-corrections`, body))).status,
    ).toBe(403)

    loginAs(OWNER)
    const noNote = await failure(
      api('POST', `/students/${ISHAAN}/payment-corrections`, { paymentId: target.id, note: ' ' }),
    )
    expect(noNote.fields.note).toBeDefined()
    const row = await api<FeePayment>('POST', `/students/${ISHAAN}/payment-corrections`, body)
    expect(row.amount).toBe(-target.amount)
    expect(row.correctionOf).toBe(target.id)
    const after = await fees(ISHAAN)
    expect(after.paidSoFar).toBe(before.paidSoFar - target.amount)
    expect(after.payments.find((p) => p.id === target.id)?.corrected).toBe(true)
    expect((await failure(api('POST', `/students/${ISHAAN}/payment-corrections`, body))).code).toBe(
      'ALREADY_CORRECTED',
    )
  })

  it('makes a fee plan and the first payment with an admission', async () => {
    loginAs(OWNER)
    const result = await api<AdmissionResult>('POST', '/admissions', {
      name: 'Test Child',
      dateOfBirth: '2020-01-01',
      gender: 'GIRL',
      className: 'Class 5',
      admissionDate: '2026-10-07',
      village: 'Jakhal',
      fatherOccupation: 'FARMER_SMALL',
      fatherName: 'Test Father',
      fatherPhone: '9812300111',
      usesBus: false,
      schoolFee: 30000,
      busFee: 0,
      discount: 0,
      frequency: 'QUARTERLY',
      firstPaymentAmount: 7500,
      firstPaymentMode: 'UPI',
    })
    expect(result.receiptNo).toMatch(/^R-2026-\d{4}$/)
    const f = await fees(result.studentId)
    expect(f).toMatchObject({ total: 30000, paidSoFar: 7500, stillToPay: 22500, pendingNow: 0 })
    expect(f.nextPayment).toEqual({ amount: 7500, dueDate: '2027-01-01' })
  })

  it('needs a reason for a discount and refuses a first payment above the total', async () => {
    loginAs(OWNER)
    const base = {
      name: 'Test Child',
      dateOfBirth: '2020-01-01',
      gender: 'GIRL',
      className: 'Class 5',
      village: 'Jakhal',
      fatherOccupation: 'FARMER_SMALL',
      fatherName: 'Test Father',
      fatherPhone: '9812300111',
      usesBus: false,
      schoolFee: 30000,
      busFee: 0,
      frequency: 'YEARLY',
    }
    const noReason = await failure(api('POST', '/admissions', { ...base, discount: 1000 }))
    expect(noReason.fields.discountReason).toBeDefined()
    const tooMuch = await failure(
      api('POST', '/admissions', {
        ...base,
        discount: 0,
        firstPaymentAmount: 30001,
        firstPaymentMode: 'CASH',
      }),
    )
    expect(tooMuch.code).toBe('PAYMENT_TOO_LARGE')
    expect(tooMuch.fields.firstPaymentAmount).toBe(tooMuch.message)
  })

  it('adds the bus fee as one more payment when a child starts the bus', async () => {
    loginAs(OWNER)
    const routes = await api<{ id: number; stops: { id: number }[] }[]>('GET', '/routes')
    const route = routes[0]
    const stop = route?.stops[0]
    if (!route || !stop) throw new Error('no route')
    const before = await fees(ISHAAN)
    await api('PUT', `/students/${ISHAAN}/transport`, {
      usesBus: true,
      routeId: route.id,
      stopId: stop.id,
      fromDate: '2026-11-02',
      busFee: 4000,
    })
    const after = await fees(ISHAAN)
    expect(after.total).toBe(before.total + 4000)
    expect(after.stillToPay).toBe(before.stillToPay + 4000)
    expect(after.heads.map((h) => h.head)).toEqual(['SCHOOL', 'BUS'])
    // Changing the stop later adds nothing.
    await api('PUT', `/students/${ISHAAN}/transport`, {
      usesBus: true,
      routeId: route.id,
      stopId: stop.id,
      fromDate: '2026-12-01',
      busFee: 4000,
    })
    expect((await fees(ISHAAN)).total).toBe(after.total)
  })
})
