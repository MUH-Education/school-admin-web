import { z } from 'zod'
import { feePreview } from '@/features/fees/feePreview'
import type { Frequency, PayMode } from '@/features/fees/types'
import { formatInr, todayIso } from '@/lib/format'
import { normalizePhone } from '@/lib/phone'
import type { EnquiryPrefill } from '@/features/enquiries/types'
import type { ClassName, Gender, Occupation } from '@/features/students/types'
import type { AdmissionRequest } from './types'

const filled = (message: string) => z.string().refine((v) => v.trim() !== '', message)

/** The form: 1 Student, 2 Family, 3 Transport, 4 Fees. Part 4 is only checked when `feesOn` is true. */
export const admissionSchema = z
  .object({
    // 1. Student
    name: z.string().trim().min(1, 'Enter the student name.'),
    dateOfBirth: z.string().min(1, 'Enter the date of birth.'),
    className: filled('Pick a class.'),
    section: z.string(),
    admissionDate: z.string(),
    gender: filled('Pick girl or boy.'),
    // 2. Family
    fatherName: z.string(),
    fatherPhone: z.string(),
    motherName: z.string(),
    motherPhone: z.string(),
    fatherOccupation: filled("Pick the father's occupation."),
    village: z.string().trim().min(1, 'Enter the village or locality.'),
    address: z.string(),
    siblingStudentId: z.number().nullable(),
    siblingName: z.string(),
    smsToFather: z.boolean(),
    smsToMother: z.boolean(),
    // 3. Transport
    usesBus: filled('Say yes or no.'),
    routeId: z.string(),
    stopId: z.string(),
    // 4. Fees. Whole rupees, null when the box is empty.
    /** False when the person cannot edit fees: part 4 is not on the page and is not checked. */
    feesOn: z.boolean(),
    schoolFee: z.number().nullable(),
    busFee: z.number().nullable(),
    discount: z.number().nullable(),
    discountReason: z.string(),
    frequency: z.string(),
    firstPaymentAmount: z.number().nullable(),
    firstPaymentMode: z.string(),
  })
  .superRefine((v, ctx) => {
    const problem = (path: keyof AdmissionValues, message: string) =>
      ctx.addIssue({ code: 'custom', path: [path], message })

    if (v.dateOfBirth > todayIso()) problem('dateOfBirth', 'The date of birth is in the future.')

    // With a brother or sister the parents are copied, so their boxes are hidden and not checked.
    if (v.siblingStudentId === null) {
      if (!v.fatherName.trim()) problem('fatherName', "Enter the father's name.")
      if (normalizePhone(v.fatherPhone) === null)
        problem('fatherPhone', 'Enter a 10-digit mobile number.')
      if (v.motherPhone.trim() && normalizePhone(v.motherPhone) === null)
        problem('motherPhone', 'Enter a 10-digit mobile number.')
      if (v.motherPhone.trim() && !v.motherName.trim())
        problem('motherName', "Enter the mother's name.")
    }

    if (v.usesBus === 'YES') {
      if (!v.routeId) problem('routeId', 'Pick a route.')
      if (!v.stopId) problem('stopId', 'Pick a stop.')
    }

    if (v.feesOn) {
      const school = v.schoolFee
      const bus = v.usesBus === 'YES' ? v.busFee : 0
      if (school === null) problem('schoolFee', 'Enter the school fee.')
      if (bus === null) problem('busFee', 'Enter the bus fee, or 0.')
      const preview = previewOf(v)
      if (preview.discountTooLarge) problem('discount', 'The discount is more than the fees.')
      if ((v.discount ?? 0) > 0 && !v.discountReason)
        problem('discountReason', 'Say why there is a discount.')
      if (!v.frequency) problem('frequency', 'Pick how often the family pays.')
      if (preview.paidTooLarge) {
        problem(
          'firstPaymentAmount',
          `The first payment is more than the ${formatInr(preview.total)} for the year.`,
        )
      }
    }
  })

/** The numbers of the Fee summary for the values in the form. The bus fee counts only with a bus. */
export function previewOf(v: AdmissionValues) {
  return feePreview({
    schoolFee: v.schoolFee,
    busFee: v.usesBus === 'YES' ? v.busFee : 0,
    discount: v.discount,
    frequency: (v.frequency || null) as Frequency | null,
    paidToday: v.firstPaymentAmount,
    startsOn: v.admissionDate || todayIso(),
  })
}

export type AdmissionValues = z.infer<typeof admissionSchema>

/** Every name here can come back from the server as a field error. */
export const admissionFieldNames = [
  'name',
  'dateOfBirth',
  'className',
  'section',
  'admissionDate',
  'gender',
  'fatherName',
  'fatherPhone',
  'motherName',
  'motherPhone',
  'fatherOccupation',
  'village',
  'address',
  'siblingStudentId',
  'usesBus',
  'routeId',
  'stopId',
  'schoolFee',
  'busFee',
  'discount',
  'discountReason',
  'frequency',
  'firstPaymentAmount',
  'firstPaymentMode',
] as const satisfies readonly (keyof AdmissionValues)[]

export function emptyAdmission(feesOn = true): AdmissionValues {
  return {
    name: '',
    dateOfBirth: '',
    className: '',
    section: '',
    admissionDate: todayIso(),
    gender: '',
    fatherName: '',
    fatherPhone: '',
    motherName: '',
    motherPhone: '',
    fatherOccupation: '',
    village: '',
    address: '',
    siblingStudentId: null,
    siblingName: '',
    smsToFather: true,
    smsToMother: true,
    usesBus: '',
    routeId: '',
    stopId: '',
    feesOn,
    schoolFee: null,
    busFee: null,
    discount: 0,
    discountReason: '',
    frequency: '',
    firstPaymentAmount: null,
    firstPaymentMode: 'UPI',
  }
}

/**
 * What GET /enquiries/{id}/prefill fills in. The parent goes to the mother's boxes when the
 * enquiry came from a mother, and to the father's boxes for everyone else. The clerk can change all.
 */
export function prefillValues(p: EnquiryPrefill): Partial<AdmissionValues> {
  return {
    name: p.childName ?? '',
    className: p.className,
    village: p.village,
    ...(p.relation === 'MOTHER'
      ? { motherName: p.parentName, motherPhone: p.phone }
      : { fatherName: p.parentName, fatherPhone: p.phone }),
  }
}

/** The body of POST /admissions. Empty boxes are left out. `enquiryId` makes that enquiry Admitted. */
export function toRequest(v: AdmissionValues, enquiryId: number | null = null): AdmissionRequest {
  const usesBus = v.usesBus === 'YES'
  const sibling = v.siblingStudentId
  return {
    name: v.name.trim(),
    dateOfBirth: v.dateOfBirth,
    gender: v.gender as Gender,
    className: v.className as ClassName,
    ...(v.section ? { section: v.section } : {}),
    ...(v.admissionDate ? { admissionDate: v.admissionDate } : {}),
    village: v.village.trim(),
    ...(v.address.trim() ? { address: v.address.trim() } : {}),
    fatherOccupation: v.fatherOccupation as Occupation,
    ...(sibling !== null
      ? { siblingStudentId: sibling }
      : {
          fatherName: v.fatherName.trim(),
          fatherPhone: v.fatherPhone.trim(),
          ...(v.motherPhone.trim()
            ? { motherName: v.motherName.trim(), motherPhone: v.motherPhone.trim() }
            : {}),
          smsToFather: v.smsToFather,
          smsToMother: v.smsToMother,
        }),
    usesBus,
    ...(usesBus ? { routeId: Number(v.routeId), stopId: Number(v.stopId) } : {}),
    ...(enquiryId !== null ? { enquiryId } : {}),
    ...(v.feesOn ? feesRequest(v) : {}),
  }
}

/** Part 4 of the body. The discount reason and the first payment are left out when they are empty. */
function feesRequest(v: AdmissionValues): Partial<AdmissionRequest> {
  const discount = v.discount ?? 0
  const paid = v.firstPaymentAmount ?? 0
  return {
    schoolFee: v.schoolFee ?? 0,
    busFee: v.usesBus === 'YES' ? (v.busFee ?? 0) : 0,
    discount,
    ...(discount > 0 ? { discountReason: v.discountReason } : {}),
    frequency: v.frequency as Frequency,
    ...(paid > 0
      ? { firstPaymentAmount: paid, firstPaymentMode: v.firstPaymentMode as PayMode }
      : {}),
  }
}
