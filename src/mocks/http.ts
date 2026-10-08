import { delay, HttpResponse } from 'msw'
import type { Permission } from '@/auth/types'
import { rolePermissions } from './data/roles'
import { sampleAttendants, type MockUser } from './data/users'
import { db } from './db'

/** Answers come after a short wait, so loading states are visible. Tests skip the wait. */
export async function wait(): Promise<void> {
  if (import.meta.env.MODE === 'test') return
  await delay(150 + Math.random() * 250)
}

export function errorResponse(
  status: number,
  error: string,
  message: string,
  extra: Record<string, unknown> = {},
) {
  return HttpResponse.json({ error, message, ...extra }, { status })
}

export function tokenFor(user: MockUser): string {
  return `mock-token-${user.id}`
}

/** Checks the token and the permission. Returns the user, or a ready 401 / 403 answer. */
export function authorize(request: Request, permission?: Permission): MockUser | Response {
  const header = request.headers.get('Authorization') ?? ''
  const match = /^Bearer mock-token-(\d+)$/.exec(header)
  const user = match ? db.users.find((u) => u.id === Number(match[1])) : undefined
  if (!user || !user.active) {
    return errorResponse(401, 'UNAUTHENTICATED', 'Please log in again.')
  }
  if (permission && !rolePermissions[user.role].includes(permission)) {
    return errorResponse(403, 'FORBIDDEN', 'You cannot do this.')
  }
  return user
}

export function routeNameOf(user: MockUser): string | null {
  return sampleAttendants.find((s) => s.id === user.staffId)?.route ?? null
}
