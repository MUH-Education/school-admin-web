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

/** The one place that calls fetch. Sends the token, turns a failed answer into an ApiError. */
async function send(
  method: Method,
  path: string,
  init: { body?: BodyInit; json?: boolean; accept?: string },
): Promise<Response> {
  const headers: Record<string, string> = { Accept: init.accept ?? 'application/json' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  // A multipart body sets its own Content-Type (with the boundary), so only JSON gets one here.
  if (init.json) headers['Content-Type'] = 'application/json'

  let response: Response
  try {
    response = await fetch(`${baseUrl()}${path}`, { method, headers, body: init.body })
  } catch {
    throw ApiError.network()
  }

  if (!response.ok) {
    const errorBody = await response.json().then(
      (json: ApiErrorBody) => json,
      () => null,
    )
    if (response.status === 401 && !path.startsWith('/auth/otp/')) onUnauthorized()
    throw ApiError.fromBody(response.status, errorBody)
  }
  return response
}

export async function api<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const response = await send(method, path, {
    body: body === undefined ? undefined : JSON.stringify(body),
    json: body !== undefined,
  })
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

/** Sends a file as multipart form data, for example a photo or a CSV. The file's field is `file`. */
export async function apiUpload<T>(path: string, file: File): Promise<T> {
  const form = new FormData()
  form.append('file', file)
  const response = await send('POST', path, { body: form })
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

/** Fetches a file, for example a photo. An `<img src>` cannot carry the token, so we ask here. */
export async function apiBlob(path: string): Promise<Blob> {
  const response = await send('GET', path, { accept: '*/*' })
  return response.blob()
}

/** The file name the server suggests in `Content-Disposition: attachment; filename="students.csv"`. */
function filenameOf(header: string | null): string | null {
  const match = header ? /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(header) : null
  const name = match?.[1] ? decodeURIComponent(match[1]).trim() : ''
  // Only a plain name: the server cannot choose a folder on the laptop.
  return name && !/[\\/]/.test(name) ? name : null
}

/**
 * Fetches a file that is to be saved, for example the student list for Excel. The token goes in the
 * header, never in the address. `filename` is the name the server suggests, or null.
 */
export async function apiFile(path: string): Promise<{ blob: Blob; filename: string | null }> {
  const response = await send('GET', path, { accept: '*/*' })
  return {
    blob: await response.blob(),
    filename: filenameOf(response.headers.get('Content-Disposition')),
  }
}
