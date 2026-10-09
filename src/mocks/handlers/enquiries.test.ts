import { api, setToken } from '@/api/client'
import { ApiError } from '@/api/errors'
import type {
  Enquiry,
  EnquiryPage,
  EnquiryPrefill,
  EnquiryRequest,
  EnquirySummary,
} from '@/features/enquiries/types'

function loginAs(userId: number): void {
  setToken(`mock-token-${userId}`)
}
const OWNER = 1
const TRANSPORT = 3
const ADMISSIONS = 4

const newEnquiry: EnquiryRequest = {
  parentName: 'Ramesh Malik',
  phone: '98123 55501',
  relation: 'FATHER',
  village: 'Jakhal',
  className: 'Class 2',
  source: 'WALK_IN',
  nextStepDate: '2026-10-09',
}

async function failure(call: Promise<unknown>): Promise<ApiError> {
  try {
    await call
  } catch (error) {
    if (error instanceof ApiError) return error
  }
  throw new Error('The call should have failed')
}

describe('mock enquiries: 7 October 2026', () => {
  it('counts the 29 enquiries by stage, with 4 overdue and 14% admitted', async () => {
    loginAs(OWNER)
    const s = await api<EnquirySummary>('GET', '/enquiries/summary')
    expect(s.total).toBe(29)
    expect(s.byStatus).toEqual({
      NEW: 6,
      CONTACTED: 9,
      VISITED: 5,
      APPLIED: 3,
      ADMITTED: 4,
      LOST: 2,
    })
    expect(s.overdue).toBe(4)
    expect(s.admittedPercent).toBe(14)
  })

  it('lists newest first, 10 to a page, with the phone hidden', async () => {
    loginAs(OWNER)
    const page = await api<EnquiryPage>('GET', '/enquiries')
    expect(page.total).toBe(29)
    expect(page.pageSize).toBe(10)
    expect(page.items.map((r) => r.parentName).slice(0, 3)).toEqual([
      'Rajesh Kumar',
      'Sunita Devi',
      'Manoj Sharma',
    ])
    expect(page.items[0]?.phone).toBe('98XXX XX412')
    expect(page.villages).toContain('Jakhal')
    const page3 = await api<EnquiryPage>('GET', '/enquiries?page=3')
    expect(page3.items).toHaveLength(9)
  })

  it('filters by stage, overdue, village, source and search', async () => {
    loginAs(OWNER)
    const visited = await api<EnquiryPage>('GET', '/enquiries?status=VISITED')
    expect(visited.total).toBe(5)
    const overdue = await api<EnquiryPage>('GET', '/enquiries?overdue=true')
    expect(overdue.total).toBe(4)
    expect(overdue.items.every((r) => r.overdue && r.nextStepDate! < '2026-10-07')).toBe(true)
    const jakhal = await api<EnquiryPage>('GET', '/enquiries?village=Jakhal')
    expect(jakhal.items.every((r) => r.village === 'Jakhal')).toBe(true)
    const referral = await api<EnquiryPage>('GET', '/enquiries?source=REFERRAL')
    expect(referral.items.every((r) => r.source === 'REFERRAL')).toBe(true)
    expect((await api<EnquiryPage>('GET', '/enquiries?q=rajesh')).total).toBe(1)
    expect((await api<EnquiryPage>('GET', '/enquiries?q=98123')).total).toBeGreaterThan(1)
  })

  it('a lost enquiry carries its reason, and a bad filter is a 400', async () => {
    loginAs(OWNER)
    const lost = await api<EnquiryPage>('GET', '/enquiries?status=LOST')
    expect(lost.items.map((r) => r.lostReason)).toContain('fee too high')
    const error = await failure(api('GET', '/enquiries?status=SLEEPING'))
    expect(error.status).toBe(400)
  })

  it('the transport in-charge gets 403', async () => {
    loginAs(TRANSPORT)
    expect((await failure(api('GET', '/enquiries'))).status).toBe(403)
    expect((await failure(api('GET', '/enquiries/summary'))).status).toBe(403)
  })

  it('adds an enquiry as New and finds it in the list and the summary', async () => {
    loginAs(ADMISSIONS)
    const created = await api<Enquiry>('POST', '/enquiries', newEnquiry)
    expect(created.status).toBe('NEW')
    expect(created.phone).toBe('9812355501')
    expect(created.nextStages).toContain('CONTACTED')
    const s = await api<EnquirySummary>('GET', '/enquiries/summary')
    expect(s.total).toBe(30)
    expect(s.byStatus.NEW).toBe(7)
    const page = await api<EnquiryPage>('GET', '/enquiries?q=Ramesh')
    expect(page.items[0]?.id).toBe(created.id)
  })

  it('needs the six boxes, and "Referred by" only for Referral', async () => {
    loginAs(ADMISSIONS)
    const empty = await failure(api('POST', '/enquiries', {}))
    expect(Object.keys(empty.fields).sort()).toEqual(
      ['className', 'nextStepDate', 'parentName', 'phone', 'relation', 'source', 'village'].sort(),
    )
    const referral = await failure(api('POST', '/enquiries', { ...newEnquiry, source: 'REFERRAL' }))
    expect(Object.keys(referral.fields)).toEqual(['referredBy'])
    const ok = await api<Enquiry>('POST', '/enquiries', {
      ...newEnquiry,
      source: 'REFERRAL',
      referredBy: 'Poonam Devi',
    })
    expect(ok.referredBy).toBe('Poonam Devi')
    const walkIn = await api<Enquiry>('POST', '/enquiries', {
      ...newEnquiry,
      phone: '9812355502',
      referredBy: 'Leftover text',
    })
    expect(walkIn.referredBy).toBeNull()
  })

  it('ENQUIRY_EXISTS names the old enquiry, for a phone that is still open', async () => {
    loginAs(ADMISSIONS)
    const error = await failure(
      api('POST', '/enquiries', { ...newEnquiry, phone: '+91 98123 00412' }),
    )
    expect(error.status).toBe(409)
    expect(error.code).toBe('ENQUIRY_EXISTS')
    expect(error.enquiryId).toBe(29)
    // The phone of an Admitted enquiry (id 22) is free again.
    const again = await api<Enquiry>('POST', '/enquiries', { ...newEnquiry, phone: '9412600156' })
    expect(again.status).toBe('NEW')
  })

  it('changes an enquiry with PUT and keeps the stage', async () => {
    loginAs(ADMISSIONS)
    const before = await api<Enquiry>('GET', '/enquiries/23')
    expect(before.followUps.map((f) => f.id)).toEqual([5, 4])
    const saved = await api<Enquiry>('PUT', '/enquiries/23', {
      parentName: 'Anita Goyal',
      phone: before.phone,
      relation: 'MOTHER',
      village: 'Tohana town',
      className: 'UKG',
      source: 'WALK_IN',
      nextStepDate: '2026-10-11',
      childName: 'Kavya Goyal',
    } satisfies EnquiryRequest)
    expect(saved.childName).toBe('Kavya Goyal')
    expect(saved.nextStepDate).toBe('2026-10-11')
    expect(saved.status).toBe('APPLIED')
  })

  it('a follow-up goes on top and moves the next date', async () => {
    loginAs(ADMISSIONS)
    const result = await api<Enquiry>('POST', '/enquiries/26/follow-ups', {
      note: 'Spoke to the mother. She will visit on Saturday.',
      nextDate: '2026-10-10',
    })
    expect(result.followUps[0]?.note).toContain('Saturday')
    expect(result.followUps[0]?.by).toBe('Priya')
    expect(result.nextStepDate).toBe('2026-10-10')
    expect(result.overdue).toBe(false)
    const summary = await api<EnquirySummary>('GET', '/enquiries/summary')
    expect(summary.overdue).toBe(3)
    const error = await failure(api('POST', '/enquiries/26/follow-ups', { note: '  ' }))
    expect(error.fields.note).toBeTruthy()
  })

  it('moves along the stage rules, and Lost needs a reason', async () => {
    loginAs(ADMISSIONS)
    const moved = await api<Enquiry>('POST', '/enquiries/28/status', { status: 'CONTACTED' })
    expect(moved.status).toBe('CONTACTED')
    expect(moved.nextStages).toEqual(['VISITED', 'APPLIED', 'LOST'])

    const noReason = await failure(api('POST', '/enquiries/28/status', { status: 'LOST' }))
    expect(noReason.fields.reason).toBeTruthy()
    const lost = await api<Enquiry>('POST', '/enquiries/28/status', {
      status: 'LOST',
      reason: 'Fee too high',
    })
    expect(lost.status).toBe('LOST')
    expect(lost.lostReason).toBe('Fee too high')
    expect(lost.nextStages).toEqual(['NEW'])

    const reopened = await api<Enquiry>('POST', '/enquiries/28/status', { status: 'NEW' })
    expect(reopened.lostReason).toBeNull()
    expect(reopened.nextStepDate).toBe('2026-10-07')
  })

  it('refuses a stage that is not allowed, and refuses Admitted by hand', async () => {
    loginAs(ADMISSIONS)
    const back = await failure(api('POST', '/enquiries/23/status', { status: 'NEW' }))
    expect(back.status).toBe(409)
    expect(back.code).toBe('BAD_STAGE')
    const admitted = await failure(api('POST', '/enquiries/23/status', { status: 'ADMITTED' }))
    expect(admitted.code).toBe('BAD_STAGE')
  })

  it('gives the prefill to the admissions desk only for an open enquiry', async () => {
    loginAs(ADMISSIONS)
    const prefill = await api<EnquiryPrefill>('GET', '/enquiries/23/prefill')
    expect(prefill).toMatchObject({
      enquiryId: 23,
      parentName: 'Anita Goyal',
      village: 'Tohana town',
      className: 'UKG',
      childName: 'Kavya',
    })
    expect((await failure(api('GET', '/enquiries/22/prefill'))).code).toBe('BAD_STAGE')
    expect((await failure(api('GET', '/enquiries/999/prefill'))).status).toBe(404)
  })
})
