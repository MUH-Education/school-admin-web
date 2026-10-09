import { ApiError } from '@/api/errors'

/** The words for each server error on the login page. */
export function loginErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'VALIDATION':
        return 'Enter a 10-digit mobile number.'
      case 'OTP_INVALID':
        return 'The code is wrong or too old. Try again or send a new code.'
      case 'OTP_LOCKED':
        return 'Too many wrong tries. Send a new code.'
      case 'OTP_TOO_MANY_REQUESTS':
        return 'Please wait before asking again.'
      case 'NETWORK':
        return error.message
    }
  }
  return 'Something went wrong. Try again.'
}
