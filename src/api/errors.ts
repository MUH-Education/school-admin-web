export interface ApiErrorBody {
  error?: string
  message?: string
  fields?: Record<string, string>
  retryAfterSeconds?: number
}

/** Every failed API call becomes one of these. */
export class ApiError extends Error {
  status: number
  code: string
  fields: Record<string, string>
  retryAfterSeconds?: number

  constructor(
    status: number,
    code: string,
    message: string,
    fields: Record<string, string> = {},
    retryAfterSeconds?: number,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fields = fields
    this.retryAfterSeconds = retryAfterSeconds
  }

  static fromBody(status: number, body: ApiErrorBody | null): ApiError {
    return new ApiError(
      status,
      body?.error ?? 'UNKNOWN',
      body?.message ?? 'Something went wrong. Try again.',
      body?.fields ?? {},
      body?.retryAfterSeconds,
    )
  }

  static network(): ApiError {
    return new ApiError(0, 'NETWORK', 'No connection. Check the internet and try again.')
  }
}
