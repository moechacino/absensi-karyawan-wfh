import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import EmployeeDetailPage from '../EmployeeDetailPage'
import { createApiError } from '../../../shared/api/problem'

const mocks = vi.hoisted(() => ({ request: vi.fn(), actor: 'actor-one' }))
vi.mock('../../../shared/auth', () => ({
  useApi: () => ({ request: mocks.request }),
  useSession: () => ({ profile: { id: mocks.actor } }),
}))
vi.mock('../../../shared/config', () => ({
  publicConfig: { appUrl: 'https://app.example' },
}))
vi.mock('../../files/PrivateImage', () => ({ PrivateImage: () => <span /> }))
vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({
    data: {
      id: 'employee',
      fullName: 'Contoh',
      email: 'contoh@example.test',
      role: 'EMPLOYEE',
      status: 'ACTIVE',
      hasPasswordChanged: false,
      division: { name: 'Divisi', code: 'DIV' },
      position: { name: 'Posisi', code: 'POS' },
      photo: null,
    },
    isPending: false,
    isError: false,
  }),
}))
const credentials = {
  email: 'contoh@example.test',
  initialPassword: 'fictional-initial-password',
}

function Example() {
  return (
    <MemoryRouter>
      <EmployeeDetailPage />
    </MemoryRouter>
  )
}

describe('initial credential access lifetime', () => {
  it('never prefetches and drops credentials on close and account replacement', async () => {
    mocks.actor = 'actor-one'
    mocks.request.mockResolvedValue({
      employeeId: 'employee',
      initialCredentials: credentials,
    })
    const { rerender } = render(<Example />)
    expect(mocks.request).not.toHaveBeenCalled()
    fireEvent.click(
      screen.getByRole('button', { name: 'Lihat kredensial awal' }),
    )
    await waitFor(() =>
      expect(screen.getByLabelText('Kata sandi awal')).toHaveValue(
        credentials.initialPassword,
      ),
    )
    expect(sessionStorage.length).toBe(0)
    expect(localStorage.length).toBe(0)
    fireEvent.click(screen.getByRole('button', { name: 'Tutup kredensial' }))
    expect(screen.queryByLabelText('Kata sandi awal')).not.toBeInTheDocument()
    fireEvent.click(
      screen.getByRole('button', { name: 'Lihat kredensial awal' }),
    )
    await waitFor(() =>
      expect(screen.getByLabelText('Kata sandi awal')).toBeInTheDocument(),
    )
    mocks.actor = 'actor-two'
    rerender(<Example />)
    expect(screen.queryByLabelText('Kata sandi awal')).not.toBeInTheDocument()
    expect(mocks.request).toHaveBeenCalledTimes(2)
  })

  it('ignores a late secret response after closing the pending request', async () => {
    let resolve: (value: unknown) => void = () => undefined
    mocks.request.mockReturnValue(
      new Promise((done) => {
        resolve = done
      }),
    )
    render(<Example />)
    fireEvent.click(
      screen.getByRole('button', { name: 'Lihat kredensial awal' }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Batalkan pembacaan' }))
    await act(async () =>
      resolve({ employeeId: 'employee', initialCredentials: credentials }),
    )
    expect(screen.queryByLabelText('Kata sandi awal')).not.toBeInTheDocument()
    expect(mocks.request.mock.calls[0][0].signal.aborted).toBe(true)
  })

  it('honors a credential-unavailable race without displaying a password', async () => {
    mocks.request.mockRejectedValue(
      createApiError('http', {
        status: 409,
        problem: {
          type: 'urn:problem',
          title: 'Unavailable',
          status: 409,
          code: 'INITIAL_CREDENTIALS_UNAVAILABLE',
          requestId: 'request',
        },
      }),
    )
    render(<Example />)
    fireEvent.click(
      screen.getByRole('button', { name: 'Lihat kredensial awal' }),
    )
    await waitFor(() =>
      expect(
        screen.getByText(/sudah tidak tersedia karena pemilik/),
      ).toBeInTheDocument(),
    )
    expect(screen.queryByLabelText('Kata sandi awal')).not.toBeInTheDocument()
  })
})
