import type { RoleCode } from './types'

/** Words shown to people. Never show a code like TRANSPORT_INCHARGE on screen. */
export const roleLabels: Record<RoleCode, string> = {
  OWNER: 'Owner',
  OFFICE_ADMIN: 'Office admin',
  TRANSPORT_INCHARGE: 'Transport in-charge',
  ADMISSIONS_DESK: 'Admissions desk',
  ATTENDANT: 'Attendant',
}

export const roleHints: Record<RoleCode, string> = {
  OWNER: 'You',
  OFFICE_ADMIN: 'Office clerk',
  TRANSPORT_INCHARGE: 'Runs the buses',
  ADMISSIONS_DESK: 'Talks to new parents',
  ATTENDANT: 'On the bus, phone only',
}

export function roleLabel(role: RoleCode): string {
  return roleLabels[role]
}
