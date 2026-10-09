import { http, HttpResponse } from 'msw'
import type { MessagePage, MessageStatus } from '@/features/messages/types'
import { messageStatuses } from '@/features/messages/types'
import { authorize, errorResponse, wait } from '../http'
import { filterMessages, summaryOfDay, todayOrDate } from '../messagesLogic'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const PAGE_SIZE = 25

/** `?date=` must look like 2026-10-07. Missing means today. */
function dateOf(url: URL): string | Response {
  const raw = url.searchParams.get('date')
  if (raw && !ISO_DATE.test(raw)) {
    return errorResponse(400, 'VALIDATION', 'Check the filters.', {
      fields: { date: 'Enter the date like 2026-10-07.' },
    })
  }
  return todayOrDate(raw)
}

export const messageHandlers = [
  // Before /messages, so "summary" is never read as something else.
  http.get('/api/v1/messages/summary', async ({ request }) => {
    await wait()
    const me = authorize(request, 'MESSAGES_VIEW')
    if (me instanceof Response) return me
    const date = dateOf(new URL(request.url))
    if (date instanceof Response) return date
    return HttpResponse.json(summaryOfDay(date))
  }),

  http.get('/api/v1/messages', async ({ request }) => {
    await wait()
    const me = authorize(request, 'MESSAGES_VIEW')
    if (me instanceof Response) return me
    const url = new URL(request.url)
    const date = dateOf(url)
    if (date instanceof Response) return date
    const status = url.searchParams.get('status') ?? ''
    if (status && !messageStatuses.includes(status as MessageStatus)) {
      return errorResponse(400, 'VALIDATION', 'Check the filters.', {
        fields: { status: 'Pick Sent, Queued, Failed or Test only.' },
      })
    }
    const studentId = Number(url.searchParams.get('studentId')) || null
    const rows = filterMessages(date, {
      status: status as MessageStatus | '',
      q: url.searchParams.get('q') ?? '',
      studentId,
      phone: url.searchParams.get('phone') ?? '',
    })
    const requested = Number(url.searchParams.get('page'))
    const page = Number.isInteger(requested) && requested > 0 ? requested : 1
    const body: MessagePage = {
      date,
      items: rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
      page,
      pageSize: PAGE_SIZE,
      total: rows.length,
    }
    return HttpResponse.json(body)
  }),
]
