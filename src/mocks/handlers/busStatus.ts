import { http, HttpResponse } from 'msw'
import {
  attentionItems,
  busStatusAnswer,
  defaultPhase,
  detailAnswer,
  parsePhase,
} from '../busStatusLogic'
import { authorize, errorResponse, wait } from '../http'

/** Reads `?phase=`. A wrong value is a 400 answer. Missing: the server picks by the time of day. */
function phaseOf(request: Request) {
  const parsed = parsePhase(new URL(request.url).searchParams.get('phase'))
  if (parsed === 'BAD') {
    return errorResponse(400, 'VALIDATION', 'phase must be MORNING, AT_SCHOOL or EVENING.')
  }
  return parsed ?? defaultPhase()
}

export const busStatusHandlers = [
  http.get('/api/v1/bus-status/attention', async ({ request }) => {
    await wait()
    const me = authorize(request, 'BUS_STATUS_VIEW')
    if (me instanceof Response) return me
    const phase = phaseOf(request)
    if (phase instanceof Response) return phase
    return HttpResponse.json(attentionItems(phase))
  }),

  http.get('/api/v1/bus-status/routes/:routeId', async ({ request, params }) => {
    await wait()
    const me = authorize(request, 'BUS_STATUS_VIEW')
    if (me instanceof Response) return me
    const phase = phaseOf(request)
    if (phase instanceof Response) return phase
    const answer = detailAnswer(Number(params.routeId), phase)
    if (!answer) return errorResponse(404, 'NOT_FOUND', 'This route does not exist.')
    return HttpResponse.json(answer)
  }),

  http.get('/api/v1/bus-status', async ({ request }) => {
    await wait()
    const me = authorize(request, 'BUS_STATUS_VIEW')
    if (me instanceof Response) return me
    const phase = phaseOf(request)
    if (phase instanceof Response) return phase
    return HttpResponse.json(busStatusAnswer(phase))
  }),
]
