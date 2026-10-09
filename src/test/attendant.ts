import { vi } from 'vitest'
import { saveManifest } from '@/attendant/tapStore'
import { refreshLocalState } from '@/attendant/localState'
import type { EventType, Manifest, ManifestChild, ServerAnswer } from '@/attendant/types'

export const DAY = '2026-10-07'
export const BALWAN = 5

export function child(
  studentId: number,
  name: string,
  taps: Partial<Record<EventType, ServerAnswer>> = {},
  className = '3 B',
): ManifestChild {
  return { studentId, name, className, taps }
}

export const done = (hhmm: string, date = DAY): ServerAnswer => ({
  outcome: 'DONE',
  occurredAt: `${date}T${hhmm}:00+05:30`,
})
export const absent = (hhmm: string, date = DAY): ServerAnswer => ({
  outcome: 'ABSENT',
  occurredAt: `${date}T${hhmm}:00+05:30`,
})

/**
 * A small Route 4 with English names (so the English / Hindi checks can tell data from labels).
 * Student ids are those of the mock server, so a test can send real taps.
 */
export function makeManifest(change: Partial<Manifest> = {}): Manifest {
  return {
    routeId: 4,
    routeName: 'Route 4',
    vehicle: 'Van 4',
    date: DAY,
    schoolStarts: '08:10',
    schoolEnds: '14:40',
    stops: [
      {
        id: 1,
        name: 'Sadhanwas',
        children: [
          child(400, 'Mohit', { BOARDED_MORNING: done('07:26') }, '5 A'),
          child(401, 'Anjali', { BOARDED_MORNING: done('07:26') }, '2 A'),
        ],
      },
      {
        id: 2,
        name: 'Jakhal',
        children: [
          child(405, 'Aryan', { BOARDED_MORNING: done('07:42') }),
          child(406, 'Siya', { BOARDED_MORNING: absent('07:43') }, '11 B'),
          child(407, 'Manpreet', {}, '6 A'),
        ],
      },
      {
        id: 3,
        name: 'Kanheri',
        children: [child(412, 'Yash', {}, 'LKG'), child(414, 'Rohit', {}, '10 A')],
      },
    ],
    ...change,
  }
}

/** Puts a manifest on the phone, as if it had been loaded with network. */
export async function seedManifest(manifest: Manifest = makeManifest()): Promise<Manifest> {
  await saveManifest(manifest)
  await refreshLocalState()
  return manifest
}

/** The phone says it has no network (or has it again). */
export function setOnline(online: boolean): void {
  vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(online)
}

/** Sets the phone clock to a time of the fixed day, for example at('07:42:10'). */
export function at(hhmmss: string, date = DAY): Date {
  const text = hhmmss.length === 5 ? `${hhmmss}:00` : hhmmss
  return new Date(`${date}T${text}+05:30`)
}

const eveningAnswer = { outcome: 'DONE' as const, occurredAt: `${DAY}T14:50:00+05:30` }
const morning = done('07:30', DAY)
const notGoing = { outcome: 'NOT_TRAVELLING' as const, occurredAt: `${DAY}T14:51:00+05:30` }

/** Everybody came in the morning; all but Manpreet boarded in the evening. */
export function eveningManifest(): Manifest {
  const both = (id: number, name: string, cls: string) =>
    child(id, name, { BOARDED_MORNING: morning, BOARDED_EVENING: eveningAnswer }, cls)
  return makeManifest({
    stops: [
      {
        id: 1,
        name: 'Sadhanwas',
        children: [both(400, 'Mohit', '5 A'), both(401, 'Anjali', '2 A')],
      },
      {
        id: 2,
        name: 'Jakhal',
        children: [
          both(405, 'Aryan', '3 B'),
          child(407, 'Manpreet', { BOARDED_MORNING: morning, BOARDED_EVENING: notGoing }, '6 A'),
        ],
      },
      { id: 3, name: 'Kanheri', children: [both(412, 'Yash', 'LKG'), both(414, 'Rohit', '10 A')] },
      { id: 4, name: 'Tohana town', children: [both(416, 'Vivek', '7 A')] },
    ],
  })
}
