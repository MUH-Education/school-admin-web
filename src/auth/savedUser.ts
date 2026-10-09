import { phoneDb } from '@/attendant/phoneDb'
import type { AuthUser } from './types'

const KEY = 'user'

// The phone must open with no network (docs/07). GET /auth/me needs network, so the last answer
// is kept in IndexedDB and used only when the network fails. The token itself stays in localStorage.

export async function saveUser(user: AuthUser): Promise<void> {
  try {
    await (await phoneDb()).put('session', user, KEY)
  } catch {
    // IndexedDB blocked: the app then needs network to open, like any web page.
  }
}

export async function getSavedUser(): Promise<AuthUser | null> {
  try {
    return (await (await phoneDb()).get('session', KEY)) ?? null
  } catch {
    return null
  }
}

export async function clearSavedUser(): Promise<void> {
  try {
    await (await phoneDb()).delete('session', KEY)
  } catch {
    // Nothing to clear.
  }
}
