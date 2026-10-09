import type { LoadBoardRow, Route, Verdict } from '@/features/routes/types'
import { paperOrder } from '@/features/vehicles/labels'
import type {
  Duty,
  PaperStatus,
  Staff,
  Vehicle,
  VehicleDetail,
  VehicleDocument,
  VehiclePerson,
} from '@/features/vehicles/types'
import { daysFromToday } from '@/lib/format'
import type { MockAssignment, MockRoute, MockStaff, MockVehicle } from './data/fleet'
import { db } from './db'
import { MOCK_NOW, MOCK_TODAY } from './now'

export const duties: Duty[] = ['DRIVER', 'ATTENDANT', 'HELPER']

export function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function paperStatus(daysLeft: number): PaperStatus {
  if (daysLeft < 0) return 'ENDED'
  return daysLeft <= 30 ? 'ENDING' : 'VALID'
}

/** Who does this job on this day? A later start wins, so a short change covers the usual person. */
export function holderOn(vehicleId: number, duty: Duty, date: string): MockAssignment | undefined {
  return db.assignments
    .filter(
      (a) =>
        a.vehicleId === vehicleId &&
        a.duty === duty &&
        a.fromDate <= date &&
        (a.toDate === null || a.toDate >= date),
    )
    .sort((a, b) => b.fromDate.localeCompare(a.fromDate) || b.id - a.id)[0]
}

export function staffById(id: number): MockStaff | undefined {
  return db.staff.find((s) => s.id === id)
}

export function routeOfVehicle(vehicleId: number): MockRoute | undefined {
  return db.routes.find((r) => r.active && r.vehicleId === vehicleId)
}

export interface Placement {
  vehicleId: number
  vehicleName: string
  routeId: number | null
  routeName: string | null
}

/** Where does this person work on a day (today by default)? Null: nowhere. */
export function placementOf(staffId: number | null, date: string = MOCK_TODAY): Placement | null {
  if (staffId === null) return null
  for (const vehicle of db.vehicles) {
    if (!vehicle.active) continue
    for (const duty of duties) {
      if (holderOn(vehicle.id, duty, date)?.staffId === staffId) {
        const route = routeOfVehicle(vehicle.id)
        return {
          vehicleId: vehicle.id,
          vehicleName: vehicle.name,
          routeId: route?.id ?? null,
          routeName: route?.name ?? null,
        }
      }
    }
  }
  return null
}

function document(kind: VehicleDocument['kind'], validTill: string): VehicleDocument {
  const daysLeft = daysFromToday(validTill, MOCK_NOW)
  return { kind, validTill, status: paperStatus(daysLeft), daysLeft }
}

export function toVehicle(v: MockVehicle): Vehicle {
  const route = routeOfVehicle(v.id)
  return {
    id: v.id,
    name: v.name,
    registrationNo: v.registrationNo,
    vehicleType: v.vehicleType,
    seats: v.seats,
    monthlyCost: v.monthlyCost,
    ownedBy: v.ownedBy,
    active: v.active,
    routeId: route?.id ?? null,
    route: route?.name ?? null,
    driver: staffById(holderOn(v.id, 'DRIVER', MOCK_TODAY)?.staffId ?? -1)?.name ?? null,
    attendant: staffById(holderOn(v.id, 'ATTENDANT', MOCK_TODAY)?.staffId ?? -1)?.name ?? null,
    documents: paperOrder.map((kind) => document(kind, v.papers[kind])),
  }
}

export function hasLogin(staffId: number): boolean {
  return db.users.some((u) => u.staffId === staffId && u.active)
}

function toPerson(vehicleId: number, duty: Duty): VehiclePerson | null {
  const holder = holderOn(vehicleId, duty, MOCK_TODAY)
  const person = holder && staffById(holder.staffId)
  if (!holder || !person) return null
  const temporaryEnd = holder.temporary ? holder.toDate : null
  const back = temporaryEnd ? holderOn(vehicleId, duty, addDays(temporaryEnd, 1)) : undefined
  return {
    duty,
    staffId: person.id,
    name: person.name,
    phone: person.phone,
    licenceValidTill: person.licenceValidTill,
    fromDate: holder.fromDate,
    toDate: temporaryEnd,
    thenBack: (back && staffById(back.staffId)?.name) ?? null,
    hasLogin: hasLogin(person.id),
  }
}

export function toVehicleDetail(v: MockVehicle): VehicleDetail {
  return {
    ...toVehicle(v),
    people: duties.flatMap((duty) => toPerson(v.id, duty) ?? []),
  }
}

export function toStaff(s: MockStaff): Staff {
  const place = placementOf(s.id)
  const daysLeft = s.licenceValidTill ? daysFromToday(s.licenceValidTill, MOCK_NOW) : null
  return {
    id: s.id,
    name: s.name,
    type: s.type,
    phone: s.phone,
    licenceNo: s.licenceNo,
    licenceValidTill: s.licenceValidTill,
    licenceStatus: daysLeft === null ? null : paperStatus(daysLeft),
    licenceDaysLeft: daysLeft,
    vehicle: place?.vehicleName ?? null,
    vehicleId: place?.vehicleId ?? null,
    route: place?.routeName ?? null,
    hasLogin: hasLogin(s.id),
    active: s.active,
  }
}

export function toRoute(r: MockRoute): Route {
  const vehicle = db.vehicles.find((v) => v.id === r.vehicleId)
  return {
    id: r.id,
    name: r.name,
    vehicleId: r.vehicleId,
    vehicle: vehicle?.name ?? null,
    vehicleType: vehicle?.vehicleType ?? null,
    seats: vehicle?.seats ?? 0,
    monthlyCost: vehicle?.monthlyCost ?? 0,
    stops: r.stops.map((s) => ({ ...s })),
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function toLoadRow(r: MockRoute): LoadBoardRow {
  const route = toRoute(r)
  const children = r.stops.reduce((sum, s) => sum + s.children, 0)
  const { busMonths, busFeePerChild, feeCollectedPercent } = db.settings
  const yearlyCost = route.monthlyCost * busMonths
  const feeGot = round2((children * busFeePerChild * feeCollectedPercent) / 100)
  const load = route.seats > 0 ? children / route.seats : 0
  let verdict: Verdict = 'OK'
  if (children > route.seats) verdict = 'OVER'
  else if (load < 0.6) verdict = 'LOW'
  return {
    routeId: r.id,
    name: r.name,
    vehicle: route.vehicle,
    vehicleType: route.vehicleType,
    seats: route.seats,
    children,
    load: round2(load),
    overBy: Math.max(0, children - route.seats),
    spare: Math.max(0, route.seats - children),
    yearlyCost,
    costPerChild: children > 0 ? round2(yearlyCost / children) : 0,
    feeGot,
    surplus: round2(feeGot - yearlyCost),
    verdict,
  }
}
