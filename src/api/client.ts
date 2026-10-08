import { ApiError, type ApiErrorBody } from './errors'

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE'

const TOKEN_KEY = 'token'

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Storage blocked: the user simply has to log in again.
  }
}

let onUnauthorized: () => void = () => {}

/** The auth module (Phase 1) calls this once to hear about a 401. */
export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler
}

function baseUrl(): string {
  return import.meta.env.VITE_API_BASE ?? '/api/v1'
}

/** The one place that calls fetch. */
export async function api<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  let response: Response
  try {
    response = await fetch(`${baseUrl()}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw ApiError.network()
  }

  if (!response.ok) {
    const errorBody = await response.json().then(
      (json: ApiErrorBody) => json,
      () => null,
    )
    if (response.status === 401 && !path.startsWith('/auth/')) onUnauthorized()
    throw ApiError.fromBody(response.status, errorBody)
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}
