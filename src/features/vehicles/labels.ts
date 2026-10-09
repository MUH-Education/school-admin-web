import type { AssignmentReason, Duty, OwnedBy, PaperKind, VehicleType } from './types'

export const vehicleTypeLabels: Record<VehicleType, string> = {
  SMALL_VAN: 'Small van',
  MID_BUS: 'Mid bus',
  BIG_BUS: 'Big bus',
}
export const ownedByLabels: Record<OwnedBy, string> = {
  SCHOOL: 'The school',
  CONTRACTOR: 'A contractor',
}
export const dutyLabels: Record<Duty, string> = {
  DRIVER: 'Driver',
  ATTENDANT: 'Attendant',
  HELPER: 'Helper',
}
export const reasonLabels: Record<AssignmentReason, string> = {
  ON_LEAVE: 'On leave',
  LEFT_SCHOOL: 'Left the school',
  MOVED: 'Moved to another vehicle',
  OTHER: 'Other',
}
export const paperLabels: Record<PaperKind, string> = {
  FITNESS: 'Fitness certificate',
  INSURANCE: 'Insurance',
  PERMIT: 'Permit',
  POLLUTION: 'Pollution certificate',
}
/** Short names for sentences: "Insurance ends 28 Oct". */
export const paperShortLabels: Record<PaperKind | 'LICENCE', string> = {
  FITNESS: 'Fitness',
  INSURANCE: 'Insurance',
  PERMIT: 'Permit',
  POLLUTION: 'Pollution',
  LICENCE: 'Licence',
}
export const paperOrder: PaperKind[] = ['FITNESS', 'INSURANCE', 'PERMIT', 'POLLUTION']
