import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import type { AttendantOption, CreateUserBody, Role, UpdateUserBody, User } from './types'

export function useUsers() {
  return useQuery({ queryKey: ['users'], queryFn: () => api<User[]>('GET', '/users') })
}

/** The role table. The web app keeps no copy of it. */
export function useRoles() {
  return useQuery({ queryKey: ['roles'], queryFn: () => api<Role[]>('GET', '/roles') })
}

/** Attendants for the "Which attendant?" choice. Only loaded while the dialog needs it. */
export function useAttendants(enabled: boolean) {
  return useQuery({
    queryKey: ['staff', 'attendants'],
    queryFn: () => api<AttendantOption[]>('GET', '/staff?type=ATTENDANT'),
    enabled,
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateUserBody) => api<User>('POST', '/users', body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: UpdateUserBody }) =>
      api<User>('PUT', `/users/${id}`, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })
}
