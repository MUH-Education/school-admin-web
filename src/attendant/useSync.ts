import { useEffect, useState } from 'react'
import { useAuth } from '@/auth/useAuth'
import { refreshLocalState, setNetworkFailed, useLocalState } from './localState'
import { syncOnce } from './sync'

/** How often the loop tries again while taps are waiting. */
export const SYNC_EVERY_MS = 20_000

export interface SyncStatus {
  /** Taps on the phone that the server has not confirmed. */
  waiting: number
  /** Taps the server refused and the attendant has not cleared. */
  problems: number
  /** The phone has network and the last try to reach the server did not fail. */
  online: boolean
  /** A send is going on now. */
  sending: boolean
}

function phoneIsOnline(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine !== false
}

/**
 * Starts the sync loop (docs/07-attendant-offline.md) and tells the screens how it is going.
 * The loop runs: when a new tap is saved, when the phone comes online, when the app comes to the
 * front, after a login, and every 20 seconds while taps wait. Mount it once, in the shell.
 */
export function useSync(): SyncStatus {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const local = useLocalState()
  const [phoneOnline, setPhoneOnline] = useState(phoneIsOnline)
  const waiting = local.queue.length
  const hasNewTap = local.queue.some((tap) => tap.tries === 0)

  // Read what is saved on the phone once.
  useEffect(() => {
    void refreshLocalState()
  }, [])

  // The network comes and goes.
  useEffect(() => {
    const comeBack = () => {
      setPhoneOnline(true)
      setNetworkFailed(false)
      void syncOnce()
    }
    const goAway = () => setPhoneOnline(false)
    const toFront = () => {
      if (document.visibilityState === 'visible') void syncOnce()
    }
    window.addEventListener('online', comeBack)
    window.addEventListener('offline', goAway)
    window.addEventListener('focus', toFront)
    document.addEventListener('visibilitychange', toFront)
    return () => {
      window.removeEventListener('online', comeBack)
      window.removeEventListener('offline', goAway)
      window.removeEventListener('focus', toFront)
      document.removeEventListener('visibilitychange', toFront)
    }
  }, [])

  // A tap was just saved, or somebody logged in: send.
  useEffect(() => {
    if (userId !== null && (hasNewTap || waiting > 0)) void syncOnce()
    // Only a new tap or a login starts a run here; the timer below covers the retries.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, hasNewTap])

  // Taps are waiting: try again every 20 seconds.
  useEffect(() => {
    if (userId === null || waiting === 0) return
    const timer = setInterval(() => void syncOnce(), SYNC_EVERY_MS)
    return () => clearInterval(timer)
  }, [userId, waiting > 0]) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    waiting,
    problems: local.problems.length,
    online: phoneOnline && !local.networkFailed,
    sending: local.syncing,
  }
}
