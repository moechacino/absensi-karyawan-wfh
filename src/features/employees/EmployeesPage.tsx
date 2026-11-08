import { Link, useSearchParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { useApi, useSession } from '../../shared/auth'
import { TextField } from '../../shared/forms/TextField'
import { SelectField } from '../../shared/forms/SelectField'
import {
  Badge,
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../shared/ui/Feedback'
import { Pagination } from '../../shared/ui/Pagination'
import { ResponsiveList } from '../../shared/ui/ResponsiveList'
import { employeeFilters } from './model'
import { employeesApi } from './api'
import { DivisionFilter } from './DivisionFilter'

export default function EmployeesPage() {
  const api = useApi(),
    { profile } = useSession()
  const [search, setSearch] = useSearchParams()
  const filters = employeeFilters(search)
  const query = useQuery({
    queryKey: ['private', profile?.id, 'employees', 'list', filters],
    queryFn: ({ signal }) => employeesApi(api).list(filters, signal),
    enabled: Boolean(profile),
  })
  function filter(name: string, value: string) {
    const next = new URLSearchParams(search)
    if (value) next.set(name, value)
    else next.delete(name)
    if (name !== 'page') next.delete('page')
    setSearch(next)
  }
  const detail = (id: string) =>
    `/hr/employees/${encodeURIComponent(id)}${search.size ? `?${search}` : ''}`
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-heading font-medium">Data karyawan</h1>
          <p className="mt-2 text-text-muted">
            Kelola identitas, divisi, dan akses akun karyawan.
          </p>
        </div>
        <Link
          className="min-h-13 rounded-control bg-action px-5 py-3 text-on-action"
          to={`/hr/employees/new${search.size ? `?${search}` : ''}`}
        >
          Tambah karyawan
        </Link>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <TextField
          label="Cari nama, email, atau ID akun"
          type="search"
          value={filters.q ?? ''}
          maxLength={160}
          onChange={(event) => filter('q', event.target.value)}
        />
        <SelectField
          label="Filter status"
          value={filters.status ?? ''}
          options={[
            { value: '', label: 'Semua status' },
            { value: 'ACTIVE', label: 'Aktif' },
            { value: 'INACTIVE', label: 'Nonaktif' },
          ]}
          onChange={(value) => filter('status', value)}
        />
        <DivisionFilter
          value={filters.divisionId ?? ''}
          onChange={(value) => filter('divisionId', value)}
        />
        <SelectField
          label="Filter peran"
          value={filters.role ?? ''}
          options={[
            { value: '', label: 'Semua peran' },
            { value: 'EMPLOYEE', label: 'Karyawan' },
            { value: 'HRD', label: 'HRD' },
          ]}
          onChange={(value) => filter('role', value)}
        />
      </div>
      <p className="text-small text-text-muted">
        Menonaktifkan akun tidak menghapus catatan absensi yang sudah tersimpan.
      </p>
      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : (
        <div className="space-y-5 rounded-card border border-border bg-surface p-4 sm:p-6">
          <p className="text-small text-text-muted">
            {query.data.pagination.totalItems} karyawan sesuai filter
          </p>
          <ResponsiveList
            label="Daftar karyawan"
            items={query.data.items}
            rowKey={(row) => row.id}
            columns={[
              {
                key: 'employee',
                heading: 'Karyawan',
                render: (row) => (
                  <Link
                    className="font-medium underline underline-offset-4"
                    to={detail(row.id)}
                  >
                    {row.fullName}
                    <span className="block font-mono text-label text-text-muted">
                      ID {row.id.slice(0, 8)}
                    </span>
                  </Link>
                ),
              },
              {
                key: 'email',
                heading: 'Email kantor',
                render: (row) => row.email,
              },
              {
                key: 'division',
                heading: 'Divisi / posisi',
                render: (row) => `${row.division.name} / ${row.position.name}`,
              },
              {
                key: 'role',
                heading: 'Peran',
                render: (row) => (row.role === 'HRD' ? 'HRD' : 'Karyawan'),
              },
              {
                key: 'status',
                heading: 'Status',
                render: (row) => (
                  <Badge tone={row.status === 'ACTIVE' ? 'success' : 'neutral'}>
                    {row.status === 'ACTIVE' ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                ),
              },
            ]}
            renderCard={(row) => (
              <div className="space-y-2">
                <Link
                  className="font-medium underline underline-offset-4"
                  to={detail(row.id)}
                >
                  {row.fullName}
                </Link>
                <p className="font-mono text-label">ID {row.id.slice(0, 8)}</p>
                <p className="break-all">{row.email}</p>
                <p>
                  {row.division.name} · {row.position.name}
                </p>
                <Badge>
                  {row.role === 'HRD' ? 'HRD' : 'Karyawan'} ·{' '}
                  {row.status === 'ACTIVE' ? 'Aktif' : 'Nonaktif'}
                </Badge>
              </div>
            )}
            empty={
              <EmptyState title="Belum ada karyawan sesuai filter">
                Ubah filter atau tambahkan karyawan baru.
              </EmptyState>
            }
          />
          <Pagination
            page={query.data.pagination.page}
            totalPages={query.data.pagination.totalPages}
            busy={query.isFetching}
            onPageChange={(page) => filter('page', String(page))}
          />
        </div>
      )}
    </div>
  )
}
