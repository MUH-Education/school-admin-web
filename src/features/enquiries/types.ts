// Shapes of /enquiries. docs/backend/api.md gives the URLs, the filters and the permissions; the
// JSON answers are my guess (docs/08-decisions.md, part D, 9 Oct 2026).
import type { ClassName } from '@/features/students/types'

export type EnquiryStatus = 'NEW' | 'CONTACTED' | 'VISITED' | 'APPLIED' | 'ADMITTED' | 'LOST'

/** The order of the stage tiles (after "All"). */
export const enquiryStatuses: EnquiryStatus[] = [
  'NEW',
  'CONTACTED',
  'VISITED',
  'APPLIED',
  'ADMITTED',
  'LOST',
]

export const statusLabels: Record<EnquiryStatus, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  VISITED: 'Visited',
  APPLIED: 'Applied',
  ADMITTED: 'Admitted',
  LOST: 'Lost',
}

/** Where the parent heard about the school. The order is that of the Add an enquiry design. */
export type EnquirySource =
  'WALK_IN' | 'REFERRAL' | 'FACEBOOK' | 'WHATSAPP' | 'HOARDING' | 'BUS_ENQUIRY'

export const sourceLabels: Record<EnquirySource, string> = {
  WALK_IN: 'Walk-in',
  REFERRAL: 'Referral',
  FACEBOOK: 'Facebook',
  WHATSAPP: 'WhatsApp',
  HOARDING: 'Hoarding',
  BUS_ENQUIRY: 'Bus enquiry',
}
export const enquirySources = Object.keys(sourceLabels) as EnquirySource[]

/** Who is calling. The list is that of the "Relation to the child" box in the design. */
export type EnquiryRelation = 'FATHER' | 'MOTHER' | 'GRANDPARENT' | 'OTHER'

export const relationLabels: Record<EnquiryRelation, string> = {
  FATHER: 'Father',
  MOTHER: 'Mother',
  GRANDPARENT: 'Grandparent',
  OTHER: 'Other',
}
export const enquiryRelations = Object.keys(relationLabels) as EnquiryRelation[]

/** One row of GET /enquiries. */
export interface EnquiryRow {
  id: number
  /** ISO date the enquiry was added, "2026-10-06". */
  createdOn: string
  parentName: string
  /** The server hides most digits in the list: "98XXX XX412". The web app shows it as it comes. */
  phone: string
  village: string
  className: ClassName
  source: EnquirySource
  status: EnquiryStatus
  /** ISO date of the next call or visit. Null for Admitted and Lost. */
  nextStepDate: string | null
  /** True when `nextStepDate` is before today and the enquiry is still open. The server decides. */
  overdue: boolean
  /** Only when `status` is LOST. */
  lostReason: string | null
}

/** The answer of GET /enquiries: one page, newest first. */
export interface EnquiryPage {
  items: EnquiryRow[]
  /** First page is 1. */
  page: number
  pageSize: number
  /** All enquiries that match the filters. */
  total: number
  /** Every village of every enquiry, A to Z, for the Village list. */
  villages: string[]
}

/** The answer of GET /enquiries/summary. It does not change with the filters. */
export interface EnquirySummary {
  total: number
  byStatus: Record<EnquiryStatus, number>
  /** Open enquiries whose next date has passed. */
  overdue: number
  /** Admitted as a whole number out of `total`: 4 of 29 → 14. */
  admittedPercent: number
}

/** The filters of the list. They live in the address: /enquiries?status=VISITED&overdue=true */
export interface EnquiryFilters {
  status: EnquiryStatus | ''
  overdue: boolean
  /** Part of the parent's name or phone. */
  q: string
  village: string
  source: EnquirySource | ''
  page: number
}

/** One call or visit note. */
export interface FollowUp {
  id: number
  /** ISO date and time. */
  at: string
  note: string
  /** The name of the person who wrote it. */
  by: string
  /** The next date set with this note, if any. */
  nextDate: string | null
}

/** The answer of GET /enquiries/{id}, and of every call that changes one enquiry. */
export interface Enquiry {
  id: number
  createdOn: string
  parentName: string
  /** The whole number, so the form can be filled. */
  phone: string
  relation: EnquiryRelation
  village: string
  childName: string | null
  className: ClassName
  /** Free text, for example "6 years". */
  childAge: string | null
  currentSchool: string | null
  source: EnquirySource
  /** The name of the referring parent. Only when `source` is REFERRAL. */
  referredBy: string | null
  nextStepDate: string | null
  overdue: boolean
  /** Tri-state: null means "Not asked yet". */
  needsBus: boolean | null
  note: string | null
  status: EnquiryStatus
  lostReason: string | null
  /** Set when the enquiry is Admitted: the student page to link to. */
  studentId: number | null
  /** The stages this one may move to now. The server holds the rules. */
  nextStages: EnquiryStatus[]
  /** Newest first. */
  followUps: FollowUp[]
}

/** Body of POST /enquiries and PUT /enquiries/{id}. Empty optional boxes are left out. */
export interface EnquiryRequest {
  parentName: string
  phone: string
  relation: EnquiryRelation
  village: string
  childName?: string
  className: ClassName
  childAge?: string
  currentSchool?: string
  source: EnquirySource
  /** Needed when `source` is REFERRAL. */
  referredBy?: string
  /** ISO date. Needed unless the enquiry is Admitted or Lost. */
  nextStepDate?: string
  needsBus?: boolean
  note?: string
}

/** Body of POST /enquiries/{id}/follow-ups. */
export interface FollowUpRequest {
  note: string
  /** ISO date. Moves the next step. */
  nextDate?: string
}

/** Body of POST /enquiries/{id}/status. ADMITTED is never sent: an admission does that. */
export interface StatusRequest {
  status: EnquiryStatus
  /** Needed when `status` is LOST. */
  reason?: string
}

/** The answer of GET /enquiries/{id}/prefill: what the New admission form can copy. */
export interface EnquiryPrefill {
  enquiryId: number
  parentName: string
  /** The whole number. */
  phone: string
  relation: EnquiryRelation
  village: string
  /** Null when the child's name was not asked. */
  childName: string | null
  className: ClassName
}

export type EnquiryErrorCode = 'ENQUIRY_EXISTS' | 'BAD_STAGE'
