import { useQuery } from '@tanstack/react-query'
import type { ApiClient } from '../../shared/api/client'
import type { JsonResult } from '../../shared/api/types'
import { useApi, useSession } from '../../shared/auth'

export function getHome(api: ApiClient, signal?: AbortSignal) {
  return api.request<JsonResult<'getEmployeeHome'>>({
    path: '/me/home',
    signal,
  })
}
export function useHome() {
  const api = useApi(),
    { profile } = useSession()
  return useQuery({
    queryKey: ['private', profile?.id, 'home'],
    queryFn: ({ signal }) => getHome(api, signal),
    enabled: Boolean(profile),
  })
}
