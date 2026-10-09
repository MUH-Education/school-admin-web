import { useSyncExternalStore } from 'react'
import { getManifest, getProblems, getQueue } from './tapStore'
import type { Manifest, Tap, TapProblem } from './types'

/**
 * What the phone knows right now: the saved manifest and the tap queue (docs/07-attendant-offline.md).
 * Every screen is drawn from this, never from the network. It is a copy of IndexedDB, filled after
 * each write has finished, so the screen can never be ahead of what is saved.
 */
export interface LocalState {
  /** False until the first read of IndexedDB is done. */
  ready: boolean
  manifest: Manifest | null
  queue: Tap[]
  problems: TapProblem[]
  /** A send is running now. */
  syncing: boolean
  /** The last try to reach the server failed because of the network. */
  networkFailed: boolean
}

const empty: LocalState = {
  ready: false,
  manifest: null,
  queue: [],
  problems: [],
  syncing: false,
  networkFailed: false,
}

let state: LocalState = empty
const listeners = new Set<() => void>()

function set(change: Partial<LocalState>): void {
  state = { ...state, ...change }
  for (const listener of listeners) listener()
}

export function getLocalState(): LocalState {
  return state
}

export function subscribeLocalState(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useLocalState(): LocalState {
  return useSyncExternalStore(subscribeLocalState, getLocalState, getLocalState)
}

/** Reads IndexedDB again. Call it after every write. */
export async function refreshLocalState(): Promise<void> {
  const [manifest, queue, problems] = await Promise.all([getManifest(), getQueue(), getProblems()])
  set({ ready: true, manifest, queue, problems })
}

export function setSyncing(syncing: boolean): void {
  if (state.syncing !== syncing) set({ syncing })
}

export function setNetworkFailed(networkFailed: boolean): void {
  if (state.networkFailed !== networkFailed) set({ networkFailed })
}

/** For tests: forget the copy in memory. */
export function resetLocalState(): void {
  state = empty
  for (const listener of listeners) listener()
}
