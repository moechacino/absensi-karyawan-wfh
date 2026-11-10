import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createApiError } from '../../../shared/api/problem'
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
function renderDialog(onClose = vi.fn(), onSaved = vi.fn(), target = employee) {
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
        employee={target}
        open
        onClose={onClose}
        onSaved={onSaved}
      />
    </QueryClientProvider>,
  )
  return { onClose, onSaved, client }
}
beforeEach(() => {
  mocks.request.mockReset()
  mocks.clearSession.mockReset()
})

function chooseHr() {
  fireEvent.focus(screen.getByRole('combobox', { name: 'Peran baru' }))
  fireEvent.click(screen.getByRole('option', { name: 'HRD' }))
  fireEvent.click(screen.getByRole('checkbox'))
  fireEvent.click(screen.getByRole('button', { name: 'Simpan peran terpisah' }))
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

  it('reads the server role after an uncertain result without replaying the PUT', async () => {
    const result = { ...employee, role: 'HRD' as const, version: 5 }
    mocks.request.mockRejectedValueOnce(createApiError('network'))
    mocks.request.mockResolvedValueOnce(result)
    const { onSaved, onClose } = renderDialog()
    chooseHr()
    fireEvent.click(await screen.findByRole('button', { name: 'Tinjau versi terbaru untuk peran' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(result))
    expect(mocks.request.mock.calls.map(([request]) => request.method ?? 'GET')).toEqual(['PUT', 'GET'])
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('requires fresh confirmation and the latest version after a conflict', async () => {
    mocks.request.mockRejectedValueOnce(createApiError('http', {
      status: 409,
      problem: { type: 'urn:problem', title: 'Conflict', status: 409, code: 'VERSION_CONFLICT', requestId: 'hidden-id' },
    }))
    mocks.request.mockResolvedValueOnce({ ...employee, version: 7 })
    mocks.request.mockResolvedValueOnce({ ...employee, role: 'HRD', version: 8 })
    renderDialog()
    chooseHr()
    fireEvent.click(await screen.findByRole('button', { name: 'Tinjau versi terbaru untuk peran' }))
    await screen.findByText(/Versi 7:/)
    const save = screen.getByRole('button', { name: 'Simpan peran terpisah' })
    expect(save).toBeDisabled()
    expect(screen.queryByText(/hidden-id/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(save)
    await waitFor(() => expect(mocks.request).toHaveBeenCalledTimes(3))
    expect(mocks.request.mock.calls[2][0].data).toEqual({ role: 'HRD', confirmHrAccess: true, expectedVersion: 7 })
  })

  it('clears the current session when its own role changes', async () => {
    const own = { ...employee, id: 'hr-1', role: 'HRD' as const }
    mocks.request.mockResolvedValueOnce({ ...own, role: 'EMPLOYEE', version: 5 })
    const { onSaved } = renderDialog(vi.fn(), vi.fn(), own)
    fireEvent.focus(screen.getByRole('combobox', { name: 'Peran baru' }))
    fireEvent.click(screen.getByRole('option', { name: 'Karyawan' }))
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: 'Simpan peran terpisah' }))
    await waitFor(() => expect(mocks.clearSession).toHaveBeenCalledOnce())
    expect(onSaved).not.toHaveBeenCalled()
  })
})
