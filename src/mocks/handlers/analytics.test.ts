import { api, apiBlob, setToken } from '@/api/client'
import { ApiError } from '@/api/errors'
import type {
  AnalyticsStudentPage,
  AnalyticsSummary,
  ClassCount,
  MonthCollection,
  OccupationPayment,
  VillageCount,
} from '@/features/analytics/types'

const OWNER = 1
const TRANSPORT = 3

function loginAs(userId: number): void {
  setToken(`mock-token-${userId}`)
}

const get = <T>(path: string, query = '') => api<T>('GET', `/analytics/${path}${query}`)

/** The six answers for one set of filters. */
async function everything(query: string) {
  const [summary, classes, villages, occupations, students] = await Promise.all([
    get<AnalyticsSummary>('summary', query),
    get<ClassCount[]>('students-by-class', query),
    get<VillageCount[]>('students-by-village', query),
    get<OccupationPayment[]>('payment-by-occupation', query),
    get<AnalyticsStudentPage>('students', query),
  ])
  return { summary, classes, villages, occupations, students }
}

const sum = (list: { count: number }[]) => list.reduce((total, x) => total + x.count, 0)

describe('mock analytics: 7 October 2026', () => {
  beforeEach(() => loginAs(OWNER))

  it('answers the permission check: the transport incharge gets 403', async () => {
    loginAs(TRANSPORT)
    await expect(get('summary')).rejects.toMatchObject({ status: 403 })
    await expect(get('students')).rejects.toBeInstanceOf(ApiError)
  })

  it('counts the same students in the tiles, the class bars, the village list and the table', async () => {
    const queries = [
      '',
      '?village=Jakhal',
      '?feeStatus=DELAYED',
      '?village=Jakhal&feeStatus=DELAYED',
      '?className=UKG',
      '?bus=NO',
      '?bus=YES',
      '?routeId=4',
      '?occupation=FARMER_SMALL',
      '?sessionId=2',
      '?className=Class%205&bus=YES&occupation=FARMER_LARGE',
    ]
    for (const query of queries) {
      const a = await everything(query)
      const n = a.summary.students
      expect(sum(a.classes), query).toBe(n)
      expect(sum(a.villages), query).toBe(n)
      expect(a.students.total, query).toBe(n)
      expect(a.summary.usesBus).toBeLessThanOrEqual(n)
      expect(a.summary.allStudents).toBeGreaterThanOrEqual(n)
    }
  })

  it('really filters: a village or a fee status leaves fewer students', async () => {
    const all = await everything('')
    const jakhal = await everything('?village=Jakhal')
    expect(all.summary.students).toBe(all.summary.allStudents)
    expect(jakhal.summary.students).toBeGreaterThan(0)
    expect(jakhal.summary.students).toBeLessThan(all.summary.students)
    expect(jakhal.students.items.every((r) => r.village === 'Jakhal')).toBe(true)
    expect(jakhal.villages).toHaveLength(1)

    const late = await everything('?village=Jakhal&feeStatus=DELAYED')
    expect(late.students.total).toBeLessThan(jakhal.students.total)
    // Delayed in the worst of the two heads.
    expect(
      late.students.items.every((r) => r.schoolStatus === 'DELAYED' || r.busStatus === 'DELAYED'),
    ).toBe(true)
  })

  it('has all 15 classes, villages biggest first, and occupations that add up', async () => {
    const a = await everything('')
    expect(a.classes).toHaveLength(15)
    expect(a.classes[0]?.className).toBe('Nursery')
    expect(a.classes[14]?.className).toBe('Class 12')
    const counts = a.villages.map((v) => v.count)
    expect(counts).toEqual([...counts].sort((x, y) => y - x))
    // Students with a fee plan are counted once each in the occupation chart.
    const planned = a.occupations.reduce((t, o) => t + o.onTime + o.delayed + o.defaulted, 0)
    expect(planned).toBeLessThanOrEqual(a.summary.students)
    expect(planned).toBeGreaterThan(a.summary.students / 2)
  })

  it('gives percentages between 0 and 100, month by month from April', async () => {
    const months = await get<MonthCollection[]>('fee-collection-by-month')
    expect(months[0]?.month).toBe('2026-04')
    expect(months.at(-1)?.month).toBe('2026-10')
    for (const m of months) {
      for (const p of [m.schoolPercent, m.busPercent]) {
        if (p !== null) expect(p).toBeGreaterThanOrEqual(0)
        if (p !== null) expect(p).toBeLessThanOrEqual(100)
      }
    }
    // Another session has no fees yet and a session that has not started has no months.
    expect(await get<MonthCollection[]>('fee-collection-by-month', '?sessionId=2')).toEqual([])
  })

  it('pages the table 25 at a time and sorts it', async () => {
    const first = await get<AnalyticsStudentPage>('students')
    expect(first.pageSize).toBe(25)
    expect(first.items).toHaveLength(25)
    // The default is the biggest debt first.
    const pending = first.items.map((r) => r.pending)
    expect(pending).toEqual([...pending].sort((a, b) => b - a))

    const second = await get<AnalyticsStudentPage>('students', '?page=2')
    expect(second.page).toBe(2)
    expect(second.items[0]?.id).not.toBe(first.items[0]?.id)

    const byName = await get<AnalyticsStudentPage>('students', '?sort=name&dir=asc')
    const names = byName.items.map((r) => r.name)
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)))

    const byClass = await get<AnalyticsStudentPage>('students', '?sort=class&dir=asc')
    expect(byClass.items[0]?.className).toBe('Nursery')
  })

  it('sends a UTF-8 file with a byte order mark, for the filtered list', async () => {
    const blob = await apiBlob('/analytics/students.csv?village=Jakhal')
    const bytes = new Uint8Array(await blob.arrayBuffer())
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf])
    const text = new TextDecoder('utf-8', { ignoreBOM: true }).decode(bytes).slice(1)
    const lines = text.trimEnd().split('\r\n')
    expect(lines[0]).toBe(
      "Student,Class,Village,Father's occupation,Bus,School fee,Bus fee,Pending (Rs)",
    )
    const jakhal = await get<AnalyticsSummary>('summary', '?village=Jakhal')
    // One line per student, not per page.
    expect(lines).toHaveLength(jakhal.students + 1)
    expect(lines.slice(1).every((l) => l.includes('Jakhal'))).toBe(true)
  })
})
