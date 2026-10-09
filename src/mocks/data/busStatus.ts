import type { RouteState, StopState } from '@/features/busStatus/types'

// All names and places are made up. The morning picture is the one in Main.dc.html at 7:48 am.

export interface SpecStop {
  name: string
  due: string
  /** Set for a stop that is done. */
  tappedAt?: string
  state: StopState
  late?: boolean
}

export interface RouteSpec {
  routeId: number
  state: RouteState
  lateMinutes: number
  startsAt: string | null
  boarded: number
  absent: number
  total: number
  stops: SpecStop[]
  school: { due: string; reachedAt: string | null }
}

const done = (name: string, due: string, tappedAt: string, late = false): SpecStop => ({
  name,
  due,
  tappedAt,
  state: 'DONE',
  ...(late ? { late: true } : {}),
})
const next = (name: string, due: string): SpecStop => ({ name, due, state: 'NEXT' })
const later = (name: string, due: string): SpecStop => ({ name, due, state: 'LATER' })

/** The nine rows of Main.dc.html. Totals: 118 of 255 boarded, 9 absent. */
export const morningSpecs: RouteSpec[] = [
  {
    routeId: 1,
    state: 'ON_THE_WAY',
    lateMinutes: 0,
    startsAt: null,
    boarded: 14,
    absent: 1,
    total: 24,
    stops: [
      done('Lalauda', '07:20', '07:21'),
      done('Dangra', '07:30', '07:30'),
      done('Dharsul', '07:43', '07:44'),
      next('Kulan', '07:52'),
      later('Tohana town', '08:00'),
    ],
    school: { due: '08:10', reachedAt: null },
  },
  {
    routeId: 2,
    state: 'REACHED_SCHOOL',
    lateMinutes: 0,
    startsAt: null,
    boarded: 25,
    absent: 2,
    total: 27,
    stops: [
      done('Chander Kalan', '07:05', '07:06'),
      done('Nangla', '07:15', '07:15'),
      done('Indachhoi', '07:25', '07:25'),
      done('Kanheri', '07:36', '07:37'),
    ],
    school: { due: '08:10', reachedAt: '07:46' },
  },
  {
    routeId: 3,
    state: 'NO_TAPS',
    lateMinutes: 33,
    startsAt: null,
    boarded: 0,
    absent: 0,
    total: 22,
    stops: [
      next('Pirthala', '07:15'),
      later('Diwana', '07:24'),
      later('Gajuwala', '07:33'),
      later('Balianwala', '07:44'),
      later('Tohana town', '07:55'),
    ],
    school: { due: '08:10', reachedAt: null },
  },
  {
    routeId: 4,
    state: 'ON_THE_WAY',
    lateMinutes: 0,
    startsAt: null,
    boarded: 11,
    absent: 1,
    total: 19,
    stops: [
      done('Sadhanwas', '07:25', '07:26'),
      done('Jakhal', '07:40', '07:42'),
      next('Kanheri', '07:55'),
      later('Tohana town', '08:02'),
    ],
    school: { due: '08:10', reachedAt: null },
  },
  {
    routeId: 5,
    state: 'LATE',
    lateMinutes: 16,
    startsAt: null,
    boarded: 8,
    absent: 0,
    total: 26,
    stops: [
      done('Akanwali', '07:20', '07:25'),
      done('Samain', '07:24', '07:40', true),
      next('Jamalpur', '07:34'),
      later('Rattakhera', '07:42'),
      later('Hindalwala', '07:50'),
      later('Kanheri', '08:00'),
    ],
    school: { due: '08:10', reachedAt: null },
  },
  {
    routeId: 6,
    state: 'ON_THE_WAY',
    lateMinutes: 0,
    startsAt: null,
    boarded: 15,
    absent: 2,
    total: 21,
    stops: [
      done('Dulat', '07:21', '07:22'),
      done('Thuian', '07:33', '07:33'),
      done('Hansawala', '07:44', '07:45'),
      next('Tohana town', '07:56'),
    ],
    school: { due: '08:10', reachedAt: null },
  },
  {
    routeId: 7,
    state: 'REACHED_SCHOOL',
    lateMinutes: 0,
    startsAt: null,
    boarded: 23,
    absent: 2,
    total: 25,
    stops: [
      done('Bhimewala', '06:55', '06:56'),
      done('Karandi', '07:05', '07:05'),
      done('Meond', '07:13', '07:13'),
      done('Shakkarpura', '07:21', '07:22'),
      done('Kanheri', '07:30', '07:31'),
    ],
    school: { due: '08:10', reachedAt: '07:41' },
  },
  {
    routeId: 8,
    state: 'ON_THE_WAY',
    lateMinutes: 0,
    startsAt: null,
    boarded: 22,
    absent: 1,
    total: 46,
    stops: [
      done('Kulan', '07:15', '07:16'),
      done('Nathuwal', '07:27', '07:27'),
      done('Laluwal', '07:42', '07:43'),
      next('Chandpura', '07:52'),
      later('Tohana town', '08:00'),
      later('Kanheri', '08:05'),
    ],
    school: { due: '08:10', reachedAt: null },
  },
  {
    routeId: 9,
    state: 'NOT_STARTED',
    lateMinutes: 0,
    startsAt: '07:50',
    boarded: 0,
    absent: 0,
    total: 45,
    stops: [
      next('Bus Stand', '07:50'),
      later('Railway Road', '07:56'),
      later('Model Town', '08:02'),
      later('Chandigarh Road', '08:08'),
      later('Kanheri', '08:14'),
    ],
    school: { due: '08:20', reachedAt: null },
  },
]

interface EveningPart {
  routeId: number
  /** How many stops the bus has finished, counted from the first. */
  stopsDone: number
  state: RouteState
  lateMinutes: number
  startsAt: string | null
  boarded: number
  absent: number
}

/** Evening drop, made up: some buses are still boarding, some are on the way, one child is missing. */
export const eveningParts: EveningPart[] = [
  {
    routeId: 1,
    stopsDone: 5,
    state: 'DONE',
    lateMinutes: 0,
    startsAt: null,
    boarded: 23,
    absent: 1,
  },
  {
    routeId: 2,
    stopsDone: 4,
    state: 'DONE',
    lateMinutes: 0,
    startsAt: null,
    boarded: 25,
    absent: 2,
  },
  {
    routeId: 3,
    stopsDone: 2,
    state: 'ON_THE_WAY',
    lateMinutes: 0,
    startsAt: null,
    boarded: 21,
    absent: 1,
  },
  {
    routeId: 4,
    stopsDone: 1,
    state: 'ON_THE_WAY',
    lateMinutes: 0,
    startsAt: null,
    boarded: 17,
    absent: 2,
  },
  {
    routeId: 5,
    stopsDone: 0,
    state: 'NOT_STARTED',
    lateMinutes: 0,
    startsAt: '15:20',
    boarded: 12,
    absent: 1,
  },
  {
    routeId: 6,
    stopsDone: 2,
    state: 'LATE',
    lateMinutes: 9,
    startsAt: null,
    boarded: 19,
    absent: 1,
  },
  {
    routeId: 7,
    stopsDone: 0,
    state: 'NOT_STARTED',
    lateMinutes: 0,
    startsAt: '15:20',
    boarded: 10,
    absent: 2,
  },
  {
    routeId: 8,
    stopsDone: 3,
    state: 'ON_THE_WAY',
    lateMinutes: 0,
    startsAt: null,
    boarded: 45,
    absent: 1,
  },
  {
    routeId: 9,
    stopsDone: 0,
    state: 'NOT_STARTED',
    lateMinutes: 0,
    startsAt: '15:25',
    boarded: 30,
    absent: 0,
  },
]

/** The 19 children of Route 4 in BusDetail.dc.html (morning). */
export interface Route4Child {
  name: string
  className: string
  stop: string
  /** A time like "07:26", or "ABSENT", or "WAITING". */
  morning: string
}

export const route4Children: Route4Child[] = [
  { name: 'Mohit', className: '5 A', stop: 'Sadhanwas', morning: '07:26' },
  { name: 'Anjali', className: '2 A', stop: 'Sadhanwas', morning: '07:26' },
  { name: 'Sahil', className: '7 B', stop: 'Sadhanwas', morning: '07:26' },
  { name: 'Kirti', className: '9 A', stop: 'Sadhanwas', morning: '07:27' },
  { name: 'Deepak', className: '11 A', stop: 'Sadhanwas', morning: '07:27' },
  { name: 'Aryan', className: '3 B', stop: 'Jakhal', morning: '07:42' },
  { name: 'Siya', className: '11 B', stop: 'Jakhal', morning: '07:42' },
  { name: 'Manpreet', className: '6 A', stop: 'Jakhal', morning: '07:42' },
  { name: 'Tanvi', className: 'UKG', stop: 'Jakhal', morning: '07:43' },
  { name: 'Harsh', className: '4 A', stop: 'Jakhal', morning: '07:43' },
  { name: 'Nikhil', className: '8 B', stop: 'Jakhal', morning: '07:43' },
  { name: 'Pooja', className: '1 A', stop: 'Jakhal', morning: 'ABSENT' },
  { name: 'Yash', className: 'LKG', stop: 'Kanheri', morning: 'WAITING' },
  { name: 'Simran', className: '5 B', stop: 'Kanheri', morning: 'WAITING' },
  { name: 'Rohit', className: '10 A', stop: 'Kanheri', morning: 'WAITING' },
  { name: 'Neha', className: '3 A', stop: 'Kanheri', morning: 'WAITING' },
  { name: 'Vivek', className: '7 A', stop: 'Tohana town', morning: 'WAITING' },
  { name: 'Riya', className: 'Nursery', stop: 'Tohana town', morning: 'WAITING' },
  { name: 'Aman', className: '12 A', stop: 'Tohana town', morning: 'WAITING' },
]

/** Names for the children of the other routes. Pairs are made up from these two lists. */
export const firstNames = [
  'Aarav',
  'Diya',
  'Kabir',
  'Ishita',
  'Rudra',
  'Mira',
  'Veer',
  'Tara',
  'Dev',
  'Naina',
  'Arjun',
  'Kavya',
  'Yuvraj',
  'Sana',
  'Reyansh',
  'Anaya',
  'Lakshya',
  'Pari',
  'Samar',
  'Ria',
]
export const lastNames = ['Kumar', 'Devi', 'Singh', 'Rani', 'Lal', 'Kaur', 'Chand', 'Bai']
export const classNames = [
  'Nursery',
  'LKG',
  'UKG',
  '1 A',
  '2 B',
  '3 A',
  '4 B',
  '5 A',
  '6 A',
  '7 B',
  '8 A',
  '9 A',
  '10 B',
]
