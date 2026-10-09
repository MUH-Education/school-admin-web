import { api, getToken } from '@/api/client'
import { ApiError } from '@/api/errors'
import { getLocalState, refreshLocalState, setNetworkFailed, setSyncing } from './localState'
import { getManifest, getQueue, markTried, settle } from './tapStore'
import type { Manifest, MarksResponse, TapBody } from './types'

/** At most this many taps go in one call. */
export const BATCH_SIZE = 100

export type SyncResult =
  /** Nothing was waiting. */
  | 'EMPTY'
  /** At least one batch was answered by the server. */
  | 'SENT'
  | 'NO_LOGIN'
  | 'OFFLINE'
  /** The server said 401. The taps stay; after the next login the loop runs again. */
  | 'UNAUTHORIZED'
  /** The network failed or the server answered 5xx or something unexpected. The taps stay. */
  | 'FAILED'

let running: Promise<SyncResult> | null = null
let again = false

/**
 * The sync loop of docs/07-attendant-offline.md. One run at a time: if a run is going, this call
 * asks it to look at the queue once more and returns the same run.
 */
export function syncOnce(): Promise<SyncResult> {
  if (running) {
    again = true
    return running
  }
  running = run().finally(() => {
    running = null
    again = false
    setSyncing(false)
  })
  return running
}

function nameOfIn(manifest: Manifest | null, studentId: number): string | null {
  for (const stop of manifest?.stops ?? []) {
    const child = stop.children.find((c) => c.studentId === studentId)
    if (child) return child.name
  }
  return null
}

function bodyOf(tap: TapBody): TapBody {
  return {
    studentId: tap.studentId,
    eventType: tap.eventType,
    outcome: tap.outcome,
    serviceDate: tap.serviceDate,
    occurredAt: tap.occurredAt,
  }
}

async function run(): Promise<SyncResult> {
  if (!getToken()) return 'NO_LOGIN'
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'OFFLINE'

  let result: SyncResult = 'EMPTY'
  try {
    // Loop until the queue is empty, so a tap added during the run is not forgotten.
    for (;;) {
      again = false
      const batch = (await getQueue()).slice(0, BATCH_SIZE)
      if (batch.length === 0) {
        if (again) continue
        return result
      }
      setSyncing(true)
      await refreshLocalState()
      await markTried(batch)

      let answer: MarksResponse
      try {
        answer = await api<MarksResponse>('POST', '/trips/marks', { marks: batch.map(bodyOf) })
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return 'UNAUTHORIZED'
        if (error instanceof ApiError && error.code === 'NETWORK') setNetworkFailed(true)
        return 'FAILED'
      }
      setNetworkFailed(false)
      if (!Array.isArray(answer.results) || answer.results.length !== batch.length) return 'FAILED'

      const manifest = await getManifest()
      await settle(batch, answer.results, (studentId) => nameOfIn(manifest, studentId))
      await refreshLocalState()
      result = 'SENT'
    }
  } catch {
    // IndexedDB failed. The queue is untouched; the next run tries again.
    return 'FAILED'
  } finally {
    if (getLocalState().syncing) setSyncing(false)
  }
}
