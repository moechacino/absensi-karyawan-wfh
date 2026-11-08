import { useQuery } from '@tanstack/react-query'
import { Link, useParams, useSearchParams } from 'react-router'
import { useApi, useSession } from '../../shared/auth'
import type { ApiClient } from '../../shared/api/client'
import type { components } from '../../shared/api/schema'
import { useHome } from '../home/api'
import { AttendanceRecord } from './AttendanceRecord'
import { isRecordId } from './historyFilters'
import { CheckoutDialog } from './CheckoutDialog'
import { Button } from '../../shared/ui/Button'
import { LoadingState } from '../../shared/ui/Feedback'
import { QueryError } from '../../shared/ui/QueryFeedback'
import { safeReturnPath } from '../../shared/navigation/safeReturn'
export function AttendanceDetailScreen({
  load,
  hr = false,
}: {
  load: (
    api: ApiClient,
    id: string,
    signal?: AbortSignal,
  ) => Promise<components['schemas']['Attendance']>
  hr?: boolean
}) {
  const api = useApi(),
    { profile } = useSession(),
    { attendanceId } = useParams(),
    [params, setParams] = useSearchParams(),
    home = useHome()
  const query = useQuery({
    queryKey: [
      'private',
      profile?.id,
      hr ? 'monitoring' : 'attendance',
      'detail',
      attendanceId,
    ],
    queryFn: ({ signal }) => load(api, attendanceId!, signal),
    enabled: isRecordId(attendanceId),
  })
  const back = params.get('returnTo')
    ? safeReturnPath(params.get('returnTo'))
    : hr
      ? '/hr/attendance'
      : '/app/attendance'
  if (!isRecordId(attendanceId))
    return <QueryError error={new Error('Invalid record')} />
  return (
    <div className="space-y-5">
      <Link className="text-action underline" to={back}>
        Kembali ke daftar
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-heading font-medium">Detail kehadiran</h1>
        <Button
          variant="secondary"
          busy={query.isFetching}
          onClick={() => void query.refetch()}
        >
          Perbarui
        </Button>
      </div>
      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <QueryError error={query.error} retry={() => void query.refetch()} />
      ) : (
        <>
          <AttendanceRecord record={query.data} />
          {!hr &&
            query.data.state === 'WORKING' &&
            home.data?.day.canCheckOut &&
            home.data.day.attendance?.id === query.data.id && (
              <>
                <Button
                  onClick={() =>
                    setParams((old) => {
                      const next = new URLSearchParams(old)
                      next.set('checkout', '1')
                      return next
                    })
                  }
                >
                  Check-out
                </Button>
                <CheckoutDialog
                  attendance={query.data}
                  open={params.get('checkout') === '1'}
                  onClose={() =>
                    setParams((old) => {
                      const next = new URLSearchParams(old)
                      next.delete('checkout')
                      return next
                    })
                  }
                  onConfirmed={() => {
                    setParams((old) => {
                      const next = new URLSearchParams(old)
                      next.delete('checkout')
                      return next
                    })
                    void query.refetch()
                  }}
                />
              </>
            )}
        </>
      )}
    </div>
  )
}
