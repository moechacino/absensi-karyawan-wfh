import { Link } from 'react-router'
import type { components } from '../../shared/api/schema'
import { statusLabels } from '../home/viewModel'
import {
  formatDate,
  formatDuration,
  formatTime,
} from '../../shared/dates/format'
import { Badge } from '../../shared/ui/Feedback'
export function AttendanceDayCard({
  day,
  detailPath,
  returnTo,
}: {
  day: components['schemas']['AttendanceDay']
  detailPath: string
  returnTo: string
}) {
  const record = day.attendance
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap justify-between gap-2">
        <p className="font-medium">{formatDate(day.workDate)}</p>
        <Badge tone={record?.state === 'COMPLETED' ? 'success' : 'neutral'}>
          {statusLabels[day.status]}
        </Badge>
      </div>
      {record ? (
        <>
          <p>
            {formatTime(record.checkInAt, record.schedule.timeZone)} –{' '}
            {formatTime(record.checkOutAt, record.schedule.timeZone)} ·{' '}
            {record.schedule.timeZone}
          </p>
          <p className="text-small text-text-muted">
            {record.punctuality === 'LATE'
              ? `Terlambat ${formatDuration(record.lateSeconds)}`
              : 'Tepat waktu'}
          </p>
          <Link
            className="inline-flex min-h-touch items-center text-action underline"
            to={`${detailPath}/${record.id}?returnTo=${encodeURIComponent(returnTo)}`}
          >
            Lihat catatan
          </Link>
        </>
      ) : (
        <p className="text-small text-text-muted">
          Tidak ada catatan kehadiran aktual.
        </p>
      )}
    </div>
  )
}
