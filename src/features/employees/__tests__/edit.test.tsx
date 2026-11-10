import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import EditEmployeePage from '../EditEmployeePage'
import { createApiError } from '../../../shared/api/problem'
import type { EmployeeDraft } from '../model'

const mocks = vi.hoisted(() => ({ request: vi.fn(), refreshProfile: vi.fn(), clearSession: vi.fn() }))
vi.mock('../../../shared/auth', () => ({
  useApi: () => ({ request: mocks.request }),
  useSession: () => ({ profile: { id: 'hr' }, refreshProfile: mocks.refreshProfile, clearSession: mocks.clearSession }),
}))
vi.mock('../../files/PrivateImage', () => ({ PrivateImage: () => null }))
vi.mock('../EmployeeFields', () => ({
  EmployeeFields: ({ draft, onChange, disabled }: {
    draft: EmployeeDraft
    onChange: (patch: Partial<EmployeeDraft>) => void
    disabled?: boolean
  }) => <input aria-label="Nama lengkap" value={draft.fullName} disabled={disabled} onChange={event => onChange({ fullName: event.target.value })} />,
}))

const employee = {
  id: 'employee', fullName: 'Contoh', email: 'contoh@example.test',
  division: { id: 'division', code: 'DIV', name: 'Divisi' },
  position: { id: 'position', code: 'POS', name: 'Posisi' },
  role: 'EMPLOYEE', status: 'ACTIVE', version: 4, photo: null,
}

function example() {
  const cache = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={cache}>
    <MemoryRouter initialEntries={['/hr/employees/employee/edit']}>
      <Routes><Route path="/hr/employees/:employeeId/edit" element={<EditEmployeePage />} /></Routes>
    </MemoryRouter>
  </QueryClientProvider>)
}

beforeEach(() => {
  mocks.request.mockReset()
})

describe('employee information editor', () => {
  it('sends changed information and a decimal version as multipart, without role', async () => {
    mocks.request.mockImplementation(async ({ method }) => method === 'PATCH'
      ? { ...employee, fullName: 'Baru', version: 5 }
      : employee)
    example()
    fireEvent.change(await screen.findByLabelText('Nama lengkap'), { target: { value: 'Baru' } })
    fireEvent.click(screen.getByRole('button', { name: 'Simpan profil' }))
    await waitFor(() => expect(mocks.request.mock.calls.some(([request]) => request.method === 'PATCH')).toBe(true))
    const sent = mocks.request.mock.calls.find(([request]) => request.method === 'PATCH')![0]
    expect(sent.path).toBe('/hr/employees/employee')
    expect(sent.idempotencyKey).toEqual(expect.any(String))
    expect(sent.data).toBeInstanceOf(FormData)
    expect(Object.fromEntries(sent.data)).toEqual({ fullName: 'Baru', expectedVersion: '4' })
    await screen.findByText(/Perubahan profil dan foto tersimpan/)
  })

  it('blocks invalid replacement photos without throwing or sending a PATCH', async () => {
    mocks.request.mockResolvedValue(employee)
    example()
    await screen.findByLabelText('Nama lengkap')
    fireEvent.change(screen.getByLabelText('Foto pengganti (opsional)'), {
      target: { files: [new File(['pdf'], 'photo.pdf', { type: 'application/pdf' })] },
    })
    expect(screen.getByRole('button', { name: 'Simpan profil' })).toBeDisabled()
    expect(screen.getByText('Gunakan gambar JPEG, PNG, atau WebP.')).toBeInTheDocument()
    expect(mocks.request.mock.calls.every(([request]) => request.method !== 'PATCH')).toBe(true)
  })

  it('retains local edits and adopts the latest version and role during conflict review', async () => {
    let latest = false
    mocks.request.mockImplementation(async ({ method }) => {
      if (method === 'PATCH' && !latest) {
        latest = true
        throw createApiError('http', {
          status: 409,
          problem: { type: 'urn:problem', title: 'Conflict', status: 409, code: 'VERSION_CONFLICT', requestId: 'hidden' },
        })
      }
      return latest ? { ...employee, role: 'HRD', version: 6 } : employee
    })
    example()
    fireEvent.change(await screen.findByLabelText('Nama lengkap'), { target: { value: 'Lokal' } })
    fireEvent.click(screen.getByRole('button', { name: 'Simpan profil' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Muat versi terbaru sambil mempertahankan isian' }))
    await screen.findByText(/Versi 6 dimuat/)
    expect(screen.getByLabelText('Nama lengkap')).toHaveValue('Lokal')
    fireEvent.click(screen.getByRole('button', { name: 'Simpan profil' }))
    await waitFor(() => expect(mocks.request.mock.calls.filter(([request]) => request.method === 'PATCH')).toHaveLength(2))
    const writes = mocks.request.mock.calls.filter(([request]) => request.method === 'PATCH')
    expect(Object.fromEntries(writes[1][0].data)).toEqual({ fullName: 'Lokal', expectedVersion: '6' })
    expect(writes[1][0].idempotencyKey).not.toBe(writes[0][0].idempotencyKey)
  })
})
