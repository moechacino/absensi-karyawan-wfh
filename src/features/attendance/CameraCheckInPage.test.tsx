import type { Home } from '../../shared/api/types'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createApiError } from '../../shared/api/problem'
import CameraCheckInPage from './CameraCheckInPage'
const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  capture: vi.fn(),
  refetch: vi.fn(),
  invalidate: vi.fn(),
  stop: vi.fn(),
  home: null as Home | null,
}))
vi.mock('../../shared/auth', () => ({
  useApi: () => ({ request: mocks.request }),
  useSession: () => ({ profile: { id: 'employee-one' } }),
}))
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({}) }))
vi.mock('../../shared/query/invalidation', () => ({
  invalidateGroup: (...args: unknown[]) => mocks.invalidate(...args),
}))
vi.mock('../home/api', () => ({
  useHome: () => ({
    isPending: false,
    isError: false,
    data: mocks.home ?? home,
    refetch: mocks.refetch,
  }),
}))
vi.mock('./useCamera', () => ({
  useCamera: () => ({
    videoRef: { current: null },
    state: 'ready',
    error: null,
    start: vi.fn(),
    stop: mocks.stop,
    capture: mocks.capture,
  }),
}))
const home: Home = {
  serverNow: '2026-11-08T02:00:00Z',
  companyDate: '2026-11-08',
  timeZone: 'Asia/Jakarta',
  day: {
    workDate: '2026-11-08',
    status: 'NOT_CHECKED_IN',
    schedule: null,
    attendance: null,
    canCheckIn: true,
    canCheckOut: false,
    blockReason: null,
  },
  workSchedule: {
    version: 1,
    current: null,
    upcoming: null,
    checkInPolicy: { opensMinutesBeforeStart: 15, lateAfterMinutes: 0 },
  },
  checkInWindow: null,
}
describe('capture automatically submits', () => {
  beforeEach(() => {
    mocks.home = null
    mocks.refetch.mockResolvedValue({ data: home, isError: false })
    mocks.capture.mockResolvedValue(new Blob(['fresh'], { type: 'image/jpeg' }))
    mocks.invalidate.mockResolvedValue(undefined)
  })
  it('keeps capture disabled before the server opening regardless of the device clock', () => {
    mocks.home = {
      ...home,
      day: { ...home.day, canCheckIn: false, blockReason: 'CHECK_IN_TOO_EARLY' },
      checkInWindow: { opensAt: '2026-11-10T12:45:00Z', deadlineAt: '2026-11-10T13:00:00Z', closesAt: '2026-11-10T21:00:00Z' },
    }
    render(<MemoryRouter><CameraCheckInPage /></MemoryRouter>)
    expect(screen.getByRole('button', { name: 'Ambil foto dan check-in' })).toBeDisabled()
    expect(screen.getByText('Waktu check-in belum dibuka.')).toBeInTheDocument()
    expect(mocks.capture).not.toHaveBeenCalled()
    expect(mocks.request).not.toHaveBeenCalled()
  })
  it('does not double-submit and deliberately retries identical photo/context/key after uncertainty', async () => {
    let reject!: (error: unknown) => void
    mocks.request.mockReturnValueOnce(
      new Promise((_, fail) => {
        reject = fail
      }),
    )
    render(
      <MemoryRouter>
        <CameraCheckInPage />
      </MemoryRouter>,
    )
    const capture = screen.getByRole('button', {
      name: 'Ambil foto dan check-in',
    })
    fireEvent.click(capture)
    fireEvent.click(capture)
    await waitFor(() => expect(mocks.request).toHaveBeenCalledOnce())
    const original = mocks.request.mock.calls[0][0]
    await act(async () => {
      reject(createApiError('network'))
    })
    expect(mocks.capture).toHaveBeenCalledOnce()
    expect(
      screen.queryByRole('button', { name: /Kirim foto|Review/ }),
    ).not.toBeInTheDocument()
    mocks.request.mockResolvedValueOnce({
      id: 'actual-id',
      checkInAt: '2026-11-08T02:00:01Z',
      schedule: { timeZone: 'Asia/Jakarta' },
      punctuality: 'ON_TIME',
    })
    fireEvent.click(
      screen.getByRole('button', { name: 'Coba ulang tindakan yang sama' }),
    )
    await screen.findByRole('heading', { name: 'Check-in berhasil' })
    const retry = mocks.request.mock.calls[1][0]
    expect(retry.idempotencyKey).toBe(original.idempotencyKey)
    const bytes = (blob: Blob) =>
      new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.readAsDataURL(blob)
      })
    expect(await bytes(retry.data.get('photo'))).toBe(
      await bytes(original.data.get('photo')),
    )
    expect([...retry.data.keys()]).toEqual(['photo'])
    expect(mocks.invalidate).toHaveBeenCalledWith(
      expect.anything(),
      'employee-one',
      'attendance',
    )
  })
  it('does not capture if refreshed server eligibility has closed', async () => {
    mocks.refetch.mockResolvedValueOnce({
      data: { ...home, day: { ...home.day, canCheckIn: false } },
      isError: false,
    })
    render(
      <MemoryRouter>
        <CameraCheckInPage />
      </MemoryRouter>,
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'Ambil foto dan check-in' }),
    )
    await screen.findByText(/Kelayakan check-in telah berubah/)
    expect(mocks.capture).not.toHaveBeenCalled()
    expect(mocks.request).not.toHaveBeenCalled()
  })
})
