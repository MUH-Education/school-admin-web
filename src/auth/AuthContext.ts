import { createContext } from 'react'
import type { AuthUser, LoginResponse } from './types'

export interface AuthState {
  /** The signed-in person, or null. */
  user: AuthUser | null
  /** True while a saved token is being checked with GET /auth/me. */
  isLoading: boolean
  /** True after the person pressed Log out. The login page then does not return to the old page. */
  signedOut: boolean
  /** Set when GET /auth/me failed for a reason other than 401, for example no network. */
  loadError: unknown
  retryLoad: () => void
  login: (response: LoginResponse) => void
  logout: () => void
}

export const AuthContext = createContext<AuthState | null>(null)
