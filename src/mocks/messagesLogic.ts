import type { BusChildRow } from '@/features/busStatus/types'
import type {
  Message,
  MessageEvent,
  MessageFilters,
  MessageSummary,
} from '@/features/messages/types'
import { formatDayClock } from '@/lib/format'
import { morningSpecs } from './data/busStatus'
import { TEST_DAY, testDayRows } from './data/messages'
import { detailAnswer } from './busStatusLogic'
import { eventOrder, smsRule, statusOf } from './messageRules'
import { MOCK_TODAY } from './now'

/** Hindi texts. The time is the time of the tap, for example "7:26". */
function hindiText(name: string, event: MessageEvent, hhmm: string): string {
  const time = formatDayClock(hhmm).replace(' pm', '')
  switch (event) {
    case 'BOARDED_MORNING':
      return `${name} सुबह ${time} बजे स्कूल बस में चढ़ गए हैं।`
    case 'REACHED_SCHOOL':
      return `${name} सुबह ${time} बजे स्कूल पहुँच गए हैं।`
    case 'BOARDED_EVENING':
      return `${name} दोपहर ${time} बजे घर के लिए बस में चढ़ गए हैं।`
    case 'REACHED_HOME':
      return `${name} शाम ${time} बजे अपने स्टॉप पर पहुँच गए हैं।`
  }
}

/** The phone comes hidden, like the real server sends it. Four digits made from the child id. */
function hiddenPhone(studentId: number): string {
  return `+91XXXXXX${String((studentId * 7919) % 10000).padStart(4, '0')}`
}

function clockOf(iso: string): string {
  return iso.slice(11, 16)
}

function morningMessages(): Message[] {
  const out: Message[] = []
  for (const spec of morningSpecs) {
    const answer = detailAnswer(spec.routeId, 'MORNING')
    if (!answer) continue
    for (const child of answer.children) out.push(...messagesOfChild(child))
  }
  return out
}

function messagesOfChild(child: BusChildRow): Message[] {
  const rows: Message[] = []
  for (const { event, key } of eventOrder) {
    const tap = child.events[key]
    if (tap.status !== 'DONE' || !tap.at) continue
    if (smsRule(child.className, event) !== 'ALLOWED') continue
    const { status, error } = statusOf(child.studentId, event)
    rows.push({
      id: 0,
      studentId: child.studentId,
      studentName: child.name,
      phone: hiddenPhone(child.studentId),
      event,
      text: hindiText(child.name, event, clockOf(tap.at)),
      status,
      createdAt: tap.at,
      sentAt: status === 'SENT' ? tap.at : null,
      error,
    })
  }
  return rows
}

function testDayMessages(): Message[] {
  return testDayRows.map((row) => {
    const createdAt = `${TEST_DAY}T${row.at}:00+05:30`
    return {
      id: 0,
      studentId: row.studentId,
      studentName: row.name,
      phone: hiddenPhone(row.studentId),
      event: row.event,
      text: hindiText(row.name, row.event, row.at),
      status: 'TEST_ONLY' as const,
      createdAt,
      sentAt: null,
      error: null,
    }
  })
}

/** Every message of the sample days, newest first. Ids are 1, 2, 3 … in that order. */
function allMessages(): Message[] {
  const sorted = [...morningMessages(), ...testDayMessages()].sort(
    (a, b) => b.createdAt.localeCompare(a.createdAt) || a.studentName.localeCompare(b.studentName),
  )
  return sorted.map((m, index) => ({ ...m, id: index + 1 }))
}

function dayOf(m: Message): string {
  return m.createdAt.slice(0, 10)
}

/** The messages of one day. Without a date: today. */
export function messagesOfDay(date: string): Message[] {
  return allMessages().filter((m) => dayOf(m) === date)
}

export function todayOrDate(date: string | null): string {
  return date || MOCK_TODAY
}

export function filterMessages(
  date: string,
  filters: Pick<MessageFilters, 'status' | 'q'> & { studentId: number | null; phone: string },
): Message[] {
  const q = filters.q.trim().toLowerCase()
  const digits = filters.phone.replace(/\D/g, '')
  return messagesOfDay(date)
    .filter((m) => !filters.status || m.status === filters.status)
    .filter((m) => filters.studentId === null || m.studentId === filters.studentId)
    .filter((m) => !q || m.studentName.toLowerCase().includes(q))
    .filter((m) => !digits || m.phone.replace(/\D/g, '').includes(digits))
}

export function summaryOfDay(date: string): MessageSummary {
  const rows = messagesOfDay(date)
  const count = (status: Message['status']) => rows.filter((m) => m.status === status).length
  return {
    date,
    queued: count('QUEUED'),
    sent: count('SENT'),
    failed: count('FAILED'),
    testOnly: count('TEST_ONLY'),
  }
}
