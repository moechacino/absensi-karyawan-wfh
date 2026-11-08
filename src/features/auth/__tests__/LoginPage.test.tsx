import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createApiError } from '../../../shared/api/problem'
import LoginPage from '../LoginPage'

const mock = vi.hoisted(() => ({
  login: vi.fn(),
  retry: vi.fn(),
  clearSession: vi.fn(),
  navigate: vi.fn(),
  state: 'anonymous',
}))
vi.mock('../../../shared/auth', () => ({
  useSession: () => ({
    status: mock.state,
    profile: null,
    error: null,
    reason: null,
    login: mock.login,
    retry: mock.retry,
    clearSession: mock.clearSession,
  }),
}))
vi.mock('react-router', () => ({
  useNavigate: () => mock.navigate,
  useSearchParams: () => [new URLSearchParams('returnTo=https://bad.example')],
}))

beforeEach(() => {
  mock.state = 'anonymous'
  mock.login.mockReset().mockResolvedValue(undefined)
})
function fill() {
  fireEvent.change(screen.getByLabelText(/^Email kantor/), {
    target: { value: 'contoh@example.test' },
  })
  fireEvent.change(screen.getByLabelText(/^Kata sandi/), {
    target: { value: '  short  ' },
  })
}

describe('LoginPage', () => {
  it('submits exact credentials without imposing new-password policy and clears the password on success', async () => {
    render(<LoginPage />)
    fill()
    await act(async () =>
      fireEvent.submit(
        screen.getByRole('button', { name: 'Masuk' }).closest('form')!,
      ),
    )
    expect(mock.login).toHaveBeenCalledWith({
      email: 'contoh@example.test',
      password: '  short  ',
    })
    expect(screen.getByLabelText(/^Kata sandi/)).toHaveValue('')
    expect(screen.queryByText(/lupa kata sandi/i)).not.toBeInTheDocument()
  })
  it('uses a generic 401 message that does not reveal account existence', async () => {
    mock.login.mockRejectedValue(createApiError('http', { status: 401 }))
    render(<LoginPage />)
    fill()
    await act(async () =>
      fireEvent.submit(
        screen.getByRole('button', { name: 'Masuk' }).closest('form')!,
      ),
    )
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Email atau kata sandi tidak sesuai, atau akun tidak aktif.',
    )
    expect(screen.getByLabelText(/^Kata sandi/)).toHaveValue('  short  ')
  })
  it('honors a Retry-After cooldown and prevents duplicate submission during it', async () => {
    vi.useFakeTimers()
    mock.login.mockRejectedValue(
      createApiError('http', { status: 429, retryAfter: '3' }),
    )
    render(<LoginPage />)
    fill()
    const form = screen.getByRole('button', { name: 'Masuk' }).closest('form')!
    await act(async () => fireEvent.submit(form))
    expect(
      screen.getByRole('button', { name: 'Coba lagi dalam 3 detik' }),
    ).toBeDisabled()
    await act(async () => fireEvent.submit(form))
    expect(mock.login).toHaveBeenCalledOnce()
    await act(async () => vi.advanceTimersByTimeAsync(3000))
    expect(screen.getByRole('button', { name: 'Masuk' })).toBeEnabled()
  })
  it('keeps protected content hidden during restoration', () => {
    mock.state = 'loading'
    render(<LoginPage />)
    expect(screen.getByRole('status')).toHaveTextContent('Memulihkan sesi')
    expect(
      screen.queryByRole('button', { name: 'Masuk' }),
    ).not.toBeInTheDocument()
  })
})
