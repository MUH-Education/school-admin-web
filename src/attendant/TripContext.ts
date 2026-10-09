import { createContext, useContext, useMemo } from 'react'
import { useLocalState } from './localState'
import type { SyncStatus } from './useSync'
import { viewState, type ViewState } from './viewState'
import type { Manifest } from './types'

export interface TripContextValue {
  sync: SyncStatus
  /** The list on the phone is not today's. */
  stale: boolean
  /** The phone's date, for example 2026-10-07 */
  today: string
  retryDay: () => void
  /** A new version of the app is waiting. `apply` installs it and reloads (only when the attendant asks). */
  update: { available: boolean; apply: () => void }
}

export const TripContext = createContext<TripContextValue | null>(null)

export function useTrip(): TripContextValue {
  const value = useContext(TripContext)
  if (!value) throw new Error('useTrip must be used inside TripLayout')
  return value
}

/** What the pages draw: the saved manifest with the tap queue on top. */
export function useTripView(): { view: ViewState; manifest: Manifest | null; today: string } {
  const { today } = useTrip()
  const { manifest, queue } = useLocalState()
  const view = useMemo(() => viewState(manifest, queue, today), [manifest, queue, today])
  return { view, manifest, today }
}
