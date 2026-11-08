import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createApiError } from '../../../shared/api/problem'
import {
  passwordServerErrors,
  validPasswordPolicy,
  validatePassword,
} from '../passwordValidation'
import PasswordPage from '../PasswordPage'
import ProfilePage from '../ProfilePage'

const mocks = vi.hoisted(() => {
  const request = vi.fn()
  return {
    request,
    api: { request },
    clear: vi.fn(),
    navigate: vi.fn(),
    refresh: vi.fn(),
    policy: {
      minLength: 4,
      maxLength: 20,
      requiresDifferentPassword: true,
    } as unknown,
    changed: false,
    role: 'EMPLOYEE',
  }
})
vi.mock('../../../shared/auth', () => ({
  useApi: () => mocks.api,
  useSession: () => ({
    profile: {
      id: 'employee-one',
      fullName: 'Contoh Karyawan',
      division: { name: 'Engineering' },
      position: { name: 'Developer' },
      email: 'contoh@example.test',
      role: mocks.role,
      status: 'ACTIVE',
      passwordPolicy: mocks.policy,
      hasPasswordChanged: mocks.changed,
      photo: null,
    },
    status: 'authenticated',
    clearSession: mocks.clear,
    refreshProfile: mocks.refresh,
    retry: vi.fn(),
    error: null,
  }),
}))
vi.mock('react-router', () => ({
  Link: ({
    to,
    children,
    ...props
  }: {
    to: string
    children: React.ReactNode
  }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => mocks.navigate,
}))
vi.mock('../../files/PrivateImage', () => ({
  PrivateImage: ({ alt }: { alt: string }) => (
    <span role="img" aria-label={alt}>
      CK
    </span>
  ),
}))
vi.mock('../../files/PrivateFileViewer', () => ({
  PrivateFileViewer: () => null,
}))

beforeEach(() => {
  mocks.policy = {
    minLength: 4,
    maxLength: 20,
    requiresDifferentPassword: true,
  }
  mocks.changed = false
  mocks.role = 'EMPLOYEE'
  mocks.request.mockReset().mockResolvedValue(undefined)
  mocks.clear.mockClear()
  mocks.navigate.mockClear()
})
function fill(
  current = 'old-password',
  next = '  new-password  ',
  confirm = next,
) {
  fireEvent.change(screen.getByLabelText(/^Kata sandi saat ini/), {
    target: { value: current },
  })
  fireEvent.change(screen.getByLabelText(/^Kata sandi baru/), {
    target: { value: next },
  })
  fireEvent.change(screen.getByLabelText(/^Konfirmasi kata sandi baru/), {
    target: { value: confirm },
  })
}
function form() {
  return screen
    .getByRole('button', { name: 'Simpan kata sandi' })
    .closest('form')!
}

describe('password validation and error mapping', () => {
  const policy = {
    minLength: 2,
    maxLength: 4,
    requiresDifferentPassword: true as const,
  }
  it('uses server boundaries and Unicode code points without trimming or normalizing', () => {
    expect(
      validatePassword(
        {
          currentPassword: 'old',
          newPassword: '🙂🙂',
          confirmPassword: '🙂🙂',
        },
        policy,
      ),
    ).toEqual({})
    expect(
      validatePassword(
        { currentPassword: 'old', newPassword: '  ', confirmPassword: '  ' },
        policy,
      ),
    ).toEqual({})
    expect(
      validatePassword(
        { currentPassword: 'old', newPassword: 'a', confirmPassword: 'a' },
        policy,
      ),
    ).toHaveProperty('newPassword')
    expect(
      validatePassword(
        {
          currentPassword: 'old',
          newPassword: '12345',
          confirmPassword: '12345',
        },
        policy,
      ),
    ).toHaveProperty('newPassword')
  })
  it('checks current password, exact confirmation and different-password requirements', () => {
    expect(
      validatePassword(
        { currentPassword: '', newPassword: 'ab', confirmPassword: ' ab' },
        policy,
      ),
    ).toMatchObject({
      currentPassword: expect.any(String),
      confirmPassword: expect.any(String),
    })
    expect(
      validatePassword(
        { currentPassword: 'ab', newPassword: 'ab', confirmPassword: 'ab' },
        policy,
      ),
    ).toHaveProperty('newPassword')
  })
  it('blocks missing or invalid policy instead of inventing defaults', () => {
    expect(validPasswordPolicy(policy)).toBe(true)
    for (const value of [
      null,
      undefined,
      {},
      { ...policy, minLength: 0 },
      { ...policy, maxLength: 1 },
      { ...policy, minLength: Infinity },
    ])
      expect(validPasswordPolicy(value)).toBe(false)
  })
  it('maps only password fields and known stable codes', () => {
    const error = createApiError('http', {
      status: 422,
      problem: {
        type: 'urn:problem',
        title: 'Invalid',
        status: 422,
        code: 'CURRENT_PASSWORD_INCORRECT',
        requestId: 'request',
        errors: [
          {
            field: 'newPassword',
            code: 'POLICY',
            message: 'Periksa kebijakan.',
          },
          { field: 'other', code: 'OTHER', message: 'Ignored' },
        ],
      },
    })
    expect(passwordServerErrors(error)).toEqual({
      currentPassword: 'Kata sandi saat ini tidak sesuai.',
      newPassword: 'Periksa kebijakan.',
    })
  })
})

describe('password component', () => {
  it('sends exact password values once and clears the session only after server confirmation', async () => {
    let confirm: (() => void) | undefined
    mocks.request.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          confirm = resolve
        }),
    )
    render(<PasswordPage />)
    fill()
    await act(async () => fireEvent.submit(form()))
    expect(mocks.clear).not.toHaveBeenCalled()
    expect(mocks.request).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/auth/password',
        method: 'POST',
        data: {
          currentPassword: 'old-password',
          newPassword: '  new-password  ',
          confirmPassword: '  new-password  ',
        },
      }),
    )
    await act(async () =>
      fireEvent.submit(
        screen
          .getByRole('button', { name: 'Memperbarui kata sandi…' })
          .closest('form')!,
      ),
    )
    expect(mocks.request).toHaveBeenCalledOnce()
    await act(async () => confirm!())
    expect(mocks.clear).toHaveBeenCalledOnce()
    expect(mocks.navigate).toHaveBeenCalledWith(
      '/login?message=password-changed',
      { replace: true },
    )
    expect(screen.getByLabelText(/^Kata sandi baru/)).toHaveValue('')
  })
  it('keeps values on domain failure and maps the wrong-current-password response inline', async () => {
    mocks.request.mockRejectedValueOnce(
      createApiError('http', {
        status: 422,
        problem: {
          type: 'urn:problem',
          title: 'Invalid',
          status: 422,
          code: 'CURRENT_PASSWORD_INCORRECT',
          requestId: 'request',
        },
      }),
    )
    render(<PasswordPage />)
    fill()
    await act(async () => fireEvent.submit(form()))
    expect(
      screen.getByLabelText(/^Kata sandi saat ini/),
    ).toHaveAccessibleDescription('Kata sandi saat ini tidak sesuai.')
    expect(screen.getByLabelText(/^Kata sandi baru/)).toHaveValue(
      '  new-password  ',
    )
    expect(mocks.clear).not.toHaveBeenCalled()
  })
  it('treats a lost response as uncertain and offers deliberate login without a second password request', async () => {
    mocks.request.mockRejectedValueOnce(createApiError('network'))
    render(<PasswordPage />)
    fill()
    await act(async () => fireEvent.submit(form()))
    expect(
      screen.getByRole('button', { name: 'Simpan kata sandi' }),
    ).toBeDisabled()
    expect(
      screen.getByText('Hasil perubahan belum diketahui'),
    ).toBeInTheDocument()
    fireEvent.click(
      screen.getByRole('button', { name: 'Masuk untuk memeriksa' }),
    )
    expect(mocks.clear).toHaveBeenCalledOnce()
    expect(mocks.navigate).toHaveBeenCalledWith(
      '/login?message=password-uncertain',
      { replace: true },
    )
    expect(mocks.request).toHaveBeenCalledOnce()
  })
  it('blocks unknown policy and supports explicit policy reload', () => {
    mocks.policy = undefined
    mocks.refresh.mockResolvedValue(undefined)
    render(<PasswordPage />)
    expect(
      screen.queryByRole('button', { name: 'Simpan kata sandi' }),
    ).not.toBeInTheDocument()
    fireEvent.click(
      screen.getByRole('button', { name: 'Muat ulang kebijakan' }),
    )
    expect(mocks.refresh).toHaveBeenCalledOnce()
  })
  it('does not retain password input after leaving and remounting the component', () => {
    const { unmount } = render(<PasswordPage />)
    fill()
    unmount()
    render(<PasswordPage />)
    expect(screen.getByLabelText(/^Kata sandi baru/)).toHaveValue('')
  })
})

describe('own profile', () => {
  it('shows a read-only photo/identity and a nonblocking initial-password warning', () => {
    render(<ProfilePage />)
    expect(
      screen.getByRole('heading', { name: 'Profil saya' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('img', { name: 'Contoh Karyawan' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Ganti kata sandi awal')).toBeInTheDocument()
    expect(
      screen.getAllByRole('link', { name: 'Ubah kata sandi' })[0],
    ).toHaveAttribute('href', '/app/password')
    expect(
      screen.queryByLabelText(/unggah|pilih foto/i),
    ).not.toBeInTheDocument()
  })
  it('uses the same profile entry for HR and removes the warning after a validated changed flag', () => {
    mocks.role = 'HRD'
    mocks.changed = true
    render(<ProfilePage />)
    expect(screen.getByText('HRD')).toBeInTheDocument()
    expect(screen.queryByText('Ganti kata sandi awal')).not.toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Ubah kata sandi' }),
    ).toHaveAttribute('href', '/app/password')
  })
})
