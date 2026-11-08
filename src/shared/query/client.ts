import { QueryClient } from '@tanstack/react-query'
import { isApiError, retryAfterMs } from '../api/problem'

export function retryRead(failureCount: number, error: unknown): boolean {
  if (failureCount >= 2 || !isApiError(error)) return false
  if (error.kind === 'network' || error.kind === 'timeout') return true
  return (
    error.kind === 'http' &&
    [408, 429, 500, 502, 503, 504].includes(error.status ?? 0)
  )
}

export function readRetryDelay(attempt: number, error: unknown): number {
  const serverDelay = isApiError(error)
    ? retryAfterMs(error.retryAfter)
    : undefined
  return serverDelay ?? Math.min(1000 * 2 ** attempt, 5000)
}

export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: retryRead,
        retryDelay: readRetryDelay,
        networkMode: 'always',
        staleTime: 0,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
      },
      mutations: { retry: false, networkMode: 'always' },
    },
  })
}
