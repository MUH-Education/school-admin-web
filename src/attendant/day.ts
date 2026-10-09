import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { api } from '@/api/client'
import { useAuth } from '@/auth/useAuth'
import { todayIso } from '@/lib/format'
import { refreshLocalState } from './localState'
import { getManifest, saveManifest } from './tapStore'
import type { Manifest, MyRoute } from './types'

export type DayResult =
  /** The list for today is on the phone. `stale`: it is yesterday's, because today's did not load. */
  { kind: 'ready'; stale: boolean } | { kind: 'noRoute' }

/**
 * Makes sure the phone has the list of children for today (docs/07-attendant-offline.md).
 * - A saved list for today: use it. No network needed.
 * - Otherwise: ask the server for the route (GET /trips/my-route), then for the list.
 * - No route today: say so.
 * - The server cannot be reached: an older saved list is shown, with a banner. Without any list: an error.
 * The taps in the queue are never touched here.
 */
export async function loadDay(today: string, ownRouteId: number | null): Promise<DayResult> {
  const saved = await getManifest()
  const savedIsUsable = saved !== null && (ownRouteId === null || saved.routeId === ownRouteId)
  if (saved && savedIsUsable && saved.date === today) {
    await refreshLocalState()
    return { kind: 'ready', stale: false }
  }
  try {
    const mine = await api<MyRoute>('GET', '/trips/my-route')
    if (!mine.route) return { kind: 'noRoute' }
    const manifest = await api<Manifest>(
      'GET',
      `/trips/manifest?routeId=${mine.route.id}&date=${today}`,
    )
    await saveManifest(manifest)
    await refreshLocalState()
    return { kind: 'ready', stale: false }
  } catch (error) {
    if (saved && savedIsUsable) {
      await refreshLocalState()
      return { kind: 'ready', stale: true }
    }
    throw error
  }
}

/** The phone's date in India. It moves on after midnight, when the app comes to the front. */
export function useToday(): string {
  const [today, setToday] = useState(() => todayIso())
  useEffect(() => {
    const update = () => setToday(todayIso())
    const timer = setInterval(update, 60_000)
    window.addEventListener('focus', update)
    document.addEventListener('visibilitychange', update)
    return () => {
      clearInterval(timer)
      window.removeEventListener('focus', update)
      document.removeEventListener('visibilitychange', update)
    }
  }, [])
  return today
}

export type DayState =
  | { status: 'loading' }
  | { status: 'error'; error: unknown }
  | { status: 'noRoute' }
  | { status: 'ready'; stale: boolean }

export function useTripDay(today: string): DayState & { retry: () => void } {
  const { user } = useAuth()
  const ownRouteId = user?.route?.id ?? null
  const query = useQuery({
    queryKey: ['trip', 'day', today, user?.id ?? null],
    queryFn: () => loadDay(today, ownRouteId),
    enabled: user !== null,
    // The list must open with no network too (it comes from the phone).
    networkMode: 'always',
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })
  const retry = () => void query.refetch()

  // A yesterday list is replaced as soon as the phone has network again.
  const stale = query.data?.kind === 'ready' && query.data.stale
  const refetch = query.refetch
  useEffect(() => {
    if (!stale) return
    const again = () => void refetch()
    window.addEventListener('online', again)
    document.addEventListener('visibilitychange', again)
    return () => {
      window.removeEventListener('online', again)
      document.removeEventListener('visibilitychange', again)
    }
  }, [stale, refetch])

  if (query.isError) return { status: 'error', error: query.error, retry }
  if (!query.data) return { status: 'loading', retry }
  if (query.data.kind === 'noRoute') return { status: 'noRoute', retry }
  return { status: 'ready', stale: query.data.stale, retry }
}
