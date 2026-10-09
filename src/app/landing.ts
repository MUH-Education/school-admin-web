import type { AuthUser } from '@/auth/types'
import { allowedMenu } from './menu'

/**
 * Where a user lands after login.
 * 1. Has TRIPS_RECORD and no other page permission → /trip.
 * 2. Else the first menu item they may open, top to bottom.
 */
export function landingPath(user: AuthUser): string {
  const can = (permission: AuthUser['permissions'][number]) => user.permissions.includes(permission)
  const first = allowedMenu(can)[0]?.items[0]
  if (first) return first.to
  if (can('TRIPS_RECORD')) return '/trip'
  return '/cannot-open'
}
