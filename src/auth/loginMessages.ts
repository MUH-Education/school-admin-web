import type { TFunction } from 'i18next'
import { ApiError } from '@/api/errors'

/** The words for each server error on the login page, in the chosen language. */
export function loginErrorMessage(error: unknown, t: TFunction): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'VALIDATION':
        return t('login.errors.phone')
      case 'OTP_INVALID':
        return t('login.errors.otpInvalid')
      case 'OTP_LOCKED':
        return t('login.errors.otpLocked')
      case 'OTP_TOO_MANY_REQUESTS':
        return t('login.errors.otpTooMany')
      case 'NETWORK':
        return t('login.errors.network')
    }
  }
  return t('login.errors.other')
}
