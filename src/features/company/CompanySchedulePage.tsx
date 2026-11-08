import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { useApi, useSession } from '../../shared/auth'
import { getWorkSchedule } from './api'
import { ScheduleCard } from './ScheduleCard'
import { LoadingState } from '../../shared/ui/Feedback'
import { QueryError } from '../../shared/ui/QueryFeedback'

export default function CompanySchedulePage() {
  const api = useApi(),
    { profile } = useSession()
  const query = useQuery({
    queryKey: ['private', profile?.id, 'schedule'],
    queryFn: ({ signal }) => getWorkSchedule(api, signal),
  })
  return (
    <div className="space-y-5">
      <Link to="/app" className="text-action underline">
        Beranda
      </Link>
      <h1 className="text-heading font-medium">Jadwal perusahaan</h1>
      <p className="text-text-muted">
        Satu jadwal global untuk seluruh karyawan.
      </p>
      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <QueryError error={query.error} retry={() => void query.refetch()} />
      ) : (
        <>
          <ScheduleCard schedule={query.data.current} title="Jadwal aktif" />
          <ScheduleCard
            schedule={query.data.upcoming}
            title="Jadwal mendatang"
          />
          <p className="text-small text-text-muted">
            Check-in dibuka {query.data.checkInPolicy.opensMinutesBeforeStart}{' '}
            menit sebelum mulai kerja. Kelayakan selalu diperiksa server.
          </p>
        </>
      )}
    </div>
  )
}
