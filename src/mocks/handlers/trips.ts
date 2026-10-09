import { http, HttpResponse } from 'msw'
import { rolePermissions } from '../data/roles'
import { db } from '../db'
import { authorize, errorResponse, wait } from '../http'
import { applyMark, manifestAnswer, myRouteAnswer, ownRouteId } from '../tripsLogic'
import type { MarksRequest, TapBody } from '@/attendant/types'

/** Either permission opens the trips calls. `any` is true for TRIPS_RECORD_ANY (any route). */
function tripsUser(request: Request) {
  const me = authorize(request)
  if (me instanceof Response) return me
  const permissions = rolePermissions[me.role]
  const any = permissions.includes('TRIPS_RECORD_ANY')
  if (!any && !permissions.includes('TRIPS_RECORD')) {
    return errorResponse(403, 'FORBIDDEN', 'You cannot do this.')
  }
  return { me, any }
}

export const tripsHandlers = [
  http.get('/api/v1/trips/my-route', async ({ request }) => {
    await wait()
    const me = authorize(request, 'TRIPS_RECORD')
    if (me instanceof Response) return me
    return HttpResponse.json(myRouteAnswer(me))
  }),

  http.get('/api/v1/trips/manifest', async ({ request }) => {
    await wait()
    const who = tripsUser(request)
    if (who instanceof Response) return who
    const url = new URL(request.url)
    const routeId = Number(url.searchParams.get('routeId'))
    const date = url.searchParams.get('date') ?? ''
    if (!Number.isInteger(routeId) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return errorResponse(400, 'VALIDATION', 'routeId and date (YYYY-MM-DD) are needed.')
    }
    if (!who.any && routeId !== ownRouteId(who.me)) {
      return errorResponse(403, 'NOT_YOUR_ROUTE', 'This is not your route.')
    }
    const answer = manifestAnswer(routeId, date)
    if (!answer) return errorResponse(404, 'NOT_FOUND', 'This route does not exist.')
    return HttpResponse.json(answer)
  }),

  http.post('/api/v1/trips/marks', async ({ request }) => {
    await wait()
    const who = tripsUser(request)
    if (who instanceof Response) return who
    const body = (await request.json().catch(() => null)) as Partial<MarksRequest> | null
    const marks = body?.marks
    if (!Array.isArray(marks) || marks.length === 0 || marks.length > 100) {
      return errorResponse(400, 'VALIDATION', 'Send 1 to 100 marks.')
    }
    const results = marks.map((mark: TapBody) => applyMark(who.me, who.any, mark))
    return HttpResponse.json({ results })
  }),

  // Only in the mock: lets a test or the Playwright flow see what the "server" has stored.
  http.get('/api/v1/_mock/taps', async () => HttpResponse.json(db.tripTaps)),
]
