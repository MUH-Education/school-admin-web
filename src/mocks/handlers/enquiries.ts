import { http, HttpResponse } from 'msw'
import type {
  Enquiry,
  EnquiryPage,
  EnquiryRequest,
  EnquiryStatus,
  FollowUpRequest,
  StatusRequest,
} from '@/features/enquiries/types'
import { enquirySources, enquiryStatuses, statusLabels } from '@/features/enquiries/types'
import { db } from '../db'
import {
  applyEnquiryBody,
  allVillages,
  checkEnquiry,
  enquiryById,
  filterEnquiries,
  isOpen,
  nextStagesOf,
  openEnquiryWithPhone,
  summary,
  toEnquiry,
  toPrefill,
  toRow,
} from '../enquiriesLogic'
import { authorize, errorResponse, wait } from '../http'
import { MOCK_NOW, MOCK_TODAY } from '../now'
import { tenDigits } from '../studentLogic'

const PAGE_SIZE = 10
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function notFound() {
  return errorResponse(404, 'NOT_FOUND', 'This enquiry was not found.')
}

/** The 409 of a second open enquiry with the same phone. It names the old one for the link. */
function existsResponse(old: { id: number; parentName: string }) {
  return errorResponse(409, 'ENQUIRY_EXISTS', 'This parent already has an open enquiry.', {
    enquiryId: old.id,
  })
}

export const enquiryHandlers = [
  // Before /enquiries/:id, so "summary" is never read as an id.
  http.get('/api/v1/enquiries/summary', async ({ request }) => {
    await wait()
    const me = authorize(request, 'ENQUIRIES_VIEW')
    if (me instanceof Response) return me
    return HttpResponse.json(summary())
  }),

  http.get('/api/v1/enquiries', async ({ request }) => {
    await wait()
    const me = authorize(request, 'ENQUIRIES_VIEW')
    if (me instanceof Response) return me
    const url = new URL(request.url)
    const status = url.searchParams.get('status') ?? ''
    const source = url.searchParams.get('source') ?? ''
    if (status && !enquiryStatuses.includes(status as EnquiryStatus)) {
      return errorResponse(400, 'VALIDATION', 'Check the filters.', {
        fields: { status: 'Pick New, Contacted, Visited, Applied, Admitted or Lost.' },
      })
    }
    if (source && !enquirySources.some((s) => s === source)) {
      return errorResponse(400, 'VALIDATION', 'Check the filters.', {
        fields: { source: 'Pick one of the sources.' },
      })
    }
    const rows = filterEnquiries({
      status: status as EnquiryStatus | '',
      overdue: url.searchParams.get('overdue') === 'true',
      q: url.searchParams.get('q') ?? '',
      village: url.searchParams.get('village') ?? '',
      source: source as EnquiryPage['items'][number]['source'] | '',
    })
    const requested = Number(url.searchParams.get('page'))
    const page = Number.isInteger(requested) && requested > 0 ? requested : 1
    const body: EnquiryPage = {
      items: rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(toRow),
      page,
      pageSize: PAGE_SIZE,
      total: rows.length,
      villages: allVillages(),
    }
    return HttpResponse.json(body)
  }),

  http.post('/api/v1/enquiries', async ({ request }) => {
    await wait()
    const me = authorize(request, 'ENQUIRIES_EDIT')
    if (me instanceof Response) return me
    const body = (await request.json()) as EnquiryRequest
    const fields = checkEnquiry(body, { callBackRequired: true })
    if (Object.keys(fields).length > 0) {
      return errorResponse(400, 'VALIDATION', 'Check the form.', { fields })
    }
    const old = openEnquiryWithPhone(tenDigits(body.phone) ?? '')
    if (old) return existsResponse(old)

    const created = {
      id: db.nextEnquiryId++,
      createdOn: MOCK_TODAY,
      parentName: '',
      phone: '',
      relation: body.relation,
      village: '',
      childName: null,
      className: body.className,
      childAge: null,
      currentSchool: null,
      source: body.source,
      referredBy: null,
      nextStepDate: body.nextStepDate ?? null,
      needsBus: null,
      note: null,
      status: 'NEW' as const,
      lostReason: null,
      studentId: null,
      followUps: [],
    }
    applyEnquiryBody(created, body)
    db.enquiries.push(created)
    return HttpResponse.json(toEnquiry(created), { status: 201 })
  }),

  http.get('/api/v1/enquiries/:id/prefill', async ({ request, params }) => {
    await wait()
    const me = authorize(request, 'ADMISSIONS_CREATE')
    if (me instanceof Response) return me
    const found = enquiryById(params.id)
    if (!found) return notFound()
    if (!isOpen(found.status)) {
      return errorResponse(
        409,
        'BAD_STAGE',
        `This enquiry is already ${statusLabels[found.status]}.`,
      )
    }
    return HttpResponse.json(toPrefill(found))
  }),

  http.get('/api/v1/enquiries/:id', async ({ request, params }) => {
    await wait()
    const me = authorize(request, 'ENQUIRIES_VIEW')
    if (me instanceof Response) return me
    const found = enquiryById(params.id)
    return found ? HttpResponse.json(toEnquiry(found)) : notFound()
  }),

  http.put('/api/v1/enquiries/:id', async ({ request, params }) => {
    await wait()
    const me = authorize(request, 'ENQUIRIES_EDIT')
    if (me instanceof Response) return me
    const found = enquiryById(params.id)
    if (!found) return notFound()
    const body = (await request.json()) as EnquiryRequest
    const fields = checkEnquiry(body, { callBackRequired: isOpen(found.status) })
    if (Object.keys(fields).length > 0) {
      return errorResponse(400, 'VALIDATION', 'Check the form.', { fields })
    }
    const old = isOpen(found.status)
      ? openEnquiryWithPhone(tenDigits(body.phone) ?? '', found.id)
      : undefined
    if (old) return existsResponse(old)
    applyEnquiryBody(found, body)
    return HttpResponse.json(toEnquiry(found) satisfies Enquiry)
  }),

  http.post('/api/v1/enquiries/:id/follow-ups', async ({ request, params }) => {
    await wait()
    const me = authorize(request, 'ENQUIRIES_EDIT')
    if (me instanceof Response) return me
    const found = enquiryById(params.id)
    if (!found) return notFound()
    const body = (await request.json()) as FollowUpRequest
    const fields: Record<string, string> = {}
    if (!body.note?.trim()) fields.note = 'Write what was said.'
    if (body.nextDate && !ISO_DATE.test(body.nextDate)) fields.nextDate = 'Enter the date.'
    if (Object.keys(fields).length > 0) {
      return errorResponse(400, 'VALIDATION', 'Check the form.', { fields })
    }
    found.followUps.push({
      id: db.nextFollowUpId++,
      at: MOCK_NOW.toISOString(),
      note: body.note.trim(),
      by: me.name ?? me.phone,
      nextDate: body.nextDate || null,
    })
    // A new date moves the next step, but only while the parent is still being followed.
    if (body.nextDate && isOpen(found.status)) found.nextStepDate = body.nextDate
    return HttpResponse.json(toEnquiry(found), { status: 201 })
  }),

  http.post('/api/v1/enquiries/:id/status', async ({ request, params }) => {
    await wait()
    const me = authorize(request, 'ENQUIRIES_EDIT')
    if (me instanceof Response) return me
    const found = enquiryById(params.id)
    if (!found) return notFound()
    const body = (await request.json()) as StatusRequest
    if (!enquiryStatuses.includes(body.status)) {
      return errorResponse(400, 'VALIDATION', 'Check the form.', {
        fields: { status: 'Pick a stage.' },
      })
    }
    if (body.status === 'ADMITTED') {
      return errorResponse(
        409,
        'BAD_STAGE',
        'An enquiry becomes Admitted when the admission is saved. Use Start admission.',
      )
    }
    if (!nextStagesOf(found.status).includes(body.status)) {
      return errorResponse(
        409,
        'BAD_STAGE',
        `An enquiry cannot move from ${statusLabels[found.status]} to ${statusLabels[body.status]}.`,
      )
    }
    if (body.status === 'LOST' && !body.reason?.trim()) {
      return errorResponse(400, 'VALIDATION', 'Say why the enquiry is lost.', {
        fields: { reason: 'Say why the enquiry is lost.' },
      })
    }
    found.status = body.status
    if (body.status === 'LOST') {
      found.lostReason = body.reason?.trim() ?? null
      found.nextStepDate = null
    } else {
      found.lostReason = null
      // Reopened: the parent must be called again today.
      if (found.nextStepDate === null) found.nextStepDate = MOCK_TODAY
    }
    return HttpResponse.json(toEnquiry(found))
  }),
]
