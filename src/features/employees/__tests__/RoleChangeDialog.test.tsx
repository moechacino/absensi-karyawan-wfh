import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import type { Employee } from '../model'
import { RoleChangeDialog } from '../RoleChangeDialog'

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  refreshProfile: vi.fn(),
  clearSession: vi.fn(),
}))
vi.mock('../../../shared/auth', () => ({
  useApi: () => ({ request: mocks.request }),
  useSession: () => ({
    profile: { id: 'hr-1', role: 'HRD' },
    refreshProfile: mocks.refreshProfile,
    clearSession: mocks.clearSession,
  }),
}))
const employee = {
  id: 'employee-1',
  employeeCode: 'EMP-001',
  fullName: 'Pegawai Contoh',
  email: 'p@example.test',
  division: { id: 'div-1', name: 'Produk', code: 'PRO' },
  position: { id: 'pos-1', name: 'Desainer', code: 'DES' },
  role: 'EMPLOYEE',
  status: 'ACTIVE',
  version: 4,
  hasPasswordChanged: false,
  photo: null,
  createdAt: '2026-11-01T00:00:00Z',
  updatedAt: '2026-11-01T00:00:00Z',
  permissions: [],
} as unknown as Employee
function renderDialog(onClose = vi.fn(), onSaved = vi.fn()) {
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
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <RoleChangeDialog
        employee={employee}
        open
        onClose={onClose}
        onSaved={onSaved}
      />
    </QueryClientProvider>,
  )
  return { onClose, onSaved, client }
}
describe('separate HR role command', () => {
  it('requires explicit impact confirmation and sends its own versioned PUT', async () => {
    const result = { ...employee, role: 'HRD' as const, version: 5 }
    mocks.request.mockResolvedValueOnce(result)
    const { onClose, onSaved } = renderDialog()
    const select = screen.getByRole('combobox', { name: 'Peran baru' })
    fireEvent.focus(select)
    fireEvent.click(screen.getByRole('option', { name: 'HRD' }))
    const save = screen.getByRole('button', { name: 'Simpan peran terpisah' })
    expect(save).toBeDisabled()
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(save)
    await waitFor(() => expect(mocks.request).toHaveBeenCalledOnce())
    expect(mocks.request.mock.calls[0][0]).toEqual({
      path: '/hr/employees/employee-1/role',
      method: 'PUT',
      data: { role: 'HRD', confirmHrAccess: true, expectedVersion: 4 },
      signal: expect.any(AbortSignal),
    })
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(result))
    expect(onClose).toHaveBeenCalledOnce()
  })
  it('keeps a final-HRD denial visible and never calls profile PATCH or changes passwords', async () => {
    mocks.request.mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        status: 409,
        data: {
          type: 'urn:test',
          title: 'Protected',
          status: 409,
          code: 'LAST_ACTIVE_HRD',
          requestId: 'request-1',
        },
      },
    })
    renderDialog()
    const select = screen.getByRole('combobox', { name: 'Peran baru' })
    fireEvent.focus(select)
    fireEvent.click(screen.getByRole('option', { name: 'HRD' }))
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(
      screen.getByRole('button', { name: 'Simpan peran terpisah' }),
    )
    await screen.findByText(/Aktifkan HRD lain/)
    expect(mocks.request.mock.calls[0][0].path).toBe(
      '/hr/employees/employee-1/role',
    )
    expect(mocks.request.mock.calls[0][0].method).toBe('PUT')
  })
})
