import type { Permission, RoleCode } from '@/auth/types'

/** One row of GET /users. */
export interface User {
  id: number
  name: string | null
  phone: string
  role: RoleCode
  active: boolean
  /** The attendant's route name, for example "Route 4". Null for other roles. */
  route: string | null
}

/** Body of POST /users. */
export interface CreateUserBody {
  phone: string
  role: RoleCode
  name?: string
  /** Needed when role is ATTENDANT. */
  staffId?: number
}

/** Body of PUT /users/{id}. */
export interface UpdateUserBody {
  phone?: string
  name?: string
  role?: RoleCode
  active?: boolean
}

/** One row of GET /roles: a role and the permissions it holds. */
export interface Role {
  role: RoleCode
  permissions: Permission[]
}

/** Business errors the Users dialogs show with the server's message. */
export type UserErrorCode = 'PHONE_ALREADY_USED' | 'LAST_OWNER' | 'CANNOT_DISABLE_SELF'

/** One person from GET /staff?type=ATTENDANT, for the "Which attendant?" choice. */
export interface AttendantOption {
  id: number
  name: string
  type: 'ATTENDANT'
  /** Route name today, for example "Route 4". Null when not on a route. */
  route: string | null
}
