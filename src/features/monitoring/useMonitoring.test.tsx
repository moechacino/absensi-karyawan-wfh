import type { MonitoringPage } from '../../shared/api/types'
import {
  QueryClient,
  QueryClientProvider,
  focusManager,
} from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { createElement, type PropsWithChildren } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { ApiClient } from '../../shared/api/client'
import { monitoringFilters } from './model'
import { useMonitoring } from './useMonitoring'

const page: MonitoringPage = {
  items: [],
  pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
  summary: {
    missedCheckOut: 0,
    notCheckedIn: 0,
    working: 0,
    completed: 0,
    late: 0,
    holiday: 0,
    restDay: 0,
    unconfigured: 0,
  },
}

describe('monitoring read lifecycle', () => {
  it('refreshes on browser focus and manual refetch without replacing stale rows until a response resolves', async () => {
    const request = vi.fn().mockResolvedValue(page)
    const api = { request } as unknown as ApiClient
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 0 } },
    })
    const wrapper = ({ children }: PropsWithChildren) =>
      createElement(QueryClientProvider, { client }, children)
    const filters = monitoringFilters(new URLSearchParams('date=2026-11-08'))
    const hook = renderHook(() => useMonitoring(api, 'hr-1', filters), {
      wrapper,
    })
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(hook.result.current.data).toEqual(page))

    let resolve!: (value: typeof page) => void
    request.mockReturnValueOnce(
      new Promise<typeof page>((done) => {
        resolve = done
      }),
    )
    act(() => focusManager.setFocused(false))
    act(() => focusManager.setFocused(true))
    await waitFor(() => expect(hook.result.current.isFetching).toBe(true))
    expect(hook.result.current.data).toBe(page)
    await act(async () => {
      resolve(page)
      await Promise.resolve()
    })
    await waitFor(() => expect(hook.result.current.isFetching).toBe(false))
    expect(request).toHaveBeenCalledTimes(2)

    request.mockResolvedValueOnce(page)
    await act(async () => {
      await hook.result.current.refetch()
    })
    expect(request).toHaveBeenCalledTimes(3)
    hook.unmount()
    client.clear()
    act(() => focusManager.setFocused(undefined))
  })
})
