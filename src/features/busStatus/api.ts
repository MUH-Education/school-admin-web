import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import type { AttentionItem, BusDetailAnswer, BusPhase, BusStatusAnswer } from './types'

/** The page asks the server again this often (behaviour 1). */
export const REFRESH_MS = 30_000

/**
 * Live data. Every 30 seconds while the browser tab is visible (TanStack Query skips the
 * ask while the tab is hidden, because `refetchIntervalInBackground` is false). When the tab
 * is shown again it asks at once, because the data is always counted as old (`staleTime: 0`).
 */
const live = {
  refetchInterval: REFRESH_MS,
  refetchIntervalInBackground: false,
  refetchOnWindowFocus: true,
  staleTime: 0,
} as const

/** `?phase=EVENING`. Without a phase the server decides by the time of day. */
function phaseQuery(phase: BusPhase | null): string {
  return phase ? `?phase=${phase}` : ''
}

/** Every route with its stops: the picture of the whole fleet. */
export function useBusStatus(phase: BusPhase | null) {
  return useQuery({
    queryKey: ['bus-status', 'list', phase],
    queryFn: () => api<BusStatusAnswer>('GET', `/bus-status${phaseQuery(phase)}`),
    ...live,
  })
}

/** The problems to show in "Needs attention now". */
export function useBusAttention(phase: BusPhase | null) {
  return useQuery({
    queryKey: ['bus-status', 'attention', phase],
    queryFn: () => api<AttentionItem[]>('GET', `/bus-status/attention${phaseQuery(phase)}`),
    ...live,
  })
}

/** One route with every child and the four events. */
export function useBusDetail(routeId: number, phase: BusPhase | null) {
  return useQuery({
    queryKey: ['bus-status', 'route', routeId, phase],
    queryFn: () => api<BusDetailAnswer>('GET', `/bus-status/routes/${routeId}${phaseQuery(phase)}`),
    ...live,
  })
}
