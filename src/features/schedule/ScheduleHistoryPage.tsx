import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router'
import { useApi, useSession } from '../../shared/auth'
import { formatTimestamp } from '../../shared/dates/format'
import { LoadingState, EmptyState, Badge } from '../../shared/ui/Feedback'
import { QueryError } from '../../shared/ui/QueryFeedback'
import { Pagination } from '../../shared/ui/Pagination'
import { ScheduleCard } from '../company/ScheduleCard'
import { listScheduleVersions } from './api'

export default function ScheduleHistoryPage() {
  const api = useApi(),
    { profile } = useSession(),
    [params, setParams] = useSearchParams()
  const parsed = Number(params.get('page') ?? 1),
    page = Number.isInteger(parsed) && parsed > 0 ? parsed : 1
  const query = useQuery({
    queryKey: ['private', profile?.id, 'schedule-versions', { page }],
    queryFn: ({ signal }) => listScheduleVersions(api, page, signal),
  })
  return (
    <div className="space-y-5">
      <Link className="text-action underline" to="/hr/schedule">
        Kembali ke jadwal kerja
      </Link>
      <h1 className="text-heading font-medium">Riwayat perubahan jadwal</h1>
      <p className="text-text-muted">
        Versi dan waktu aktivasi disimpan server. Catatan absensi tetap memakai
        snapshot aslinya.
      </p>
      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <QueryError error={query.error} retry={() => void query.refetch()} />
      ) : (
        <>
          {!query.data.items.length ? (
            <EmptyState title="Belum ada riwayat">
              Perubahan jadwal yang tersimpan akan ditampilkan di sini.
            </EmptyState>
          ) : (
            <ul className="grid gap-5 xl:grid-cols-2">
              {query.data.items.map((item) => (
                <li key={item.id} className="space-y-3">
                  <ScheduleCard
                    title={
                      item.state === 'ACTIVE'
                        ? 'Versi aktif'
                        : item.state === 'SCHEDULED'
                          ? 'Versi terjadwal'
                          : 'Versi digantikan'
                    }
                    schedule={item}
                  />
                  <div className="space-y-1 px-4 text-small">
                    <Badge>{item.state}</Badge>
                    <p>
                      Diubah oleh {item.createdBy.fullName} ·{' '}
                      {formatTimestamp(item.createdAt, item.timeZone)}
                    </p>
                    <p className="break-all text-text-muted">
                      ID versi: {item.id}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Pagination
            page={page}
            totalPages={query.data.pagination.totalPages}
            busy={query.isFetching}
            onPageChange={(next) => setParams({ page: String(next) })}
          />
        </>
      )}
    </div>
  )
}
