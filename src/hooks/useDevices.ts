import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query'
import * as api from '@/services/api'
import type { Device, Command, CommandCreate, PaginatedResponse, DeviceFilters } from '@/types'

export function useDevices(
  filters?: DeviceFilters,
): UseQueryResult<PaginatedResponse<Device>, Error> {
  return useQuery({
    queryKey: ['devices', filters],
    queryFn: () => api.getDevices(filters),
    staleTime: 30_000,
  })
}

export function useDevice(id: string): UseQueryResult<Device, Error> {
  return useQuery({
    queryKey: ['device', id],
    queryFn: () => api.getDevice(id),
    enabled: Boolean(id),
  })
}

export function useSendCommand(): UseMutationResult<
  Command,
  Error,
  { deviceId: string; command: CommandCreate }
> {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ deviceId, command }) => api.sendCommand(deviceId, command),
    onSuccess: (_data, { deviceId }) => {
      void qc.invalidateQueries({ queryKey: ['device', deviceId] })
      void qc.invalidateQueries({ queryKey: ['commands', deviceId] })
    },
  })
}

export function useRevokeDevice(): UseMutationResult<{ message: string }, Error, string> {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.revokeDevice(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['devices'] })
    },
  })
}

export function useDeleteDevice(): UseMutationResult<{ message: string }, Error, string> {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteDevice(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['devices'] })
    },
  })
}

export function useUpdateDevice(): UseMutationResult<
  Device,
  Error,
  { id: string; data: Partial<Device> }
> {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => api.updateDevice(id, data as Partial<Pick<Device, 'nom'>>),
    onSuccess: (_data, { id }) => {
      void qc.invalidateQueries({ queryKey: ['device', id] })
      void qc.invalidateQueries({ queryKey: ['devices'] })
    },
  })
}
