import type { FieldValues, Path, UseFormReturn } from 'react-hook-form'
import { z } from 'zod'
import { ApiError } from '@/api/errors'
import type { ClassName } from '@/features/students/types'
import { normalizePhone } from '@/lib/phone'
import type { Enquiry, EnquiryRelation, EnquiryRequest, EnquirySource } from './types'

const filled = (message: string) => z.string().refine((v) => v.trim() !== '', message)

const baseSchema = z.object({
  // 1. Parent
  parentName: z.string().trim().min(1, "Enter the parent's name."),
  phone: z.string(),
  relation: z.string(),
  village: z.string().trim().min(1, 'Enter the village or locality.'),
  // 2. Child
  childName: z.string(),
  className: filled('Pick a class.'),
  childAge: z.string(),
  currentSchool: z.string(),
  // 3. How they heard about us
  source: filled('Pick how they heard about us.'),
  referredBy: z.string(),
  // 4. Follow-up
  nextStepDate: z.string(),
  needsBus: z.string(),
  note: z.string(),
})

export type EnquiryValues = z.infer<typeof baseSchema>

/**
 * The Zod schema of the Add and the Edit form. `callBackRequired` is false for an enquiry that is
 * Admitted or Lost: there is nothing left to call about, so the date box is not shown.
 */
export function enquirySchema({ callBackRequired }: { callBackRequired: boolean }) {
  return baseSchema.superRefine((v, ctx) => {
    const problem = (path: keyof EnquiryValues, message: string) =>
      ctx.addIssue({ code: 'custom', path: [path], message })
    if (normalizePhone(v.phone) === null) problem('phone', 'Enter a 10-digit mobile number.')
    if (v.source === 'REFERRAL' && !v.referredBy.trim())
      problem('referredBy', 'Enter the name of the parent who referred them.')
    if (callBackRequired && !v.nextStepDate) problem('nextStepDate', 'Enter the date to call back.')
  })
}

/** Every name here can come back from the server as a field error. */
export const enquiryFieldNames = [
  'parentName',
  'phone',
  'relation',
  'village',
  'childName',
  'className',
  'childAge',
  'currentSchool',
  'source',
  'referredBy',
  'nextStepDate',
  'needsBus',
  'note',
] as const satisfies readonly (keyof EnquiryValues)[]

/** A clean form. Source and class wait for an answer: a wrong first choice would spoil the counts. */
export function emptyEnquiry(): EnquiryValues {
  return {
    parentName: '',
    phone: '',
    relation: 'FATHER',
    village: '',
    childName: '',
    className: '',
    childAge: '',
    currentSchool: '',
    source: '',
    referredBy: '',
    nextStepDate: '',
    needsBus: '',
    note: '',
  }
}

/** The values of a saved enquiry, to fill the form of One enquiry. */
export function fromEnquiry(e: Enquiry): EnquiryValues {
  return {
    parentName: e.parentName,
    phone: e.phone,
    relation: e.relation,
    village: e.village,
    childName: e.childName ?? '',
    className: e.className,
    childAge: e.childAge ?? '',
    currentSchool: e.currentSchool ?? '',
    source: e.source,
    referredBy: e.referredBy ?? '',
    nextStepDate: e.nextStepDate ?? '',
    needsBus: e.needsBus === null ? '' : e.needsBus ? 'YES' : 'NO',
    note: e.note ?? '',
  }
}

/** The body of POST and PUT. Empty optional boxes are left out. */
export function toRequest(v: EnquiryValues): EnquiryRequest {
  const text = (value: string) => value.trim()
  return {
    parentName: text(v.parentName),
    phone: text(v.phone),
    relation: v.relation as EnquiryRelation,
    village: text(v.village),
    ...(text(v.childName) ? { childName: text(v.childName) } : {}),
    className: v.className as ClassName,
    ...(text(v.childAge) ? { childAge: text(v.childAge) } : {}),
    ...(text(v.currentSchool) ? { currentSchool: text(v.currentSchool) } : {}),
    source: v.source as EnquirySource,
    ...(v.source === 'REFERRAL' ? { referredBy: text(v.referredBy) } : {}),
    ...(v.nextStepDate ? { nextStepDate: v.nextStepDate } : {}),
    ...(v.needsBus ? { needsBus: v.needsBus === 'YES' } : {}),
    ...(text(v.note) ? { note: text(v.note) } : {}),
  }
}

/**
 * Puts the server's field errors under their inputs. Returns the words to show in a red box when
 * the error belongs to no input.
 */
export function showServerErrors<T extends FieldValues>(
  form: UseFormReturn<T>,
  error: unknown,
  names: readonly string[],
): string | null {
  if (!(error instanceof ApiError)) return 'Something went wrong. Try again.'
  const own = names.filter((name) => error.fields[name])
  for (const name of own) form.setError(name as Path<T>, { message: error.fields[name] })
  return own.length === 0 ? error.message : null
}

/** Scrolls to the first input with a mistake. The timer lets the mistakes reach the screen first. */
export function showFirstMistake(form: HTMLFormElement | null): void {
  setTimeout(() => {
    const first = form?.querySelector<HTMLElement>('[aria-invalid="true"], p[role="alert"]')
    first?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    first?.focus({ preventScroll: true })
  }, 0)
}
