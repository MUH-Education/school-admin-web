import type { RequestHandler } from 'msw'
import { authHandlers } from './auth'
import { userHandlers } from './users'

/** One list per feature is added here. */
export const handlers: RequestHandler[] = [...authHandlers, ...userHandlers]
