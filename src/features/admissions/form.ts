import { z } from 'zod'
import { todayIso } from '@/lib/format'
import { normalizePhone } from '@/lib/phone'
import type { EnquiryPrefill } from '@/features/enquiries/types'
import type { ClassName, Gender, Occupation } from '@/features/students/types'
import type { AdmissionRequest } from './types'

const filled = (message: string) => z.string().refine((v) => v.trim() !== '', message)

/** The form of parts 1 to 3: Student, Family, Transport. Part 4 (Fees) comes in web phase 8. */
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
  })

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
] as const satisfies readonly (keyof AdmissionValues)[]

export function emptyAdmission(): AdmissionValues {
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
  }
}
