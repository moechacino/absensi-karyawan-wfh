import { createApiClient } from '../../../shared/api/client'
import type { AxiosAdapter } from 'axios'
import type { ChangeImpact, HolidayCalendar } from '../../../shared/api/types'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createApiError } from '../../../shared/api/problem'
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

const calendar = (year: number): HolidayCalendar => ({
  year,
  version: 7,
  items: [
    { date: `${year}-11-12`, name: 'Hari Perusahaan', category: 'COMPANY' },
  ],
})
const impact: ChangeImpact = {
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
  await waitFor(() =>
    expect(screen.queryByRole('dialog', { name: /^(Edit|Tandai) hari libur$/ })).not.toBeInTheDocument(),
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
  }, 10_000)

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

  it('discards unsaved date input when the date dialog is closed', async () => {
    setup()
    fireEvent.click(await screen.findByRole('button', { name: /Tandai 20 November/ }))
    fireEvent.change(screen.getByLabelText('Nama hari libur'), { target: { value: 'Belum disimpan' } })
    fireEvent.click(screen.getByRole('button', { name: 'Tutup' }))
    expect(screen.queryByText(/Batch belum disimpan/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tinjau perubahan kalender' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: /Tandai 20 November/ }))
    expect(screen.getByLabelText('Nama hari libur')).toHaveValue('')
    expect(mocks.preview).not.toHaveBeenCalled()
    expect(mocks.change).not.toHaveBeenCalled()
  })

  it('loads, previews, and saves through the real Axios feature services', async () => {
    const changes = { year: 2026, expectedVersion: 7, upsert: [{ date: '2026-11-20', name: 'Hari bersama', category: 'COMPANY' }], remove: [] }
    const adapter = vi.fn<AxiosAdapter>(async (config) => {
      const path = new URL(config.url!).pathname
      const data = path === '/api/v1/holidays' ? calendar(2026)
        : path === '/api/v1/hr/holidays/preview' ? impact
        : path === '/api/v1/hr/holidays/changes'
          ? { calendar: { ...calendar(2026), version: 8, items: [...calendar(2026).items, ...changes.upsert] } }
          : null
      if (!data) throw new Error(`Unexpected API path: ${path}`)
      return { data, status: 200, statusText: 'OK', headers: {}, config }
    })
    Object.assign(mocks.api, createApiClient({ baseUrl: '/api/v1', appOrigin: 'http://localhost:5173', getAccessToken: () => 'test-token', adapter }))
    const companyApi = await vi.importActual<typeof import('../../company/api')>('../../company/api')
    const holidayApi = await vi.importActual<typeof import('../api')>('../api')
    mocks.getCalendar.mockImplementation(companyApi.getHolidayCalendar)
    mocks.preview.mockImplementation(holidayApi.previewHolidayChange)
    mocks.change.mockImplementation(holidayApi.changeHolidayCalendar)
    setup()
    await addHoliday('Hari bersama')
    fireEvent.click(screen.getByRole('button', { name: 'Tinjau perubahan kalender' }))
    await screen.findByRole('dialog', { name: 'Tinjau perubahan hari libur 2026' })
    fireEvent.click(screen.getByRole('button', { name: 'Simpan kalender' }))
    await screen.findByText('Perubahan tahun 2026 telah dikonfirmasi oleh server.')
    const requests = adapter.mock.calls.map(([config]) => config)
    expect(requests.map((config) => [config.method, new URL(config.url!).pathname])).toEqual([
      ['get', '/api/v1/holidays'], ['post', '/api/v1/hr/holidays/preview'], ['post', '/api/v1/hr/holidays/changes'],
    ])
    expect(requests[0].params).toEqual({ year: 2026 })
    expect(JSON.parse(requests[1].data)).toEqual(changes)
    expect(JSON.parse(requests[2].data)).toEqual(changes)
    expect(requests[2].headers.get('Idempotency-Key')).toEqual(expect.any(String))
    expect(requests[2].headers.get('Authorization')).toBe('Bearer test-token')
    expect(requests[2].headers.get('Content-Type')).toContain('application/json')
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
