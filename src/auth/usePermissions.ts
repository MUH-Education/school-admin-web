import { useAuth } from './useAuth'
import type { Permission } from './types'

/** `can('VEHICLES_EDIT')` reads the list the server gave at login. There is no copy of the role table here. */
export function usePermissions(): { can: (permission: Permission) => boolean } {
  const { user } = useAuth()
  return { can: (permission) => user?.permissions.includes(permission) ?? false }
}
