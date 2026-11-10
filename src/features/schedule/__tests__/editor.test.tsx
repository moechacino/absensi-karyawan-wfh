import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ScheduleEditor } from '../ScheduleEditor'
import { closedHome } from '../../home/__tests__/fixtures'

const mocks = vi.hoisted(() => ({ request: vi.fn() }))
vi.mock('../../../shared/auth', () => ({
  useApi: () => ({ request: mocks.request }),
  useSession: () => ({ profile: { id: 'hr' } }),
}))

beforeEach(() => {
  mocks.request.mockReset()
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value() { this.open = true } })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value() { this.open = false } })
})

function example() {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter><ScheduleEditor model={closedHome.workSchedule} refresh={vi.fn()} /></MemoryRouter>
  </QueryClientProvider>)
}

describe('schedule early check-in form', () => {
  it('previews and saves the selected early allowance in the same overnight schedule', async () => {
    mocks.request.mockImplementation(async ({ path, data }) => {
      if (path.endsWith('/preview')) return {
        schedule: data, activationMode: 'ON_SAVE', effectiveAt: null,
        comparisonDate: '2026-11-10', impact: { canApply: true, issues: [] },
      }
      if (path === '/hr/work-schedule') return { schedule: { ...closedHome.workSchedule, version: 3 } }
      return { items: [] }
    })
    example()
    const allowance = screen.getByRole('spinbutton', { name: /Maksimal check-in lebih awal/ })
    expect(allowance).toHaveValue(15)
    fireEvent.change(allowance, { target: { value: '90' } })
    fireEvent.change(screen.getByLabelText(/Jam mulai/), { target: { value: '20:00' } })
    fireEvent.change(screen.getByLabelText(/Jam selesai/), { target: { value: '04:00' } })
    fireEvent.focus(screen.getByRole('combobox', { name: 'Selesai pada' }))
    fireEvent.click(screen.getByRole('option', { name: 'Hari berikutnya' }))
    fireEvent.change(screen.getByLabelText(/Berlaku mulai/), { target: { value: '2026-12-01' } })
    fireEvent.click(screen.getByRole('button', { name: 'Tinjau perubahan' }))
    await screen.findByRole('dialog')
    expect(screen.getByText('Check-in dibuka 90 menit sebelum jam mulai.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: 'Simpan jadwal' }))
    await waitFor(() => expect(mocks.request.mock.calls.some(([request]) => request.path === '/hr/work-schedule')).toBe(true))
    const preview = mocks.request.mock.calls.find(([request]) => request.path.endsWith('/preview'))![0]
    const saved = mocks.request.mock.calls.find(([request]) => request.path === '/hr/work-schedule')![0]
    expect(saved.method).toBe('PUT')
    expect(saved.idempotencyKey).toEqual(expect.any(String))
    expect(saved.data).toEqual(preview.data)
    expect(saved.data).toMatchObject({ opensMinutesBeforeStart: 90, startTime: '20:00', endTime: '04:00', endDayOffset: 1 })
  })

  it('blocks empty, fractional, and out-of-range early allowances before preview', () => {
    example()
    fireEvent.change(screen.getByLabelText(/Berlaku mulai/), { target: { value: '2026-12-01' } })
    const allowance = screen.getByRole('spinbutton', { name: /Maksimal check-in lebih awal/ })
    for (const value of ['', '-1', '1441', '1.5']) {
      fireEvent.change(allowance, { target: { value } })
      fireEvent.submit(allowance.closest('form')!)
      expect(screen.getByText('Isi bilangan bulat antara 0 dan 1440 menit.')).toBeInTheDocument()
    }
    expect(mocks.request.mock.calls.every(([request]) => !request.path.endsWith('/preview'))).toBe(true)
  })
})
