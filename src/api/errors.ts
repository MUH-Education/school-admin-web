export interface ApiErrorBody {
  error?: string
  message?: string
  fields?: Record<string, string>
  retryAfterSeconds?: number
  /** ENQUIRY_EXISTS names the old enquiry. */
  enquiryId?: number
}

/** Every failed API call becomes one of these. */
export class ApiError extends Error {
  status: number
  code: string
  fields: Record<string, string>
  retryAfterSeconds?: number
  enquiryId?: number

  constructor(
    status: number,
    code: string,
    message: string,
    fields: Record<string, string> = {},
    retryAfterSeconds?: number,
    enquiryId?: number,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fields = fields
    this.retryAfterSeconds = retryAfterSeconds
    this.enquiryId = enquiryId
  }

  static fromBody(status: number, body: ApiErrorBody | null): ApiError {
    return new ApiError(
      status,
      body?.error ?? 'UNKNOWN',
      body?.message ?? 'Something went wrong. Try again.',
      body?.fields ?? {},
      body?.retryAfterSeconds,
      body?.enquiryId,
    )
  }

  static network(): ApiError {
    return new ApiError(0, 'NETWORK', 'No connection. Check the internet and try again.')
  }
}
