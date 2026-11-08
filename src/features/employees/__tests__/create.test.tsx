import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import CreateEmployeePage from '../CreateEmployeePage'
import { createApiError } from '../../../shared/api/problem'
import type { EmployeeDraft } from '../model'

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  invalidate: vi.fn(),
  actor: 'actor',
}))
vi.mock('../../../shared/auth', () => ({
  useApi: () => ({ request: mocks.request }),
  useSession: () => ({ profile: { id: mocks.actor } }),
}))
vi.mock('../../../shared/config', () => ({
  publicConfig: { appUrl: 'https://app.example' },
}))
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidate }),
}))
vi.mock('../EmployeeFields', () => ({
  EmployeeFields: ({
    draft,
    onChange,
    disabled,
  }: {
    draft: EmployeeDraft
    onChange: (draft: EmployeeDraft) => void
    disabled: boolean
  }) => (
    <div>
      <button
        type="button"
        disabled={disabled}
        onClick={() =>
          onChange({
            fullName: 'Contoh',
            email: 'contoh@example.test',
            divisionId: 'division',
            positionId: 'position',
            status: 'ACTIVE',
            role: 'EMPLOYEE',
          })
        }
      >
        Isi data uji
      </button>
      <input
        aria-label="Nama lengkap"
        value={draft.fullName}
        disabled={disabled}
        readOnly
      />
    </div>
  ),
}))
vi.mock('../../../shared/ui/Dialog', () => ({ ConfirmationDialog: () => null }))
const result = {
  employee: { id: 'created-employee-id', fullName: 'Contoh' },
  initialCredentials: {
    email: 'contoh@example.test',
    initialPassword: 'fictional-initial-password',
  },
}

function Example() {
  return (
    <MemoryRouter>
      <CreateEmployeePage />
    </MemoryRouter>
  )
}

beforeEach(() => {
  mocks.request.mockReset()
  mocks.actor = 'actor'
})

describe('employee create command', () => {
  it('blocks double submit and retries uncertainty with the same key/body, then clears secrets without reopening create', async () => {
    let reject: (reason: unknown) => void = () => undefined
    mocks.request
      .mockReturnValueOnce(
        new Promise((_resolve, fail) => {
          reject = fail
        }),
      )
      .mockResolvedValueOnce(result)
    render(<Example />)
    fireEvent.click(screen.getByRole('button', { name: 'Isi data uji' }))
    fireEvent.click(screen.getByRole('button', { name: 'Simpan karyawan' }))
    fireEvent.click(screen.getByRole('button', { name: 'Simpan karyawan' }))
    await waitFor(() => expect(mocks.request).toHaveBeenCalledOnce())
    await act(async () => reject(createApiError('network')))
    expect(screen.getByRole('textbox', { name: 'Nama lengkap' })).toBeDisabled()
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Periksa dengan mencoba intent yang sama',
      }),
    )
    await waitFor(() =>
      expect(screen.getByLabelText('Kata sandi awal')).toHaveValue(
        result.initialCredentials.initialPassword,
      ),
    )
    expect(mocks.request.mock.calls[1][0].idempotencyKey).toBe(
      mocks.request.mock.calls[0][0].idempotencyKey,
    )
    expect(mocks.request.mock.calls[1][0].data).toEqual(
      mocks.request.mock.calls[0][0].data,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Tutup kredensial' }))
    expect(screen.queryByLabelText('Kata sandi awal')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Simpan karyawan' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Selesai dan lihat karyawan' }),
    ).toHaveAttribute('href', '/hr/employees/created-employee-id')
  })

  it('routes a creation replay with unavailable credentials to the created employee without regenerating an account', async () => {
    mocks.request.mockRejectedValue(
      createApiError('http', {
        status: 409,
        problem: {
          type: 'urn:problem',
          title: 'Unavailable',
          status: 409,
          code: 'INITIAL_CREDENTIALS_UNAVAILABLE',
          requestId: 'request',
          details: { employeeId: 'created', alreadyCreated: true },
        },
      }),
    )
    render(<Example />)
    fireEvent.click(screen.getByRole('button', { name: 'Isi data uji' }))
    fireEvent.click(screen.getByRole('button', { name: 'Simpan karyawan' }))
    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: 'Akun sudah dibuat' }),
      ).toBeInTheDocument(),
    )
    expect(mocks.request).toHaveBeenCalledOnce()
    expect(
      screen.queryByRole('button', { name: 'Simpan karyawan' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Lihat karyawan yang dibuat' }),
    ).toHaveAttribute('href', '/hr/employees/created')
  })
})
