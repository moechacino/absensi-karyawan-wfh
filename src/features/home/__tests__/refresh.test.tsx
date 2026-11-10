import type { ReactNode } from 'react'
import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { useHome } from '../api'
import { closedHome, overnightAttendance } from './fixtures'

const mocks = vi.hoisted(() => ({ request: vi.fn() }))
vi.mock('../../../shared/auth', () => ({
  useApi: () => ({ request: mocks.request }),
  useSession: () => ({ profile: { id: 'employee' } }),
}))

describe('home eligibility refresh', () => {
  it('refetches at the server window opening even when cached data is otherwise fresh', async () => {
    vi.useFakeTimers()
    const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } })
    client.setQueryData(['private', 'employee', 'home'], {
      ...closedHome,
      serverNow: '2026-11-09T22:44:59.000Z',
      day: { ...closedHome.day, blockReason: 'CHECK_IN_TOO_EARLY' },
    })
    mocks.request.mockResolvedValue(closedHome)
    const hook = renderHook(() => useHome(), {
      wrapper: ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
    })
    await act(async () => { await vi.advanceTimersByTimeAsync(999) })
    expect(mocks.request).not.toHaveBeenCalled()
    await act(async () => { await vi.advanceTimersByTimeAsync(51) })
    expect(mocks.request).toHaveBeenCalledOnce()
    expect(mocks.request).toHaveBeenCalledWith({ path: '/me/home', signal: expect.any(AbortSignal) })
    hook.unmount()
    client.clear()
  })
})


it('refreshes at the checkout cutoff instead of marking an overnight shift missed at planned end', async () => {
  vi.useFakeTimers()
  mocks.request.mockClear()
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } })
  const home = {
    ...closedHome, serverNow: '2026-11-09T20:59:59Z', checkInWindow: null,
    day: { ...closedHome.day, status: 'WORKING', attendance: overnightAttendance, canCheckOut: true },
  }
  client.setQueryData(['private', 'employee', 'home'], home)
  mocks.request.mockResolvedValue({ ...closedHome, serverNow: '2026-11-10T12:45:01Z' })
  const hook = renderHook(() => useHome(), {
    wrapper: ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
  })
  await act(async () => { await vi.advanceTimersByTimeAsync(6_000) })
  expect(mocks.request).not.toHaveBeenCalled()
  const toCutoff = Date.parse(overnightAttendance.checkOutDeadlineAt!) - Date.parse(home.serverNow)
  await act(async () => { await vi.advanceTimersByTimeAsync(toCutoff - 6_000 + 50) })
  expect(mocks.request).toHaveBeenCalledOnce()
  hook.unmount()
  client.clear()
})
