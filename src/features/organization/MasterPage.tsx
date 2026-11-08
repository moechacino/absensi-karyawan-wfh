import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { useApi, useSession } from '../../shared/auth'
import { TextField } from '../../shared/forms/TextField'
import { SelectField } from '../../shared/forms/SelectField'
import { Button } from '../../shared/ui/Button'
import {
  Badge,
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../shared/ui/Feedback'
import { Pagination } from '../../shared/ui/Pagination'
import { ResponsiveList } from '../../shared/ui/ResponsiveList'
import { organizationApi } from './api'
import { masterFilters } from './model'
import type { Master, MasterKind, MasterPageResult } from './model'
import { MasterEditor } from './MasterEditor'
import { OrganizationFields } from './OrganizationFields'

export function MasterPage({ kind }: { kind: MasterKind }) {
  const api = useApi()
  const { profile } = useSession()
  const [search, setSearch] = useSearchParams()
  const filters = masterFilters(search)
  const [editor, setEditor] = useState<{ original?: Master } | null>(null)
  const title = kind === 'divisions' ? 'Divisi' : 'Posisi'
  const query = useQuery<MasterPageResult>({
    queryKey: ['private', profile?.id, 'organization', kind, filters],
    queryFn: ({ signal }) => organizationApi(api)[kind](filters, signal),
    enabled: Boolean(profile),
  })
  function filter(name: string, value: string) {
    const next = new URLSearchParams(search)
    if (value) next.set(name, value)
    else next.delete(name)
    if (name !== 'page') next.delete('page')
    setSearch(next)
  }
  const items = query.data?.items ?? []
  function edit(row: Master) {
    return (
      <Button variant="ghost" onClick={() => setEditor({ original: row })}>
        Edit {row.name}
      </Button>
    )
  }
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-heading font-medium">Divisi &amp; posisi</h1>
          <p className="mt-2 text-text-muted">
            Kelola struktur organisasi yang digunakan pada data karyawan.
          </p>
        </div>
        <Button onClick={() => setEditor({})}>
          Tambah {title.toLowerCase()}
        </Button>
      </header>
      <nav aria-label="Jenis organisasi" className="flex gap-3">
        <Link
          className={`min-h-touch rounded-control border px-6 py-3 ${kind === 'divisions' ? 'border-forest bg-forest text-on-action' : 'border-control-border'}`}
          to="/hr/divisions"
        >
          Divisi
        </Link>
        <Link
          className={`min-h-touch rounded-control border px-6 py-3 ${kind === 'positions' ? 'border-forest bg-forest text-on-action' : 'border-control-border'}`}
          to="/hr/positions"
        >
          Posisi
        </Link>
      </nav>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label={`Cari nama atau kode ${title.toLowerCase()}`}
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
      </div>
      {kind === 'positions' && (
        <div className="space-y-2">
          <OrganizationFields
            divisionOnly
            divisionId={filters.divisionId ?? ''}
            onChange={({ divisionId }) => filter('divisionId', divisionId)}
          />
          {filters.divisionId && (
            <Button variant="ghost" onClick={() => filter('divisionId', '')}>
              Semua divisi
            </Button>
          )}
        </div>
      )}
      <p className="text-small text-text-muted">
        Data nonaktif tetap tersimpan pada referensi dan riwayat karyawan.
      </p>
      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : (
        <div className="space-y-5 rounded-card border border-border bg-surface p-4 sm:p-6">
          <ResponsiveList
            label={`Daftar ${title.toLowerCase()}`}
            items={items}
            rowKey={(row) => row.id}
            columns={[
              {
                key: 'name',
                heading: `Nama ${title.toLowerCase()}`,
                render: (row) => (
                  <div>
                    <p className="font-medium">{row.name}</p>
                    {'description' in row && row.description && (
                      <p className="text-small text-text-muted">
                        {row.description}
                      </p>
                    )}
                  </div>
                ),
              },
              { key: 'code', heading: 'Kode', render: (row) => row.code },
              ...(kind === 'positions'
                ? [
                    {
                      key: 'division',
                      heading: 'Divisi',
                      render: (row: Master) =>
                        'division' in row ? row.division.name : '',
                    },
                  ]
                : []),
              {
                key: 'status',
                heading: 'Status',
                render: (row) => (
                  <Badge tone={row.status === 'ACTIVE' ? 'success' : 'neutral'}>
                    {row.status === 'ACTIVE' ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                ),
              },
              { key: 'action', heading: 'Tindakan', render: edit },
            ]}
            renderCard={(row) => (
              <div className="space-y-2">
                <h2 className="font-medium">{row.name}</h2>
                <p>
                  {row.code}
                  {'division' in row ? ` · ${row.division.name}` : ''}
                </p>
                <Badge>{row.status === 'ACTIVE' ? 'Aktif' : 'Nonaktif'}</Badge>
                {edit(row)}
              </div>
            )}
            empty={
              <EmptyState
                title={
                  filters.q
                    ? 'Tidak ada hasil yang cocok'
                    : `Belum ada ${title.toLowerCase()}`
                }
              >
                Ubah filter atau tambahkan data baru.
              </EmptyState>
            }
          />
          <Pagination
            page={query.data?.pagination.page ?? filters.page}
            totalPages={query.data?.pagination.totalPages ?? 0}
            busy={query.isFetching}
            onPageChange={(page) => filter('page', String(page))}
          />
        </div>
      )}
      {editor && (
        <MasterEditor
          key={editor.original?.id ?? 'create'}
          kind={kind}
          original={editor.original}
          onClose={() => setEditor(null)}
        />
      )}
    </div>
  )
}
