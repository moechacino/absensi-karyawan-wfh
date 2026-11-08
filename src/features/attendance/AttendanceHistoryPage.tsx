import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router'
import { useApi, useSession } from '../../shared/auth'
import { useHome } from '../home/api'
import { historyFilters, updateFilter } from './historyFilters'
import { listAttendanceDays } from './historyApi'
import { AttendanceDayCard } from './AttendanceDayCard'
import { TextField } from '../../shared/forms/TextField'
import { Pagination } from '../../shared/ui/Pagination'
import { EmptyState, LoadingState } from '../../shared/ui/Feedback'
import { QueryError } from '../../shared/ui/QueryFeedback'
import { Button } from '../../shared/ui/Button'

export default function AttendanceHistoryPage() {
  const api = useApi(),
    { profile } = useSession(),
    home = useHome(),
    [params, setParams] = useSearchParams()
  const filters = historyFilters(params, home.data?.companyDate)
  const { valid, ...queryParams } = filters
  const query = useQuery({
    queryKey: ['private', profile?.id, 'attendance', queryParams],
    queryFn: ({ signal }) => listAttendanceDays(api, queryParams, signal),
    enabled: valid && Boolean(profile),
  })
  return (
    <div className="space-y-5">
      <Link className="text-action underline" to="/app">
        Beranda
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-heading font-medium">Riwayat kehadiran</h1>
        <Button
          variant="secondary"
          busy={query.isFetching}
          disabled={!valid}
          onClick={() => void query.refetch()}
        >
          Perbarui
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Dari tanggal"
          type="date"
          value={filters.from}
          onChange={(event) =>
            setParams(updateFilter(params, 'from', event.target.value))
          }
        />
        <TextField
          label="Sampai tanggal"
          type="date"
          value={filters.to}
          onChange={(event) =>
            setParams(updateFilter(params, 'to', event.target.value))
          }
        />
      </div>
      {!valid ? (
        home.isError && !params.get('from') ? (
          <QueryError error={home.error} retry={() => void home.refetch()} />
        ) : (
          <p role="status" className="text-text-muted">
            Pilih rentang tanggal yang valid; tanggal awal tidak boleh setelah
            tanggal akhir.
          </p>
        )
      ) : query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <QueryError error={query.error} retry={() => void query.refetch()} />
      ) : (
        <>
          <p className="text-small text-text-muted">
            {query.data.pagination.totalItems} hari
            {query.isFetching ? ' · Memperbarui…' : ''}
          </p>
          {query.data.items.length ? (
            <ul className="space-y-3">
              {query.data.items.map((day) => (
                <li
                  key={day.workDate}
                  className="rounded-card border border-border bg-surface p-5"
                >
                  <AttendanceDayCard
                    day={day}
                    detailPath="/app/attendance"
                    returnTo={`/app/attendance?${params}`}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Belum ada hasil">
              Tidak ada hari kehadiran dalam halaman/rentang ini. Periksa
              tanggal atau kembali ke halaman sebelumnya.
            </EmptyState>
          )}
          <Pagination
            page={filters.page}
            totalPages={query.data.pagination.totalPages}
            busy={query.isFetching}
            onPageChange={(page) =>
              setParams(updateFilter(params, 'page', String(page), false))
            }
          />
        </>
      )}
    </div>
  )
}
