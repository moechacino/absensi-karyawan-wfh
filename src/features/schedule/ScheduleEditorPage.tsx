import { useQuery } from '@tanstack/react-query'
import { useApi, useSession } from '../../shared/auth'
import { getWorkSchedule } from '../company/api'
import { LoadingState } from '../../shared/ui/Feedback'
import { QueryError } from '../../shared/ui/QueryFeedback'
import { ScheduleEditor } from './ScheduleEditor'

export default function ScheduleEditorPage() {
  const api = useApi(),
    { profile } = useSession()
  const query = useQuery({
    queryKey: ['private', profile?.id, 'schedule'],
    queryFn: ({ signal }) => getWorkSchedule(api, signal),
  })
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-heading font-medium">Ubah jadwal kerja</h1>
        <p className="mt-2 text-text-muted">
          Periksa hari, jam, dan zona waktu sebelum menerapkan perubahan untuk
          semua karyawan.
        </p>
      </div>
      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <QueryError error={query.error} retry={() => void query.refetch()} />
      ) : (
        <ScheduleEditor
          model={query.data}
          refresh={async () => (await query.refetch()).data?.version}
        />
      )}
    </div>
  )
}
