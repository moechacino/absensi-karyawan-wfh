import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MasterEditor } from '../MasterEditor'

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  invalidate: vi.fn(),
  run: vi.fn(),
  retry: vi.fn(),
  reset: vi.fn(),
  state: { status: 'idle', error: null as unknown },
  configuration: {} as { onConfirmed?: () => Promise<void> },
}))
vi.mock('../../../shared/auth', () => ({
  useApi: () => ({ request: mocks.request }),
  useSession: () => ({ profile: { id: 'actor' } }),
}))
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidate }),
}))
vi.mock('../../../shared/commands/useCommand', () => ({
  useCommand: (configuration: typeof mocks.configuration) => {
    mocks.configuration = configuration
    return {
      ...mocks.state,
      run: mocks.run,
      retry: mocks.retry,
      reset: mocks.reset,
    }
  },
}))
vi.mock('../../../shared/ui/Dialog', () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}))
vi.mock('../OrganizationFields', () => ({ OrganizationFields: () => <div /> }))

const original = {
  id: 'id',
  code: 'ENG',
  name: 'Engineering',
  description: null,
  status: 'ACTIVE' as const,
  version: 1,
}

describe('master editor', () => {
  it('retains a changed draft after conflict and requires explicit latest-version review', async () => {
    mocks.state = {
      status: 'conflict',
      error: {
        kind: 'http',
        message: 'Konflik',
        problem: { code: 'VERSION_CONFLICT' },
      },
    }
    mocks.request.mockResolvedValue({
      items: [{ ...original, name: 'Server baru', version: 4 }],
      pagination: { totalPages: 1 },
    })
    const { rerender } = render(
      <MasterEditor kind="divisions" original={original} onClose={vi.fn()} />,
    )
    fireEvent.change(screen.getByRole('textbox', { name: /Nama/ }), {
      target: { value: 'Draft dipertahankan' },
    })
    expect(screen.getByRole('button', { name: 'Simpan divisi' })).toBeDisabled()
    fireEvent.click(
      screen.getByRole('button', { name: 'Tinjau versi server terbaru' }),
    )
    await waitFor(() =>
      expect(screen.getByText(/Versi server 4/)).toBeInTheDocument(),
    )
    expect(screen.getByRole('textbox', { name: /Nama/ })).toHaveValue(
      'Draft dipertahankan',
    )
    mocks.state = { status: 'idle', error: null }
    rerender(
      <MasterEditor kind="divisions" original={original} onClose={vi.fn()} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Simpan divisi' }))
    expect(mocks.run).toHaveBeenCalledWith(
      expect.objectContaining({
        version: 4,
        draft: expect.objectContaining({ name: 'Draft dipertahankan' }),
      }),
    )
  })

  it('locks uncertain drafts and invalidates selectors/employee labels only after confirmation', async () => {
    mocks.state = {
      status: 'uncertain',
      error: { kind: 'network', message: 'Belum diketahui' },
    }
    const close = vi.fn()
    render(
      <MasterEditor kind="divisions" original={original} onClose={close} />,
    )
    expect(screen.getByRole('textbox', { name: /Nama/ })).toBeDisabled()
    expect(close).not.toHaveBeenCalled()
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Periksa dengan mencoba intent yang sama',
      }),
    )
    expect(mocks.retry).toHaveBeenCalledOnce()
    await mocks.configuration.onConfirmed?.()
    expect(mocks.invalidate).toHaveBeenCalledWith({
      queryKey: ['private', 'actor', 'organization'],
    })
    expect(mocks.invalidate).toHaveBeenCalledWith({
      queryKey: ['private', 'actor', 'employees'],
    })
    expect(close).toHaveBeenCalledOnce()
  })
})
