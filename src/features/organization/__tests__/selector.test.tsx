import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { OrganizationFields } from '../OrganizationFields'

const mocks = vi.hoisted(() => ({
  more: vi.fn(),
  change: vi.fn(),
  query: vi.fn(),
}))
vi.mock('../../../shared/auth', () => ({
  useApi: () => ({}),
  useSession: () => ({ profile: { id: 'actor' } }),
}))
vi.mock('@tanstack/react-query', () => ({
  useInfiniteQuery: (options: unknown) => mocks.query(options),
}))

function queries() {
  mocks.query.mockImplementation((config: { queryKey: unknown[] }) => ({
    data: {
      pages: [
        {
          items:
            config.queryKey[3] === 'division-options'
              ? [{ id: 'new', code: 'NEW', name: 'Divisi baru' }]
              : [{ id: 'p', code: 'POS', name: 'Posisi baru' }],
        },
      ],
    },
    hasNextPage: true,
    fetchNextPage: mocks.more,
    isFetching: false,
  }))
}

describe('organization selector', () => {
  it('retains a historical label and clears incompatible position when selecting another division', () => {
    queries()
    render(
      <OrganizationFields
        divisionId="old"
        positionId="old-position"
        onChange={mocks.change}
        existingDivision={{ id: 'old', code: 'OLD', name: 'Divisi lama' }}
        existingPosition={{
          id: 'old-position',
          code: 'OLDP',
          name: 'Posisi lama',
        }}
      />,
    )
    expect(
      screen.getByText('Divisi lama · OLD (referensi saat ini)'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Posisi lama · OLDP (referensi saat ini)'),
    ).toBeInTheDocument()
    fireEvent.focus(screen.getByRole('combobox', { name: /Divisi/ }))
    fireEvent.click(screen.getByRole('option', { name: 'Divisi baru · NEW' }))
    expect(mocks.change).toHaveBeenCalledWith({
      divisionId: 'new',
      positionId: '',
    })
  })
  it('exposes explicit pagination instead of assuming the first options page is complete', () => {
    queries()
    render(
      <OrganizationFields divisionOnly divisionId="" onChange={mocks.change} />,
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'Muat pilihan lainnya' }),
    )
    expect(mocks.more).toHaveBeenCalledOnce()
    expect(mocks.query.mock.calls[0][0].queryKey).toContain('actor')
  })
})
