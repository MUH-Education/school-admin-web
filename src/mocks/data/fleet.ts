import type {
  AssignmentReason,
  Duty,
  OwnedBy,
  PaperKind,
  VehicleType,
} from '@/features/vehicles/types'
import type { Settings } from '@/features/routes/types'

// All names, numbers and places are made up.

export interface MockVehicle {
  id: number
  name: string
  registrationNo: string
  vehicleType: VehicleType
  seats: number
  monthlyCost: number
  ownedBy: OwnedBy
  active: boolean
  papers: Record<PaperKind, string>
}

export interface MockStaff {
  id: number
  name: string
  type: Duty
  phone: string
  licenceNo: string | null
  licenceValidTill: string | null
  active: boolean
}

export interface MockAssignment {
  id: number
  vehicleId: number
  duty: Duty
  staffId: number
  fromDate: string
  toDate: string | null
  temporary: boolean
  reason: AssignmentReason
}

export interface MockStop {
  id: number
  name: string
  morningTime: string
  children: number
}

export interface MockRoute {
  id: number
  name: string
  vehicleId: number | null
  active: boolean
  stops: MockStop[]
}

const farPapers: Record<PaperKind, string> = {
  FITNESS: '2027-03-31',
  INSURANCE: '2027-06-15',
  PERMIT: '2028-01-20',
  POLLUTION: '2027-02-09',
}

const vehicleNames = [
  'Van 1',
  'Van 2',
  'Van 3',
  'Van 4',
  'Van 5',
  'Van 6',
  'Van 7',
  'Bus 8',
  'Bus 9',
]

export const sampleVehicles: MockVehicle[] = vehicleNames.map((name, index) => {
  const id = index + 1
  const isBus = id >= 8
  return {
    id,
    name,
    registrationNo: `HR 23 XX ${isBus ? 2100 + id : 1100 + id}`,
    vehicleType: isBus ? 'MID_BUS' : 'SMALL_VAN',
    seats: isBus ? 26 : 14,
    monthlyCost: 30300,
    ownedBy: 'SCHOOL',
    active: true,
    papers: {
      ...farPapers,
      // The two problems in the Vehicles and staff design.
      ...(id === 6 ? { INSURANCE: '2026-10-28' } : {}),
      ...(id === 9 ? { FITNESS: '2026-09-30' } : {}),
    },
  }
})

const driver = (
  id: number,
  name: string,
  licenceNo: string,
  licenceValidTill: string,
): MockStaff => ({
  id,
  name,
  type: 'DRIVER',
  phone: `+91987650${String(id).padStart(4, '0')}`,
  licenceNo,
  licenceValidTill,
  active: true,
})
const attendant = (id: number, name: string, active = true): MockStaff => ({
  id,
  name,
  type: 'ATTENDANT',
  phone: `+91987650${String(id).padStart(4, '0')}`,
  licenceNo: null,
  licenceValidTill: null,
  active,
})

/** 10 drivers (Surender is free) and 9 attendants make the 19 people. Kuldeep left in March. */
export const sampleStaff: MockStaff[] = [
  driver(1, 'Rajpal', 'HR23 2014 0000412', '2029-03-14'),
  driver(2, 'Mahavir', 'HR23 2012 0000233', '2028-05-02'),
  driver(3, 'Om Prakash', 'HR23 2013 0000318', '2029-09-19'),
  driver(4, 'Jagdish', 'HR23 2011 0000087', '2028-07-08'),
  driver(5, 'Sukhdev', 'HR23 2015 0000471', '2030-02-11'),
  driver(6, 'Baljeet', 'HR23 2010 0000129', '2027-12-05'),
  driver(7, 'Krishan', 'HR23 2016 0000530', '2026-11-02'),
  driver(8, 'Ranbir', 'HR23 2017 0000654', '2030-06-23'),
  driver(9, 'Dilbag', 'HR23 2009 0000046', '2028-03-30'),
  driver(10, 'Surender', 'HR23 2018 0000265', '2030-01-21'),
  attendant(21, 'Ramesh'),
  attendant(22, 'Suresh'),
  attendant(23, 'Mahender'),
  attendant(24, 'Balwan'),
  attendant(25, 'Kuldeep', false),
  attendant(26, 'Sunita'),
  attendant(27, 'Rajbir'),
  attendant(28, 'Kamla'),
  attendant(29, 'Satpal'),
  attendant(30, 'Dharampal'),
]

const drivers = [1, 2, 3, 4, 5, 6, 7, 8, 9]
const attendants = [21, 22, 23, 24, 26, 27, 28, 29, 30]

function build(): MockAssignment[] {
  const rows: MockAssignment[] = []
  let id = 1
  const add = (
    vehicleId: number,
    duty: Duty,
    staffId: number,
    fromDate: string,
    toDate: string | null,
    reason: AssignmentReason,
  ) => rows.push({ id: id++, vehicleId, duty, staffId, fromDate, toDate, temporary: false, reason })
  drivers.forEach((driverId, index) =>
    add(index + 1, 'DRIVER', driverId, '2026-04-01', null, 'OTHER'),
  )
  attendants.forEach((staffId, index) =>
    add(index + 1, 'ATTENDANT', staffId, '2026-04-01', null, 'OTHER'),
  )
  // Van 4 had other people before April (shown in "Who worked on this vehicle").
  add(4, 'DRIVER', 3, '2025-07-01', '2026-03-31', 'MOVED')
  add(4, 'ATTENDANT', 25, '2025-07-01', '2026-03-31', 'LEFT_SCHOOL')
  return rows
}
export const sampleAssignments: MockAssignment[] = build()

let stopId = 0
const stops = (list: [string, string, number][]): MockStop[] =>
  list.map(([name, morningTime, children]) => ({ id: ++stopId, name, morningTime, children }))

/** Children per route: 24, 27, 22, 19, 26, 21, 25, 46, 45 = 255. Route 4 is as in the designs. */
export const sampleRoutes: MockRoute[] = [
  {
    id: 1,
    name: 'Route 1',
    vehicleId: 1,
    active: true,
    stops: stops([
      ['Samain', '07:05', 8],
      ['Bhuna road', '07:22', 9],
      ['Dhand', '07:38', 7],
    ]),
  },
  {
    id: 2,
    name: 'Route 2',
    vehicleId: 2,
    active: true,
    stops: stops([
      ['Mundhal', '07:00', 9],
      ['Ratia crossing', '07:20', 10],
      ['Fatehabad road', '07:41', 8],
    ]),
  },
  {
    id: 3,
    name: 'Route 3',
    vehicleId: 3,
    active: true,
    stops: stops([
      ['Kheri', '07:10', 7],
      ['Gillan', '07:28', 8],
      ['Bandheri', '07:45', 7],
    ]),
  },
  {
    id: 4,
    name: 'Route 4',
    vehicleId: 4,
    active: true,
    stops: stops([
      ['Sadhanwas', '07:25', 5],
      ['Jakhal', '07:40', 7],
      ['Kanheri', '07:55', 4],
      ['Tohana town', '08:02', 3],
    ]),
  },
  {
    id: 5,
    name: 'Route 5',
    vehicleId: 5,
    active: true,
    stops: stops([
      ['Samain', '07:24', 9],
      ['Baijalpur', '07:36', 9],
      ['Dhamtan', '07:48', 8],
    ]),
  },
  {
    id: 6,
    name: 'Route 6',
    vehicleId: 6,
    active: true,
    stops: stops([
      ['Nagpur', '07:12', 7],
      ['Hasanpur', '07:30', 8],
      ['Siwan', '07:44', 6],
    ]),
  },
  {
    id: 7,
    name: 'Route 7',
    vehicleId: 7,
    active: true,
    stops: stops([
      ['Pirthla', '07:08', 9],
      ['Kalwan', '07:26', 8],
      ['Rajpura', '07:42', 8],
    ]),
  },
  {
    id: 8,
    name: 'Route 8',
    vehicleId: 8,
    active: true,
    stops: stops([
      ['Jhamri', '06:50', 12],
      ['Dhani', '07:10', 12],
      ['Ghasso', '07:30', 11],
      ['Bhattu', '07:52', 11],
    ]),
  },
  {
    id: 9,
    name: 'Route 9',
    vehicleId: 9,
    active: true,
    stops: stops([
      ['Lahli', '06:55', 11],
      ['Dhamtan Sahib', '07:15', 12],
      ['Bareta', '07:35', 11],
      ['Hisar road', '07:54', 11],
    ]),
  },
]
export const lastSampleStopId = stopId

export const sampleSettings: Settings = {
  busMonths: 11,
  busFeePerChild: 8800,
  feeCollectedPercent: 95,
}
