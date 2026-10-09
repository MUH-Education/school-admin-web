import { formatDate, formatDayMonth, formatLongDate } from '@/lib/format'
import { paperShortLabels } from './labels'
import type { AttentionItem, PaperKind, Staff, VehicleDocument } from './types'

export type Level = 'ok' | 'soon' | 'ended'

export interface PapersSummary {
  level: Level
  /** "All valid", "Insurance ends 28 Oct" or "Fitness ended 30 Sep". */
  text: string
}

/** The worst problem among a vehicle's papers: ended first, then the one ending soonest. */
export function worstPaper(documents: VehicleDocument[]): PapersSummary {
  const bad = documents
    .filter((d) => d.status !== 'VALID')
    .sort((a, b) => a.daysLeft - b.daysLeft)[0]
  if (!bad) return { level: 'ok', text: 'All valid' }
  const verb = bad.status === 'ENDED' ? 'ended' : 'ends'
  return {
    level: bad.status === 'ENDED' ? 'ended' : 'soon',
    text: `${paperShortLabels[bad.kind]} ${verb} ${formatDayMonth(bad.validTill)}`,
  }
}

const itemNames: Record<PaperKind | 'LICENCE', string> = {
  FITNESS: 'fitness certificate',
  INSURANCE: 'insurance',
  PERMIT: 'permit',
  POLLUTION: 'pollution certificate',
  LICENCE: 'driving licence',
}

function inDays(daysLeft: number): string {
  if (daysLeft === 0) return 'today'
  return daysLeft === 1 ? 'in 1 day' : `in ${daysLeft} days`
}

export interface AttentionLine {
  subject: string
  level: 'soon' | 'ended'
  text: string
}

/** "fitness certificate ended on 30 September 2026. It should not ..." */
export function attentionLine(item: AttentionItem): AttentionLine {
  const name = itemNames[item.item]
  const date = formatLongDate(item.validTill)
  if (item.status === 'ENDED') {
    const rule =
      item.subjectType === 'VEHICLE'
        ? 'It should not carry children until this is renewed.'
        : 'They should not drive until this is renewed.'
    return { subject: item.subject, level: 'ended', text: `${name} ended on ${date}. ${rule}` }
  }
  return {
    subject: item.subject,
    level: 'soon',
    text: `${name} ends on ${date}, ${inDays(item.daysLeft)}.`,
  }
}

export interface LicenceSummary {
  level: Level
  text: string
}

/** Licence cell of the people table: "2 Nov 2026, in 26 days". */
export function licenceSummary(person: Staff): LicenceSummary {
  if (!person.licenceValidTill) return { level: 'ok', text: '—' }
  const date = formatDate(person.licenceValidTill)
  const days = person.licenceDaysLeft ?? 0
  if (person.licenceStatus === 'ENDED') return { level: 'ended', text: `${date}, ended` }
  if (person.licenceStatus === 'ENDING') return { level: 'soon', text: `${date}, ${inDays(days)}` }
  return { level: 'ok', text: date }
}
