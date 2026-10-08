// Match docs/backend/roles-permissions.md and docs/backend/login-otp-jwt.md.

export type RoleCode =
  'OWNER' | 'OFFICE_ADMIN' | 'TRANSPORT_INCHARGE' | 'ADMISSIONS_DESK' | 'ATTENDANT'

export type Permission =
  | 'BUS_STATUS_VIEW'
  | 'TRIPS_RECORD'
  | 'TRIPS_RECORD_ANY'
  | 'ROUTES_VIEW'
  | 'ROUTES_EDIT'
  | 'VEHICLES_VIEW'
  | 'VEHICLES_EDIT'
  | 'STUDENTS_VIEW'
  | 'STUDENTS_EDIT'
  | 'ADMISSIONS_CREATE'
  | 'MESSAGES_VIEW'
  | 'ENQUIRIES_VIEW'
  | 'ENQUIRIES_EDIT'
  | 'FEES_VIEW'
  | 'FEES_EDIT'
  | 'FEES_CORRECT'
  | 'ANALYTICS_VIEW'
  | 'USERS_MANAGE'
  | 'SETTINGS_EDIT'

/** The route an attendant works on today. Null when there is none. */
export interface AttendantRoute {
  id: number
  name: string
  vehicle: string
}

/** The signed-in person: `user` in the login answer and the answer of GET /auth/me. */
export interface AuthUser {
  id: number
  name: string | null
  phone: string
  role: RoleCode
  permissions: Permission[]
  route: AttendantRoute | null
}

/** POST /auth/otp/request and POST /auth/otp/verify bodies. */
export interface OtpRequestBody {
  phone: string
}
export interface OtpVerifyBody {
  phone: string
  otp: string
}

/** Answer of POST /auth/otp/request. Always the same, also for an unknown number. */
export interface OtpRequestResponse {
  message: string
  expiresInSeconds: number
  resendAfterSeconds: number
}

/** Answer of POST /auth/otp/verify. */
export interface LoginResponse {
  token: string
  expiresAt: string
  user: AuthUser
}
