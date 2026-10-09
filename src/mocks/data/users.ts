import type { RoleCode } from '@/auth/types'

export interface MockUser {
  id: number
  name: string | null
  phone: string
  role: RoleCode
  active: boolean
  /** Attendant users point at a staff row. */
  staffId: number | null
}

/** All names and numbers are made up. */
export const sampleUsers: MockUser[] = [
  { id: 1, name: 'Sourabh', phone: '+919812340001', role: 'OWNER', active: true, staffId: null },
  {
    id: 2,
    name: 'Neelam',
    phone: '+919812340002',
    role: 'OFFICE_ADMIN',
    active: true,
    staffId: null,
  },
  {
    id: 3,
    name: 'Jaswant',
    phone: '+919812340003',
    role: 'TRANSPORT_INCHARGE',
    active: true,
    staffId: null,
  },
  {
    id: 4,
    name: 'Priya',
    phone: '+919812340004',
    role: 'ADMISSIONS_DESK',
    active: true,
    staffId: null,
  },
  { id: 5, name: 'Balwan', phone: '+919812340005', role: 'ATTENDANT', active: true, staffId: 24 },
  { id: 6, name: 'Ramesh', phone: '+919812340006', role: 'ATTENDANT', active: true, staffId: 21 },
  { id: 7, name: 'Mahender', phone: '+919812340007', role: 'ATTENDANT', active: true, staffId: 23 },
  { id: 8, name: 'Kuldeep', phone: '+919812340008', role: 'ATTENDANT', active: false, staffId: 25 },
]
