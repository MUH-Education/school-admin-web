/**
 * Turns what a person types into +91XXXXXXXXXX, or null when it is not a valid Indian mobile.
 * Accepts `98123 45678`, `09812345678`, `+91 98123 45678`.
 */
export function normalizePhone(input: string): string | null {
  let digits = input.replace(/[\s\-()]/g, '')
  if (digits.startsWith('+91')) digits = digits.slice(3)
  else if (digits.startsWith('91') && digits.length === 12) digits = digits.slice(2)
  else if (digits.startsWith('0')) digits = digits.slice(1)
  return /^[6-9]\d{9}$/.test(digits) ? `+91${digits}` : null
}
