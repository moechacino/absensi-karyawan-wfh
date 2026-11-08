import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createApiError } from '../../../shared/api/problem'
import type { components } from '../../../shared/api/schema'
import HrHolidayCalendarPage from '../HrHolidayCalendarPage'

const mocks = vi.hoisted(() => ({
  api: {},
  getCalendar: vi.fn(),
  preview: vi.fn(),
  change: vi.fn(),
  invalidate: vi.fn(),
}))
vi.mock('../../../shared/auth', () => ({
  useApi: () => mocks.api,
  useSession: () => ({
    profile: { id: 'hr-one', permissions: ['HR_HOLIDAYS_MANAGE'] },
  }),
}))
vi.mock('../../home/api', () => ({
  useHome: () => ({
    data: { companyDate: '2026-11-08' },
    isPending: false,
    isError: false,
    refetch: vi.fn(),
  }),
}))
vi.mock('../../company/api', () => ({
  getHolidayCalendar: (...args: unknown[]) => mocks.getCalendar(...args),
}))
vi.mock('../api', () => ({
  previewHolidayChange: (...args: unknown[]) => mocks.preview(...args),
  changeHolidayCalendar: (...args: unknown[]) => mocks.change(...args),
}))
vi.mock('../../../shared/query/invalidation', () => ({
  invalidateGroup: (...args: unknown[]) => mocks.invalidate(...args),
}))

const calendar = (year: number): components['schemas']['HolidayCalendar'] => ({
  year,
  version: 7,
  items: [
    { date: `${year}-11-12`, name: 'Hari Perusahaan', category: 'COMPANY' },
  ],
})
const impact: components['schemas']['ChangeImpact'] = {
  canApply: true,
  issues: [],
}
function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const wrapper = ({ children }: React.PropsWithChildren) => (
    <MemoryRouter>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </MemoryRouter>
  )
  const rendered = render(<HrHolidayCalendarPage />, { wrapper })
  return { ...rendered, client }
}
async function addHoliday(name: string, dateLabel = /Tandai 20 November/) {
  fireEvent.click(await screen.findByRole('button', { name: dateLabel }))
  fireEvent.change(screen.getByLabelText('Nama hari libur'), {
    target: { value: name },
  })
  fireEvent.click(
    screen.getByRole('button', { name: 'Simpan tanggal dalam batch' }),
  )
  await waitFor(() =>
    expect(screen.getByText(/Batch belum disimpan/)).toBeInTheDocument(),
  )
}
function mockDialogs() {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.open = true
    },
  })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.open = false
    },
  })
}

describe('HR yearly holiday editor', () => {
  beforeEach(() => {
    mockDialogs()
    mocks.getCalendar.mockImplementation((_api, year: number) =>
      Promise.resolve(calendar(year)),
    )
    mocks.preview.mockResolvedValue(impact)
    mocks.change.mockReset()
    mocks.invalidate.mockResolvedValue(undefined)
  })

  it('asks before discarding a dirty year and then opens only the requested calendar', async () => {
    setup()
    await addHoliday('Hari bersama')
    const year = screen.getByLabelText('Tahun kalender')
    fireEvent.change(year, { target: { value: '2027' } })
    expect(
      await screen.findByRole('dialog', { name: 'Buang perubahan tahun ini?' }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Batalkan' }))
    expect(screen.getByLabelText('Tahun kalender')).toHaveValue(2026)
    expect(
      screen.getByRole('button', { name: /Hari bersama/ }),
    ).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Tahun kalender'), {
      target: { value: '2027' },
    })
    fireEvent.click(
      screen.getByRole('button', { name: 'Buang dan pindah tahun' }),
    )
    await waitFor(() =>
      expect(screen.getByLabelText('Tahun kalender')).toHaveValue(2027),
    )
    expect(
      await screen.findByRole('button', { name: /Tandai 20 November 2027/ }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Hari bersama/ }),
    ).not.toBeInTheDocument()
  })

  it('previews only the explicit batch and commits only the server-returned calendar', async () => {
    setup()
    await addHoliday('Hari bersama')
    fireEvent.click(
      screen.getByRole('button', { name: 'Tinjau perubahan kalender' }),
    )
    expect(
      await screen.findByRole('dialog', {
        name: 'Tinjau perubahan hari libur 2026',
      }),
    ).toBeInTheDocument()
    expect(mocks.preview).toHaveBeenCalledWith(
      mocks.api,
      {
        year: 2026,
        expectedVersion: 7,
        upsert: [
          { date: '2026-11-20', name: 'Hari bersama', category: 'COMPANY' },
        ],
        remove: [],
      },
      expect.any(AbortSignal),
    )
    const returned = {
      calendar: {
        ...calendar(2026),
        version: 8,
        items: [
          ...calendar(2026).items,
          {
            date: '2026-11-20',
            name: 'Hari bersama',
            category: 'COMPANY' as const,
          },
        ],
      },
    }
    mocks.change.mockResolvedValue(returned)
    fireEvent.click(screen.getByRole('button', { name: 'Simpan kalender' }))
    await screen.findByText(
      'Perubahan tahun 2026 telah dikonfirmasi oleh server.',
    )
    expect(mocks.change).toHaveBeenCalledOnce()
    const [api, input, key, signal] = mocks.change.mock.calls[0]
    expect(api).toBe(mocks.api)
    expect(input).toEqual({
      year: 2026,
      expectedVersion: 7,
      upsert: [
        { date: '2026-11-20', name: 'Hari bersama', category: 'COMPANY' },
      ],
      remove: [],
    })
    expect(typeof key).toBe('string')
    expect(signal).toBeInstanceOf(AbortSignal)
    expect(mocks.invalidate).toHaveBeenCalledWith(
      expect.any(QueryClient),
      'hr-one',
      'configuration',
    )
  })

  it('retries an uncertain save with the same explicit intent key and payload', async () => {
    setup()
    await addHoliday('Hari bersama')
    fireEvent.click(
      screen.getByRole('button', { name: 'Tinjau perubahan kalender' }),
    )
    await screen.findByRole('dialog', {
      name: 'Tinjau perubahan hari libur 2026',
    })
    mocks.change.mockRejectedValueOnce(createApiError('network'))
    fireEvent.click(screen.getByRole('button', { name: 'Simpan kalender' }))
    await screen.findByRole('button', {
      name: 'Coba ulang penyimpanan yang sama',
    })
    expect(
      screen.getByRole('button', { name: 'Simpan kalender' }),
    ).toBeDisabled()
    mocks.change.mockResolvedValueOnce({
      calendar: { ...calendar(2026), version: 8 },
    })
    fireEvent.click(
      screen.getByRole('button', { name: 'Coba ulang penyimpanan yang sama' }),
    )
    await screen.findByText(
      'Perubahan tahun 2026 telah dikonfirmasi oleh server.',
    )
    expect(mocks.change).toHaveBeenCalledTimes(2)
    expect(mocks.change.mock.calls[1][1]).toEqual(mocks.change.mock.calls[0][1])
    expect(mocks.change.mock.calls[1][2]).toBe(mocks.change.mock.calls[0][2])
  })

  it('keeps past dates read-only and requires a nonblank name before preview', async () => {
    setup()
    const past = await screen.findByRole('button', {
      name: /Tandai 7 November 2026/,
    })
    expect(past).toBeDisabled()
    fireEvent.click(
      await screen.findByRole('button', { name: /Tandai 20 November/ }),
    )
    fireEvent.change(screen.getByLabelText('Nama hari libur'), {
      target: { value: '   ' },
    })
    fireEvent.click(
      screen.getByRole('button', { name: 'Tinjau perubahan kalender' }),
    )
    expect(mocks.preview).not.toHaveBeenCalled()
    expect(screen.getByText('Nama hari libur wajib diisi.')).toBeInTheDocument()
  })
})
