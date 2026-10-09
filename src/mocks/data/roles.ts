import type { Permission, RoleCode } from '@/auth/types'
import type { Role } from '@/features/users/types'

const ALL: Permission[] = [
  'BUS_STATUS_VIEW',
  'TRIPS_RECORD',
  'TRIPS_RECORD_ANY',
  'ROUTES_VIEW',
  'ROUTES_EDIT',
  'VEHICLES_VIEW',
  'VEHICLES_EDIT',
  'STUDENTS_VIEW',
  'STUDENTS_EDIT',
  'ADMISSIONS_CREATE',
  'MESSAGES_VIEW',
  'ENQUIRIES_VIEW',
  'ENQUIRIES_EDIT',
  'FEES_VIEW',
  'FEES_EDIT',
  'FEES_CORRECT',
  'ANALYTICS_VIEW',
  'USERS_MANAGE',
  'SETTINGS_EDIT',
]

/** Same as the table in docs/backend/roles-permissions.md. */
export const rolePermissions: Record<RoleCode, Permission[]> = {
  OWNER: ALL,
  OFFICE_ADMIN: [
    'BUS_STATUS_VIEW',
    'TRIPS_RECORD_ANY',
    'ROUTES_VIEW',
    'VEHICLES_VIEW',
    'STUDENTS_VIEW',
    'STUDENTS_EDIT',
    'ADMISSIONS_CREATE',
    'MESSAGES_VIEW',
    'ENQUIRIES_VIEW',
    'ENQUIRIES_EDIT',
    'FEES_VIEW',
    'FEES_EDIT',
    'ANALYTICS_VIEW',
  ],
  TRANSPORT_INCHARGE: [
    'BUS_STATUS_VIEW',
    'TRIPS_RECORD',
    'TRIPS_RECORD_ANY',
    'ROUTES_VIEW',
    'ROUTES_EDIT',
    'VEHICLES_VIEW',
    'VEHICLES_EDIT',
    'STUDENTS_VIEW',
    'MESSAGES_VIEW',
  ],
  ADMISSIONS_DESK: [
    'STUDENTS_VIEW',
    'ADMISSIONS_CREATE',
    'ENQUIRIES_VIEW',
    'ENQUIRIES_EDIT',
    'FEES_VIEW',
    'FEES_EDIT',
    'ANALYTICS_VIEW',
  ],
  ATTENDANT: ['TRIPS_RECORD'],
}

export const roleTable: Role[] = (Object.keys(rolePermissions) as RoleCode[]).map((role) => ({
  role,
  permissions: rolePermissions[role],
}))
