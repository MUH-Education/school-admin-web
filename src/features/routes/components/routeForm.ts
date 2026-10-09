import { z } from 'zod'
import type { Route, StopBody } from '../types'

export const routeSchema = z.object({
  name: z.string().trim().min(1, 'Enter the route name.'),
  /** "" means no vehicle. */
  vehicleId: z.string(),
  stops: z.array(
    z.object({
      id: z.number().optional(),
      name: z.string().trim().min(1, 'Every stop needs a name.'),
      morningTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Every stop needs a time.'),
      children: z.number(),
    }),
  ),
})
export type RouteFormValues = z.infer<typeof routeSchema>

export function toFormValues(route: Route): RouteFormValues {
  return {
    name: route.name,
    vehicleId: route.vehicleId === null ? '' : String(route.vehicleId),
    stops: route.stops.map((s) => ({
      id: s.id,
      name: s.name,
      morningTime: s.morningTime,
      children: s.children,
    })),
  }
}

/** The whole ordered list, as the server wants it. A stop without an id is new. */
export function toStopBodies(values: RouteFormValues): StopBody[] {
  return values.stops.map((s) => ({
    ...(s.id === undefined ? {} : { id: s.id }),
    name: s.name.trim(),
    morningTime: s.morningTime,
  }))
}
