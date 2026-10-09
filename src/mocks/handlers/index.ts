import type { RequestHandler } from 'msw'
import { admissionHandlers } from './admissions'
import { authHandlers } from './auth'
import { routeHandlers } from './routes'
import { staffHandlers } from './staff'
import { studentHandlers } from './students'
import { userHandlers } from './users'
import { vehicleHandlers } from './vehicles'

/** One list per feature is added here. */
export const handlers: RequestHandler[] = [
  ...authHandlers,
  ...userHandlers,
  ...vehicleHandlers,
  ...staffHandlers,
  ...routeHandlers,
  ...studentHandlers,
  ...admissionHandlers,
]
