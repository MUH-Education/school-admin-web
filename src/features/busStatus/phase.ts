import type { BusPhase } from './types'

/** Reads `?phase=` from the address. A missing or wrong value is null: the server decides. */
export function parsePhase(raw: string | null): BusPhase | null {
  return raw === 'MORNING' || raw === 'AT_SCHOOL' || raw === 'EVENING' ? raw : null
}
