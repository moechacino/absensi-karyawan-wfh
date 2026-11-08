import type { components } from '../../shared/api/schema'
import { formatDate, formatTimestamp } from '../../shared/dates/format'
import { Badge, EmptyState } from '../../shared/ui/Feedback'

const weekdays = [
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
  'Minggu',
]
export function ScheduleCard({
  schedule,
  title,
}: {
  schedule: components['schemas']['ScheduleVersion'] | null
  title: string
}) {
  if (!schedule)
    return (
      <EmptyState title={title}>Belum ada jadwal yang ditetapkan.</EmptyState>
    )
  return (
    <section className="space-y-4 rounded-panel border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-title font-medium">{title}</h2>
        <Badge tone={schedule.state === 'ACTIVE' ? 'success' : 'neutral'}>
          {schedule.state === 'ACTIVE'
            ? 'Aktif'
            : schedule.state === 'SCHEDULED'
              ? 'Terjadwal'
              : 'Riwayat'}
        </Badge>
      </div>
      <p className="font-mono text-title">
        {schedule.startTime}–{schedule.endTime}
        {schedule.endDayOffset === 1 && (
          <span className="ml-2 text-small">(+1 hari)</span>
        )}
      </p>
      <p>{schedule.workingDays.map((day) => weekdays[day - 1]).join(', ')}</p>
      <dl className="grid gap-3 text-small sm:grid-cols-2">
        <div>
          <dt className="text-text-muted">Zona waktu</dt>
          <dd>{schedule.timeZone}</dd>
        </div>
        <div>
          <dt className="text-text-muted">Berlaku mulai</dt>
          <dd>{formatDate(schedule.effectiveFrom)}</dd>
        </div>
        <div>
          <dt className="text-text-muted">Aktivasi</dt>
          <dd>{formatTimestamp(schedule.effectiveAt, schedule.timeZone)}</dd>
        </div>
      </dl>
    </section>
  )
}
