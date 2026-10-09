import type { RequestHandler } from 'msw'
import { authHandlers } from './auth'
import { routeHandlers } from './routes'
import { staffHandlers } from './staff'
import { userHandlers } from './users'
import { vehicleHandlers } from './vehicles'

/** One list per feature is added here. */
export const handlers: RequestHandler[] = [
  ...authHandlers,
  ...userHandlers,
  ...vehicleHandlers,
  ...staffHandlers,
  ...routeHandlers,
]
