import type {
  Enquiry,
  EnquiryFilters,
  EnquiryPrefill,
  EnquiryRequest,
  EnquiryRow,
  EnquiryStatus,
  EnquirySummary,
  FollowUp,
} from '@/features/enquiries/types'
import { enquiryRelations, enquirySources, enquiryStatuses } from '@/features/enquiries/types'
import { classNames } from '@/features/students/types'
import type { MockEnquiry, MockFollowUp } from './data/enquiries'
import { db } from './db'
import { MOCK_TODAY } from './now'
import { maskStudentPhone, tenDigits } from './studentLogic'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** The three stages where a parent still has to be called. Admitted and Lost are closed. */
export function isOpen(status: EnquiryStatus): boolean {
  return status !== 'ADMITTED' && status !== 'LOST'
}

/** The stage rules. The web app only shows the buttons the server lists. */
const moves: Record<EnquiryStatus, EnquiryStatus[]> = {
  NEW: ['CONTACTED', 'VISITED', 'LOST'],
  CONTACTED: ['VISITED', 'APPLIED', 'LOST'],
  VISITED: ['APPLIED', 'LOST'],
  APPLIED: ['LOST'],
  ADMITTED: [],
  LOST: ['NEW'],
}

export function nextStagesOf(status: EnquiryStatus): EnquiryStatus[] {
  return moves[status]
}

/** Overdue is decided against the fixed day of the mock, 7 October 2026. */
export function isOverdue(e: Pick<MockEnquiry, 'status' | 'nextStepDate'>): boolean {
  return isOpen(e.status) && e.nextStepDate !== null && e.nextStepDate < MOCK_TODAY
}

export function enquiryById(id: unknown): MockEnquiry | undefined {
  return db.enquiries.find((e) => e.id === Number(id))
}

export function toRow(e: MockEnquiry): EnquiryRow {
  return {
    id: e.id,
    createdOn: e.createdOn,
    parentName: e.parentName,
    phone: maskStudentPhone(e.phone),
    village: e.village,
    className: e.className,
    source: e.source,
    status: e.status,
    nextStepDate: e.nextStepDate,
    overdue: isOverdue(e),
    lostReason: e.lostReason,
  }
}

function toFollowUp(f: MockFollowUp): FollowUp {
  return { id: f.id, at: f.at, note: f.note, by: f.by, nextDate: f.nextDate }
}

export function toEnquiry(e: MockEnquiry): Enquiry {
  return {
    id: e.id,
    createdOn: e.createdOn,
    parentName: e.parentName,
    phone: e.phone,
    relation: e.relation,
    village: e.village,
    childName: e.childName,
    className: e.className,
    childAge: e.childAge,
    currentSchool: e.currentSchool,
    source: e.source,
    referredBy: e.referredBy,
    nextStepDate: e.nextStepDate,
    overdue: isOverdue(e),
    needsBus: e.needsBus,
    note: e.note,
    status: e.status,
    lostReason: e.lostReason,
    studentId: e.studentId,
    nextStages: nextStagesOf(e.status),
    // Newest first. The ids only go up.
    followUps: [...e.followUps].sort((a, b) => b.id - a.id).map(toFollowUp),
  }
}

export function toPrefill(e: MockEnquiry): EnquiryPrefill {
  return {
    enquiryId: e.id,
    parentName: e.parentName,
    phone: e.phone,
    relation: e.relation,
    village: e.village,
    childName: e.childName,
    className: e.className,
  }
}

export function summary(): EnquirySummary {
  const byStatus = Object.fromEntries(enquiryStatuses.map((s) => [s, 0])) as Record<
    EnquiryStatus,
    number
  >
  for (const e of db.enquiries) byStatus[e.status] += 1
  const total = db.enquiries.length
  return {
    total,
    byStatus,
    overdue: db.enquiries.filter(isOverdue).length,
    admittedPercent: total === 0 ? 0 : Math.round((byStatus.ADMITTED / total) * 100),
  }
}

/** Newest first. Parent name or any part of the phone digits match `q`. */
export function filterEnquiries(filters: Omit<EnquiryFilters, 'page'>): MockEnquiry[] {
  const q = filters.q.trim().toLowerCase()
  const digits = q.replace(/\D/g, '')
  return db.enquiries
    .filter((e) => !filters.status || e.status === filters.status)
    .filter((e) => !filters.overdue || isOverdue(e))
    .filter((e) => !filters.village || e.village === filters.village)
    .filter((e) => !filters.source || e.source === filters.source)
    .filter(
      (e) =>
        !q || e.parentName.toLowerCase().includes(q) || (digits !== '' && e.phone.includes(digits)),
    )
    .sort((a, b) => b.createdOn.localeCompare(a.createdOn) || b.id - a.id)
}

export function allVillages(): string[] {
  return [...new Set(db.enquiries.map((e) => e.village))].sort((a, b) => a.localeCompare(b))
}

/** Another open enquiry with the same phone number. Used for ENQUIRY_EXISTS. */
export function openEnquiryWithPhone(phone: string, exceptId?: number): MockEnquiry | undefined {
  return db.enquiries.find((e) => e.id !== exceptId && isOpen(e.status) && e.phone === phone)
}

/** The checks of POST and PUT. Returns the field errors; empty means good. */
export function checkEnquiry(
  body: Partial<EnquiryRequest>,
  { callBackRequired }: { callBackRequired: boolean },
): Record<string, string> {
  const fields: Record<string, string> = {}
  if (!body.parentName?.trim()) fields.parentName = "Enter the parent's name."
  if (!tenDigits(body.phone ?? '')) fields.phone = 'Enter a 10-digit mobile number.'
  if (!body.relation || !enquiryRelations.includes(body.relation)) fields.relation = 'Pick one.'
  if (!body.village?.trim()) fields.village = 'Enter the village or locality.'
  if (!classNames.includes(body.className as (typeof classNames)[number]))
    fields.className = 'Pick a class.'
  if (!body.source || !enquirySources.includes(body.source)) fields.source = 'Pick how they heard.'
  else if (body.source === 'REFERRAL' && !body.referredBy?.trim())
    fields.referredBy = 'Enter the name of the parent who referred them.'
  if (body.nextStepDate ? !ISO_DATE.test(body.nextStepDate) : callBackRequired)
    fields.nextStepDate = 'Enter the date to call back.'
  return fields
}

/** Copies the checked body onto an enquiry (new or old). */
export function applyEnquiryBody(e: MockEnquiry, body: EnquiryRequest): void {
  const text = (v: string | undefined) => v?.trim() || null
  e.parentName = body.parentName.trim()
  e.phone = tenDigits(body.phone) ?? e.phone
  e.relation = body.relation
  e.village = body.village.trim()
  e.childName = text(body.childName)
  e.className = body.className
  e.childAge = text(body.childAge)
  e.currentSchool = text(body.currentSchool)
  e.source = body.source
  e.referredBy = body.source === 'REFERRAL' ? text(body.referredBy) : null
  if (isOpen(e.status)) e.nextStepDate = body.nextStepDate || e.nextStepDate
  e.needsBus = body.needsBus ?? null
  e.note = text(body.note)
}

/** Called by POST /admissions: the enquiry becomes Admitted and points to the new student. */
export function markAdmitted(e: MockEnquiry, studentId: number): void {
  e.status = 'ADMITTED'
  e.studentId = studentId
  e.nextStepDate = null
  e.lostReason = null
}
