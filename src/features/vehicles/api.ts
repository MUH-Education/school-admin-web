import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import type {
  Assignment,
  AssignmentBody,
  AttentionItem,
  DocumentsBody,
  Duty,
  Staff,
  StaffBody,
  Vehicle,
  VehicleBody,
  VehicleDetail,
} from './types'

export function useVehicles() {
  return useQuery({ queryKey: ['vehicles'], queryFn: () => api<Vehicle[]>('GET', '/vehicles') })
}

export function useVehicleAttention() {
  return useQuery({
    queryKey: ['vehicles', 'attention'],
    queryFn: () => api<AttentionItem[]>('GET', '/vehicles/attention'),
  })
}

export function useVehicle(id: number) {
  return useQuery({
    queryKey: ['vehicles', id],
    queryFn: () => api<VehicleDetail>('GET', `/vehicles/${id}`),
  })
}

export function useAssignments(vehicleId: number) {
  return useQuery({
    queryKey: ['vehicles', vehicleId, 'assignments'],
    queryFn: () => api<Assignment[]>('GET', `/vehicles/${vehicleId}/assignments`),
  })
}

/** All people, or one kind of work. */
export function useStaff(type?: Duty) {
  return useQuery({
    queryKey: type ? ['staff', type] : ['staff'],
    queryFn: () => api<Staff[]>('GET', type ? `/staff?type=${type}` : '/staff'),
  })
}

/** Who is on a vehicle changes the vehicle lists, the people lists and the route of a login. */
function useRefreshFleet() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['vehicles'] }),
      queryClient.invalidateQueries({ queryKey: ['staff'] }),
      queryClient.invalidateQueries({ queryKey: ['users'] }),
      queryClient.invalidateQueries({ queryKey: ['routes'] }),
    ])
}

export function useCreateVehicle() {
  const refresh = useRefreshFleet()
  return useMutation({
    mutationFn: (body: VehicleBody) => api<VehicleDetail>('POST', '/vehicles', body),
    onSuccess: refresh,
  })
}

export function useUpdateVehicle(id: number) {
  const refresh = useRefreshFleet()
  return useMutation({
    mutationFn: (body: VehicleBody) => api<VehicleDetail>('PUT', `/vehicles/${id}`, body),
    onSuccess: refresh,
  })
}

/** The id is given when the mutation runs, because a new vehicle has no id until it is saved. */
export function useSaveDocuments() {
  const refresh = useRefreshFleet()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: DocumentsBody }) =>
      api<VehicleDetail>('PUT', `/vehicles/${id}/documents`, body),
    onSuccess: refresh,
  })
}

export function useDeleteVehicle(id: number) {
  const refresh = useRefreshFleet()
  return useMutation({
    mutationFn: () => api<void>('DELETE', `/vehicles/${id}`),
    onSuccess: refresh,
  })
}

export function useChangeAssignment(vehicleId: number) {
  const refresh = useRefreshFleet()
  return useMutation({
    mutationFn: (body: AssignmentBody) =>
      api<VehicleDetail>('POST', `/vehicles/${vehicleId}/assignments`, body),
    onSuccess: refresh,
  })
}

export function useCreateStaff() {
  const refresh = useRefreshFleet()
  return useMutation({
    mutationFn: (body: StaffBody) => api<Staff>('POST', '/staff', body),
    onSuccess: refresh,
  })
}

export function useUpdateStaff() {
  const refresh = useRefreshFleet()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: StaffBody }) =>
      api<Staff>('PUT', `/staff/${id}`, body),
    onSuccess: refresh,
  })
}

export function useDeleteStaff() {
  const refresh = useRefreshFleet()
  return useMutation({
    mutationFn: (id: number) => api<void>('DELETE', `/staff/${id}`),
    onSuccess: refresh,
  })
}
