import { useQuery } from '@tanstack/react-query'
import type { ApiClient } from '../../shared/api/client'
import type { components } from '../../shared/api/schema'
import { monitorAttendance } from './api'
import { monitoringQuerySettings } from './model'
import type { monitoringFilters } from './model'

type Filters = ReturnType<typeof monitoringFilters>
export function useMonitoring(
  api: ApiClient,
  identity: string | undefined,
  filters: Filters,
) {
  return useQuery<components['schemas']['MonitoringPage']>({
    ...monitoringQuerySettings(identity, filters),
    queryFn: ({ signal }) => monitorAttendance(api, filters.params, signal),
  })
}
