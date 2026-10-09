import { http, HttpResponse } from 'msw'
import type { RouteBody, Settings, StopBody } from '@/features/routes/types'
import type { MockRoute, MockStop } from '../data/fleet'
import { db } from '../db'
import { toLoadRow, toRoute } from '../fleetLogic'
import { authorize, errorResponse, wait } from '../http'

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/

function activeRoute(id: unknown): MockRoute | undefined {
  return db.routes.find((r) => r.id === Number(id) && r.active)
}

/** Checks name and vehicle. Returns a ready error answer, or null when all is fine. */
function checkRouteBody(body: RouteBody, selfId?: number): Response | null {
  if (!body.name?.trim()) {
    return errorResponse(400, 'VALIDATION', 'Check the form.', {
      fields: { name: 'Enter the route name.' },
    })
  }
  if (body.vehicleId !== null && body.vehicleId !== undefined) {
    const vehicle = db.vehicles.find((v) => v.id === body.vehicleId && v.active)
    if (!vehicle) {
      return errorResponse(400, 'VALIDATION', 'Check the form.', {
        fields: { vehicleId: 'Pick a vehicle.' },
      })
    }
    const other = db.routes.find((r) => r.active && r.vehicleId === vehicle.id && r.id !== selfId)
    if (other) {
      return errorResponse(
        409,
        'VEHICLE_HAS_ROUTE',
        `${vehicle.name} already runs ${other.name}. Pick another vehicle.`,
      )
    }
  }
  return null
}

function checkSettings(body: Partial<Settings>): Record<string, string> {
  const fields: Record<string, string> = {}
  if (
    !Number.isInteger(body.busMonths) ||
    (body.busMonths ?? 0) < 1 ||
    (body.busMonths ?? 0) > 12
  ) {
    fields.busMonths = 'Enter a number from 1 to 12.'
  }
  if (typeof body.busFeePerChild !== 'number' || body.busFeePerChild < 0) {
    fields.busFeePerChild = 'Enter the fee in rupees.'
  }
  if (
    typeof body.feeCollectedPercent !== 'number' ||
    body.feeCollectedPercent < 0 ||
    body.feeCollectedPercent > 100
  ) {
    fields.feeCollectedPercent = 'Enter a number from 0 to 100.'
  }
  return fields
}

export const routeHandlers = [
  http.get('/api/v1/routes/load-board', async ({ request }) => {
    await wait()
    const me = authorize(request, 'ROUTES_VIEW')
    if (me instanceof Response) return me
    return HttpResponse.json(db.routes.filter((r) => r.active).map(toLoadRow))
  }),

  http.get('/api/v1/routes', async ({ request }) => {
    await wait()
    const me = authorize(request, 'ROUTES_VIEW')
    if (me instanceof Response) return me
    return HttpResponse.json(db.routes.filter((r) => r.active).map(toRoute))
  }),

  http.post('/api/v1/routes', async ({ request }) => {
    await wait()
    const me = authorize(request, 'ROUTES_EDIT')
    if (me instanceof Response) return me
    const body = (await request.json()) as RouteBody
    const problem = checkRouteBody(body)
    if (problem) return problem
    const created: MockRoute = {
      id: db.nextRouteId++,
      name: body.name.trim(),
      vehicleId: body.vehicleId ?? null,
      active: true,
      stops: [],
    }
    db.routes.push(created)
    return HttpResponse.json(toRoute(created), { status: 201 })
  }),

  http.get('/api/v1/routes/:id', async ({ request, params }) => {
    await wait()
    const me = authorize(request, 'ROUTES_VIEW')
    if (me instanceof Response) return me
    const route = activeRoute(params.id)
    if (!route) return errorResponse(404, 'NOT_FOUND', 'This route does not exist.')
    return HttpResponse.json(toRoute(route))
  }),

  http.put('/api/v1/routes/:id', async ({ request, params }) => {
    await wait()
    const me = authorize(request, 'ROUTES_EDIT')
    if (me instanceof Response) return me
    const route = activeRoute(params.id)
    if (!route) return errorResponse(404, 'NOT_FOUND', 'This route does not exist.')
    const body = (await request.json()) as RouteBody
    const problem = checkRouteBody(body, route.id)
    if (problem) return problem
    route.name = body.name.trim()
    route.vehicleId = body.vehicleId ?? null
    return HttpResponse.json(toRoute(route))
  }),

  http.delete('/api/v1/routes/:id', async ({ request, params }) => {
    await wait()
    const me = authorize(request, 'ROUTES_EDIT')
    if (me instanceof Response) return me
    const route = activeRoute(params.id)
    if (!route) return errorResponse(404, 'NOT_FOUND', 'This route does not exist.')
    const children = route.stops.reduce((sum, s) => sum + s.children, 0)
    if (children > 0) {
      return errorResponse(
        409,
        'ROUTE_HAS_STUDENTS',
        `${route.name} has ${children} children. Move them to another route first.`,
      )
    }
    route.active = false
    return new HttpResponse(null, { status: 204 })
  }),

  http.put('/api/v1/routes/:id/stops', async ({ request, params }) => {
    await wait()
    const me = authorize(request, 'ROUTES_EDIT')
    if (me instanceof Response) return me
    const route = activeRoute(params.id)
    if (!route) return errorResponse(404, 'NOT_FOUND', 'This route does not exist.')
    const body = (await request.json()) as StopBody[]
    if (
      !Array.isArray(body) ||
      body.some((s) => !s.name?.trim() || !TIME.test(s.morningTime ?? ''))
    ) {
      return errorResponse(
        400,
        'VALIDATION',
        'Every stop needs a name and a time, for example 07:25.',
      )
    }
    if (body.some((s) => s.id !== undefined && !route.stops.some((old) => old.id === s.id))) {
      return errorResponse(400, 'VALIDATION', 'One of the stops is not on this route.')
    }
    const kept = new Set(body.flatMap((s) => (s.id === undefined ? [] : [s.id])))
    const removed = route.stops.find((s) => !kept.has(s.id) && s.children > 0)
    if (removed) {
      return errorResponse(
        409,
        'STOP_HAS_STUDENTS',
        `${removed.name} has ${removed.children} children. Move them to another stop first.`,
      )
    }
    const next: MockStop[] = body.map((s) => {
      const old = route.stops.find((x) => x.id === s.id)
      return {
        id: old?.id ?? db.nextStopId++,
        name: s.name.trim(),
        morningTime: s.morningTime,
        children: old?.children ?? 0,
      }
    })
    route.stops = next
    return HttpResponse.json(toRoute(route))
  }),

  http.get('/api/v1/settings', async ({ request }) => {
    await wait()
    const me = authorize(request)
    if (me instanceof Response) return me
    return HttpResponse.json(db.settings)
  }),

  http.put('/api/v1/settings', async ({ request }) => {
    await wait()
    const me = authorize(request, 'SETTINGS_EDIT')
    if (me instanceof Response) return me
    const body = (await request.json()) as Settings
    const fields = checkSettings(body)
    if (Object.keys(fields).length > 0) {
      return errorResponse(400, 'VALIDATION', 'Check the numbers.', { fields })
    }
    db.settings = {
      busMonths: body.busMonths,
      busFeePerChild: body.busFeePerChild,
      feeCollectedPercent: body.feeCollectedPercent,
    }
    return HttpResponse.json(db.settings)
  }),
]
