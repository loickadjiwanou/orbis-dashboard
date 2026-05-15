import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import * as api from '@/services/api'
import type { Command, PaginatedResponse } from '@/types'

export function useDeviceCommands(
  deviceId: string,
  filters?: { statut?: string; skip?: number; limit?: number },
): UseQueryResult<PaginatedResponse<Command>, Error> {
  return useQuery({
    queryKey: ['commands', deviceId, filters],
    queryFn: () => api.getDeviceCommands(deviceId, filters),
    enabled: Boolean(deviceId),
    staleTime: 15_000,
    refetchInterval: 5_000,
  })
}

export function useCommand(commandId: string): UseQueryResult<Command, Error> {
  return useQuery({
    queryKey: ['command', commandId],
    queryFn: async (): Promise<Command> => {
      // Commands are fetched as part of device command lists; this
      // individual lookup queries the list and finds the matching entry.
      // If the backend exposes GET /commands/:id this can be a direct call.
      throw new Error(`No direct command endpoint for id: ${commandId}`)
    },
    enabled: false, // disabled until backend exposes individual command endpoint
  })
}
