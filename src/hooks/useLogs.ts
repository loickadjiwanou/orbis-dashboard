import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import * as api from '@/services/api'
import type { Log, PaginatedResponse, LogFilter } from '@/types'

export function useDeviceLogs(
  deviceId: string,
  filters?: LogFilter,
): UseQueryResult<PaginatedResponse<Log>, Error> {
  return useQuery({
    queryKey: ['logs', deviceId, filters],
    queryFn: () => api.getDeviceLogs(deviceId, filters),
    enabled: Boolean(deviceId),
    staleTime: 10_000,
  })
}
