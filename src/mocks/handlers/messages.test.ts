import { api, setToken } from '@/api/client'
import type { BusDetailAnswer } from '@/features/busStatus/types'
import type { MessagePage, MessageSummary } from '@/features/messages/types'

function loginAs(userId: number): void {
  setToken(`mock-token-${userId}`)
}
const OWNER = 1
const TRANSPORT = 3
const ADMISSIONS = 4

describe('mock messages: the morning of 7 October 2026', () => {
  it('lists today newest first, 25 to a page, with the phone hidden', async () => {
    loginAs(OWNER)
    const page = await api<MessagePage>('GET', '/messages')
    expect(page.date).toBe('2026-10-07')
    expect(page.items).toHaveLength(25)
    expect(page.pageSize).toBe(25)
    expect(page.total).toBeGreaterThan(100)
    const times = page.items.map((m) => m.createdAt)
    expect(times).toEqual([...times].sort().reverse())
    for (const m of page.items) expect(m.phone).toMatch(/^\+91X{6}\d{4}$/)
    const page2 = await api<MessagePage>('GET', '/messages?page=2')
    expect(page2.page).toBe(2)
    expect(page2.items[0]?.id).not.toBe(page.items[0]?.id)
  })

  it('counts the day: sent, waiting, failed, and no test rows', async () => {
    loginAs(OWNER)
    const sum = await api<MessageSummary>('GET', '/messages/summary')
    expect(sum.date).toBe('2026-10-07')
    expect(sum.failed).toBe(3)
    expect(sum.queued).toBe(2)
    expect(sum.testOnly).toBe(0)
    const all = await api<MessagePage>('GET', '/messages')
    expect(sum.sent + sum.queued + sum.failed).toBe(all.total)
  })

  it('filters by status and gives the reason of a failed message', async () => {
    loginAs(OWNER)
    const failed = await api<MessagePage>('GET', '/messages?status=FAILED')
    expect(failed.total).toBe(3)
    expect(failed.items.every((m) => m.status === 'FAILED' && m.error)).toBe(true)
    expect(failed.items.every((m) => m.sentAt === null)).toBe(true)
  })

  it('searches a child by name and by student id', async () => {
    loginAs(OWNER)
    const mohit = await api<MessagePage>('GET', '/messages?q=mohit')
    expect(mohit.total).toBe(1)
    expect(mohit.items[0]).toMatchObject({
      studentName: 'Mohit',
      event: 'BOARDED_MORNING',
      status: 'SENT',
      sentAt: '2026-10-07T07:26:00+05:30',
    })
    const byId = await api<MessagePage>('GET', `/messages?studentId=${mohit.items[0]?.studentId}`)
    expect(byId.total).toBe(1)
  })

  it('follows the class rule: no morning message for Class 9, none at all for Class 11', async () => {
    loginAs(OWNER)
    const kirti = await api<MessagePage>('GET', '/messages?q=kirti')
    const deepak = await api<MessagePage>('GET', '/messages?q=deepak')
    expect(kirti.total).toBe(0)
    expect(deepak.total).toBe(0)
  })

  it('has test-only rows on the day before', async () => {
    loginAs(OWNER)
    const sum = await api<MessageSummary>('GET', '/messages/summary?date=2026-10-06')
    expect(sum.testOnly).toBeGreaterThan(0)
    expect(sum.sent).toBe(0)
    const page = await api<MessagePage>('GET', '/messages?date=2026-10-06')
    expect(page.items.every((m) => m.status === 'TEST_ONLY')).toBe(true)
  })

  it('answers an empty day and refuses a bad date or status', async () => {
    loginAs(OWNER)
    expect((await api<MessagePage>('GET', '/messages?date=2026-01-01')).total).toBe(0)
    await expect(api('GET', '/messages?date=yesterday')).rejects.toMatchObject({ status: 400 })
    await expect(api('GET', '/messages?status=MAYBE')).rejects.toMatchObject({ status: 400 })
  })

  it('is open to the transport in-charge and closed to the admissions desk', async () => {
    loginAs(TRANSPORT)
    expect((await api<MessagePage>('GET', '/messages')).total).toBeGreaterThan(0)
    loginAs(ADMISSIONS)
    await expect(api('GET', '/messages')).rejects.toMatchObject({ status: 403 })
    await expect(api('GET', '/messages/summary')).rejects.toMatchObject({ status: 403 })
  })

  it('gives One bus the SMS state of the design for Route 4', async () => {
    loginAs(OWNER)
    const bus = await api<BusDetailAnswer>('GET', '/bus-status/routes/4')
    const sms = (name: string) => bus.children.find((c) => c.name === name)?.sms
    expect(sms('Mohit')).toEqual({ state: 'SENT', sentAt: '2026-10-07T07:26:00+05:30' })
    expect(sms('Tanvi')).toEqual({ state: 'SENT', sentAt: '2026-10-07T07:43:00+05:30' })
    expect(sms('Kirti')).toEqual({ state: 'NONE_THIS_EVENT', sentAt: null })
    expect(sms('Deepak')).toEqual({ state: 'NO_SMS_CLASS', sentAt: null })
    expect(sms('Pooja')).toEqual({ state: 'NONE', sentAt: null })
    expect(sms('Aman')).toEqual({ state: 'NONE', sentAt: null })
  })
})
