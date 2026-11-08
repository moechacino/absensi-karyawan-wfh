import { describe, expect, it, vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import { createApiError } from '../../api/problem'
import { createAppQueryClient, readRetryDelay, retryRead } from '../client'
import { clearAccountState, registerAccountCleanup } from '../cleanup'
import { invalidateGroup } from '../invalidation'
import { queryKeys } from '../keys'

describe('query policies and account cleanup', () => {
  it('bounds retries to transient reads and honors server Retry-After', () => {
    expect(retryRead(0, createApiError('network'))).toBe(true)
    expect(retryRead(2, createApiError('network'))).toBe(false)
    for (const status of [401, 403, 409, 422])
      expect(retryRead(0, createApiError('http', { status }))).toBe(false)
    expect(retryRead(0, createApiError('cancelled'))).toBe(false)
    expect(retryRead(0, createApiError('http', { status: 429 }))).toBe(true)
    expect(
      readRetryDelay(1, createApiError('http', { retryAfter: '60' })),
    ).toBe(60_000)
    expect(readRetryDelay(1, createApiError('network'))).toBe(2000)
  })

  it('executes writes without retries or offline paused replay', async () => {
    const client = createAppQueryClient()
    const mutationFn = vi.fn().mockRejectedValue(createApiError('network'))
    const mutation = client.getMutationCache().build(client, { mutationFn })
    await expect(mutation.execute(undefined)).rejects.toMatchObject({
      kind: 'network',
    })
    expect(mutationFn).toHaveBeenCalledOnce()
    expect(client.getDefaultOptions().mutations).toMatchObject({
      retry: false,
      networkMode: 'always',
    })
    client.clear()
  })

  it('includes identity and all filters in resource keys and invalidates only the scoped group', async () => {
    expect(
      queryKeys.attendanceDays('one', { page: 2, startDate: '2026-11-01' }),
    ).not.toEqual(
      queryKeys.attendanceDays('two', { page: 2, startDate: '2026-11-01' }),
    )
    expect(queryKeys.employees('one', { page: 1 })).not.toEqual(
      queryKeys.employees('one', { page: 2 }),
    )
    const client = new QueryClient()
    const invalidate = vi.spyOn(client, 'invalidateQueries').mockResolvedValue()
    await invalidateGroup(client, 'one', 'attendance')
    expect(invalidate.mock.calls.map(([input]) => input?.queryKey)).toEqual([
      ['private', 'one', 'home'],
      ['private', 'one', 'attendance'],
      ['private', 'one', 'monitoring'],
    ])
  })

  it('clears resources/caches synchronously before awaited cancellation and ignores late queries', async () => {
    const client = createAppQueryClient()
    client.setQueryData(['private', 'one', 'profile'], { name: 'Secret' })
    const cleanup = vi.fn()
    const unregister = registerAccountCleanup(cleanup)
    let resolve!: (value: string) => void
    const pending = client
      .fetchQuery({
        queryKey: ['private', 'one', 'late'],
        queryFn: ({ signal }) => {
          expect(signal.aborted).toBe(false)
          return new Promise<string>((yes) => {
            resolve = yes
          })
        },
      })
      .catch(() => undefined)
    const clear = clearAccountState(client)
    expect(cleanup).toHaveBeenCalledOnce()
    expect(client.getQueryCache().getAll()).toHaveLength(0)
    resolve('late private data')
    await Promise.all([clear, pending])
    expect(client.getQueryCache().getAll()).toHaveLength(0)
    unregister()
  })
})
