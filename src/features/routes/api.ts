import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import type { LoadBoardRow, Route, RouteBody, Settings, StopBody } from './types'

export function useLoadBoard() {
  return useQuery({
    queryKey: ['routes', 'load-board'],
    queryFn: () => api<LoadBoardRow[]>('GET', '/routes/load-board'),
  })
}

/** One route with its stops. Not asked while no route is selected. */
export function useRoute(id: number | null) {
  return useQuery({
    queryKey: ['routes', id],
    queryFn: () => api<Route>('GET', `/routes/${id}`),
    enabled: id !== null,
  })
}

export function useSettings() {
  return useQuery({ queryKey: ['settings'], queryFn: () => api<Settings>('GET', '/settings') })
}

/** A route change moves the load board, the vehicle lists (route column) and logins (route). */
function useRefreshRoutes() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['routes'] }),
      queryClient.invalidateQueries({ queryKey: ['vehicles'] }),
      queryClient.invalidateQueries({ queryKey: ['staff'] }),
      queryClient.invalidateQueries({ queryKey: ['users'] }),
    ])
}

export function useSaveSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: Settings) => api<Settings>('PUT', '/settings', body),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['settings'] }),
        // Every cost on the load board is counted again.
        queryClient.invalidateQueries({ queryKey: ['routes'] }),
      ]),
  })
}

export function useCreateRoute() {
  const refresh = useRefreshRoutes()
  return useMutation({
    mutationFn: (body: RouteBody) => api<Route>('POST', '/routes', body),
    onSuccess: refresh,
  })
}

export function useUpdateRoute(id: number) {
  const refresh = useRefreshRoutes()
  return useMutation({
    mutationFn: (body: RouteBody) => api<Route>('PUT', `/routes/${id}`, body),
    onSuccess: refresh,
  })
}

/** Sends the whole ordered list of stops. */
export function useSaveStops(id: number) {
  const refresh = useRefreshRoutes()
  return useMutation({
    mutationFn: (stops: StopBody[]) => api<Route>('PUT', `/routes/${id}/stops`, stops),
    onSuccess: refresh,
  })
}

export function useDeleteRoute(id: number) {
  const refresh = useRefreshRoutes()
  return useMutation({
    mutationFn: () => api<void>('DELETE', `/routes/${id}`),
    onSuccess: refresh,
  })
}
