import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { useApi, useSession } from '../../shared/auth'
import { getWorkSchedule } from '../company/api'
import { ScheduleCard } from '../company/ScheduleCard'
import { LoadingState } from '../../shared/ui/Feedback'
import { QueryError } from '../../shared/ui/QueryFeedback'

export default function HrSchedulePage() {
  const api = useApi(),
    { profile } = useSession()
  const query = useQuery({
    queryKey: ['private', profile?.id, 'schedule'],
    queryFn: ({ signal }) => getWorkSchedule(api, signal),
  })
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-heading font-medium">Jadwal kerja</h1>
          <p className="mt-2 text-text-muted">
            Satu jadwal perusahaan untuk seluruh karyawan.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            className="rounded-control bg-action px-4 py-3 text-on-action"
            to="/hr/schedule/edit"
          >
            Ubah jadwal
          </Link>
          <Link
            className="rounded-control border border-control-border px-4 py-3"
            to="/hr/schedule/history"
          >
            Riwayat perubahan
          </Link>
        </div>
      </div>
      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <QueryError error={query.error} retry={() => void query.refetch()} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          <ScheduleCard title="Jadwal aktif" schedule={query.data.current} />
          <ScheduleCard
            title="Jadwal terjadwal"
            schedule={query.data.upcoming}
          />
        </div>
      )}
    </div>
  )
}
