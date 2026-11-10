import type { Home } from '../../shared/api/types'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import type { ApiClient } from '../../shared/api/client'
import { useApi, useSession } from '../../shared/auth'
import { nextAttendanceBoundary } from './viewModel'
import { invalidateGroup } from '../../shared/query/invalidation'

export function getHome(api: ApiClient, signal?: AbortSignal) {
  return api.request<Home>({
    path: '/me/home',
    signal,
  })
}
export function useHome() {
  const api = useApi(),
    { profile } = useSession(),
    queries = useQueryClient()
  const query = useQuery({
    queryKey: ['private', profile?.id, 'home'],
    queryFn: ({ signal }) => getHome(api, signal),
    enabled: Boolean(profile),
  })
  const { data, dataUpdatedAt } = query
  const identity = profile?.id
  useEffect(() => {
    if (!data || !identity) return
    const next = nextAttendanceBoundary(data)
    if (!next) return
    const delay = next - Date.parse(data.serverNow) -
      Math.max(0, Date.now() - dataUpdatedAt)
    const timer = window.setTimeout(
      () => void invalidateGroup(queries, identity, 'attendance'),
      Math.max(50, Math.min(delay + 50, 2_147_000_000)),
    )
    return () => clearTimeout(timer)
  }, [data, dataUpdatedAt, identity, queries])
  return query
}
