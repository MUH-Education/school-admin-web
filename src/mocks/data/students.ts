import type { ClassName, Gender, Occupation, Relation } from '@/features/students/types'
import { sampleRoutes } from './fleet'

// All names and numbers are made up.

export interface MockStudent {
  id: number
  admissionNo: string
  name: string
  dateOfBirth: string
  gender: Gender
  className: ClassName
  section: string | null
  admissionDate: string
  village: string
  address: string | null
  fatherOccupation: Occupation | null
  hasPhoto: boolean
  active: boolean
  leftOn: string | null
}

/** One phone number linked to one child. Brothers and sisters have a row each, with the same number. */
export interface MockGuardian {
  id: number
  studentId: number
  name: string
  relation: Relation
  /** Full number, ten digits. The server shows it as "98XXX XX340". */
  phone: string
  receivesSms: boolean
}

export interface MockEnrolment {
  id: number
  studentId: number
  usesBus: boolean
  routeId: number | null
  stopId: number | null
  fromDate: string
  toDate: string | null
  busFee: number | null
}

export interface MockHistory {
  id: number
  studentId: number
  at: string
  text: string
  by: string
}

/** 16 x 16 pixel PNG, used as the one sample photo. */
export const samplePhotoBase64 =
  'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAO0lEQVR4nGOQzeuGo8fvPsMRLnEGklQDuQwkqYZqIF41SANJqlE0EOl7BpJUQzWQFLIMJKkejQdaxQMA2D7tEG0e6n0AAAAASUVORK5CYII='

const FIRST_BOYS = [
  'Aarav',
  'Vivaan',
  'Arjun',
  'Krish',
  'Lakshya',
  'Yash',
  'Harsh',
  'Dev',
  'Kabir',
  'Nitin',
  'Pranav',
  'Sahil',
  'Tanishq',
]
const FIRST_GIRLS = [
  'Anaya',
  'Diya',
  'Isha',
  'Kiara',
  'Muskan',
  'Nisha',
  'Pooja',
  'Ritu',
  'Sneha',
  'Tanya',
  'Vani',
  'Zoya',
  'Priyanka',
]
const LAST_NAMES = [
  'Beniwal',
  'Dalal',
  'Godara',
  'Sihag',
  'Saini',
  'Jangra',
  'Kadian',
  'Malik',
  'Nain',
  'Rathee',
  'Chauhan',
  'Verma',
  'Gupta',
  'Bansal',
  'Khatri',
]
const AFTER_SPECIAL: Occupation[] = [
  'FARMER_SMALL',
  'FARMER_LARGE',
  'SHOPKEEPER_TRADER',
  'GOVERNMENT',
  'DEFENCE',
  'PRIVATE_JOB',
  'LABOUR',
  'PROFESSIONAL',
  'ABROAD',
  'OTHER',
]
const NO_BUS_VILLAGES = ['Tohana town', 'Tohana town', 'Model Town', 'Bhuna', 'Ratia']
const FATHER_FIRST = [
  'Rakesh',
  'Sunil',
  'Mahipal',
  'Ramesh',
  'Satbir',
  'Anil',
  'Jagbir',
  'Dinesh',
  'Ravinder',
  'Vijay',
]
const MOTHER_FIRST = ['Sunita', 'Kavita', 'Rekha', 'Anju', 'Savita', 'Meena', 'Seema', 'Babita']

interface Seed {
  name: string
  gender: Gender
  className: ClassName
  section: string | null
  admissionNo: string
  admissionDate: string
  dateOfBirth: string
  village: string
  address: string | null
  occupation: Occupation
  /** Index of the route and of the stop on it; null: no bus. */
  bus: { route: number; stop: number } | null
  hasPhoto?: boolean
  guardians: { name: string; relation: Relation; phone: string; sms: boolean }[]
}

const routeStop = (route: number, stop: number) => ({ route, stop })

// The ten children of the Students design come first, in the order of the design.
const designSeeds: Seed[] = [
  {
    name: 'Ishaan Sharma',
    gender: 'BOY',
    className: 'Class 4',
    section: 'A',
    admissionNo: 'A-2026-118',
    admissionDate: '2026-04-01',
    dateOfBirth: '2017-03-12',
    village: 'Tohana town',
    address: 'Model Town',
    occupation: 'GOVERNMENT',
    bus: null,
    guardians: [
      { name: 'Sanjay Sharma', relation: 'FATHER', phone: '9812345340', sms: true },
      { name: 'Pooja Sharma', relation: 'MOTHER', phone: '9712345615', sms: true },
    ],
  },
  {
    name: 'Aryan Punia',
    gender: 'BOY',
    className: 'Class 3',
    section: 'B',
    admissionNo: 'A-2024-057',
    admissionDate: '2024-04-01',
    dateOfBirth: '2018-06-21',
    village: 'Jakhal',
    address: 'Near the canal, Jakhal',
    occupation: 'FARMER_LARGE',
    bus: routeStop(3, 1),
    hasPhoto: true,
    guardians: [{ name: 'Rajender Punia', relation: 'FATHER', phone: '9412345871', sms: true }],
  },
  {
    name: 'Siya Punia',
    gender: 'GIRL',
    className: 'Class 11',
    section: 'B',
    admissionNo: 'A-2019-012',
    admissionDate: '2019-04-01',
    dateOfBirth: '2010-01-30',
    village: 'Jakhal',
    address: 'Near the canal, Jakhal',
    occupation: 'FARMER_LARGE',
    bus: routeStop(3, 1),
    guardians: [{ name: 'Rajender Punia', relation: 'FATHER', phone: '9412345871', sms: true }],
  },
  {
    name: 'Mohit Nain',
    gender: 'BOY',
    className: 'Class 5',
    section: 'A',
    admissionNo: 'A-2022-034',
    admissionDate: '2022-04-01',
    dateOfBirth: '2016-09-04',
    village: 'Sadhanwas',
    address: null,
    occupation: 'FARMER_SMALL',
    bus: routeStop(3, 0),
    guardians: [{ name: 'Mahavir Nain', relation: 'FATHER', phone: '9712345209', sms: true }],
  },
  {
    name: 'Kirti Bansal',
    gender: 'GIRL',
    className: 'Class 9',
    section: 'A',
    admissionNo: 'A-2020-021',
    admissionDate: '2020-04-01',
    dateOfBirth: '2012-02-17',
    village: 'Sadhanwas',
    address: null,
    occupation: 'SHOPKEEPER_TRADER',
    bus: routeStop(3, 0),
    guardians: [
      { name: 'Vinod Bansal', relation: 'FATHER', phone: '9812345665', sms: true },
      { name: 'Rekha Bansal', relation: 'MOTHER', phone: '9812345666', sms: false },
    ],
  },
  {
    name: 'Rohit Kumar',
    gender: 'BOY',
    className: 'Class 10',
    section: 'A',
    admissionNo: 'A-2021-009',
    admissionDate: '2021-04-01',
    dateOfBirth: '2011-11-08',
    village: 'Kanheri',
    address: null,
    occupation: 'LABOUR',
    bus: routeStop(3, 2),
    guardians: [{ name: 'Suresh Kumar', relation: 'FATHER', phone: '9012345413', sms: true }],
  },
  {
    name: 'Tanvi Mehta',
    gender: 'GIRL',
    className: 'UKG',
    section: null,
    admissionNo: 'A-2025-102',
    admissionDate: '2025-04-01',
    dateOfBirth: '2021-05-19',
    village: 'Jakhal',
    address: null,
    occupation: 'PRIVATE_JOB',
    bus: routeStop(3, 1),
    guardians: [{ name: 'Naveen Mehta', relation: 'FATHER', phone: '9912345052', sms: true }],
  },
  {
    name: 'Riya Jangra',
    gender: 'GIRL',
    className: 'Nursery',
    section: null,
    admissionNo: 'A-2026-117',
    admissionDate: '2026-04-01',
    dateOfBirth: '2023-01-12',
    village: 'Tohana town',
    address: 'Bus stand road',
    occupation: 'PROFESSIONAL',
    bus: routeStop(3, 3),
    guardians: [{ name: 'Pawan Jangra', relation: 'FATHER', phone: '9812345790', sms: true }],
  },
  {
    name: 'Deepak Sihag',
    gender: 'BOY',
    className: 'Class 11',
    section: 'A',
    admissionNo: 'A-2018-004',
    admissionDate: '2018-04-01',
    dateOfBirth: '2010-07-25',
    village: 'Sadhanwas',
    address: null,
    occupation: 'DEFENCE',
    bus: routeStop(3, 0),
    guardians: [{ name: 'Hawa Singh Sihag', relation: 'FATHER', phone: '9412345338', sms: true }],
  },
  {
    name: 'Kavya Saini',
    gender: 'GIRL',
    className: 'Class 2',
    section: 'A',
    admissionNo: 'A-2025-088',
    admissionDate: '2025-04-01',
    dateOfBirth: '2019-03-03',
    village: 'Kanheri',
    address: null,
    occupation: 'OTHER',
    bus: null,
    guardians: [{ name: 'Rajesh Saini', relation: 'FATHER', phone: '9712345126', sms: true }],
  },
  // A second pair of brother and sister on Route 9 (one phone for both).
  {
    name: 'Naman Beniwal',
    gender: 'BOY',
    className: 'Class 6',
    section: 'A',
    admissionNo: 'A-2023-045',
    admissionDate: '2023-04-01',
    dateOfBirth: '2015-08-10',
    village: 'Lahli',
    address: null,
    occupation: 'FARMER_LARGE',
    bus: routeStop(8, 0),
    guardians: [
      { name: 'Mahender Beniwal', relation: 'FATHER', phone: '9416777101', sms: true },
      { name: 'Santosh Beniwal', relation: 'MOTHER', phone: '9416777102', sms: true },
    ],
  },
  {
    name: 'Pari Beniwal',
    gender: 'GIRL',
    className: 'LKG',
    section: null,
    admissionNo: 'A-2025-079',
    admissionDate: '2025-04-01',
    dateOfBirth: '2022-02-14',
    village: 'Lahli',
    address: null,
    occupation: 'FARMER_LARGE',
    bus: routeStop(8, 0),
    guardians: [
      { name: 'Mahender Beniwal', relation: 'FATHER', phone: '9416777101', sms: true },
      { name: 'Santosh Beniwal', relation: 'MOTHER', phone: '9416777102', sms: true },
    ],
  },
]

/** The last three digits of the numbers already taken, for example "118". */
const reservedSeq = new Set(designSeeds.map((s) => s.admissionNo.slice(-3)))

/** The next free admission number after the ones already taken, counting up from 1. */
function numberGenerator() {
  let seq = 0
  return () => {
    for (;;) {
      seq += 1
      const year = Math.min(2026, 2018 + Math.floor(seq / 14))
      const text = String(seq).padStart(3, '0')
      // Only even numbers: the gaps make the list look like a real school's.
      if (seq % 2 === 0 && !reservedSeq.has(text)) return { no: `A-${year}-${text}`, year }
    }
  }
}

function generatedSeeds(): Seed[] {
  const next = numberGenerator()
  const seeds: Seed[] = []
  for (let i = 0; i < 50; i++) {
    const route = i % 9
    const stops = sampleRoutes[route]?.stops ?? []
    const stopIndex = Math.floor(i / 9) % Math.max(stops.length, 1)
    const noBus = i % 8 === 5
    const girl = i % 2 === 1
    const { no, year } = next()
    const classIndex = Math.min(14, 2026 - year + (i % 3))
    const className = (
      [
        'Nursery',
        'LKG',
        'UKG',
        'Class 1',
        'Class 2',
        'Class 3',
        'Class 4',
        'Class 5',
        'Class 6',
        'Class 7',
        'Class 8',
        'Class 9',
        'Class 10',
        'Class 11',
        'Class 12',
      ] as const
    )[classIndex] as ClassName
    const first = (girl ? FIRST_GIRLS : FIRST_BOYS)[i % 13] ?? 'Aarav'
    const last = LAST_NAMES[(i * 4 + 3) % LAST_NAMES.length] ?? 'Dalal'
    const village = noBus
      ? (NO_BUS_VILLAGES[i % NO_BUS_VILLAGES.length] ?? 'Tohana town')
      : (stops[stopIndex]?.name ?? 'Tohana town')
    const phoneBase = 9400000000 + i * 7919
    const guardians: Seed['guardians'] = [
      {
        name: `${FATHER_FIRST[i % FATHER_FIRST.length]} ${last}`,
        relation: 'FATHER',
        phone: String(phoneBase),
        sms: true,
      },
    ]
    if (i % 3 !== 0) {
      guardians.push({
        name: `${MOTHER_FIRST[i % MOTHER_FIRST.length]} ${last}`,
        relation: 'MOTHER',
        phone: String(phoneBase + 1),
        sms: i % 4 !== 0,
      })
    }
    seeds.push({
      name: `${first} ${last}`,
      gender: girl ? 'GIRL' : 'BOY',
      className,
      section: classIndex <= 2 ? null : i % 2 === 0 ? 'A' : 'B',
      admissionNo: no,
      admissionDate: `${year}-04-01`,
      dateOfBirth: `${2023 - classIndex}-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 27) + 1).padStart(2, '0')}`,
      village,
      address: null,
      occupation: AFTER_SPECIAL[i % AFTER_SPECIAL.length] ?? 'OTHER',
      bus: noBus ? null : routeStop(route, stopIndex),
      guardians,
    })
  }
  return seeds
}

export interface StudentSample {
  students: MockStudent[]
  guardians: MockGuardian[]
  enrolments: MockEnrolment[]
  history: MockHistory[]
  lastStudentId: number
}

/** 62 children. Ishaan (no bus) is first. Aryan has a photo. Siya and Aryan share one phone. */
function build(): StudentSample {
  const seeds = [...designSeeds, ...generatedSeeds()]
  const students: MockStudent[] = []
  const guardians: MockGuardian[] = []
  const enrolments: MockEnrolment[] = []
  const history: MockHistory[] = []
  let guardianId = 0
  let enrolmentId = 0
  let historyId = 0

  seeds.forEach((seed, index) => {
    const id = index + 1
    students.push({
      id,
      admissionNo: seed.admissionNo,
      name: seed.name,
      dateOfBirth: seed.dateOfBirth,
      gender: seed.gender,
      className: seed.className,
      section: seed.section,
      admissionDate: seed.admissionDate,
      village: seed.village,
      address: seed.address,
      fatherOccupation: seed.occupation,
      hasPhoto: seed.hasPhoto ?? false,
      active: true,
      leftOn: null,
    })
    for (const g of seed.guardians) {
      guardians.push({
        id: ++guardianId,
        studentId: id,
        name: g.name,
        relation: g.relation,
        phone: g.phone,
        receivesSms: g.sms,
      })
    }
    const route = seed.bus ? sampleRoutes[seed.bus.route] : undefined
    const stop = seed.bus ? route?.stops[seed.bus.stop] : undefined
    enrolments.push({
      id: ++enrolmentId,
      studentId: id,
      usesBus: Boolean(route && stop),
      routeId: route?.id ?? null,
      stopId: stop?.id ?? null,
      fromDate: seed.admissionDate,
      toDate: null,
      busFee: route && stop ? 8800 : null,
    })
    history.push({
      id: ++historyId,
      studentId: id,
      at: `${seed.admissionDate}T10:30:00+05:30`,
      text: `Admitted to ${seed.className}, ${route && stop ? route.name : 'no bus'}`,
      by: 'Priya',
    })
  })

  // The two older lines of the StudentProfile design (Ishaan is student 1).
  history.push(
    {
      id: ++historyId,
      studentId: 1,
      at: '2026-06-03T11:05:00+05:30',
      text: "Mother's phone number added",
      by: 'Priya',
    },
    {
      id: ++historyId,
      studentId: 1,
      at: '2026-08-12T09:40:00+05:30',
      text: 'Section changed from B to A',
      by: 'Neelam',
    },
  )

  return { students, guardians, enrolments, history, lastStudentId: seeds.length }
}

export const sampleStudentData: StudentSample = build()
