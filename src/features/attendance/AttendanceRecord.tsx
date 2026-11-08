import { useState } from 'react'
import { PrivateFileViewer } from '../files/PrivateFileViewer'
import { Button } from '../../shared/ui/Button'
import type { components } from '../../shared/api/schema'
import {
  formatDate,
  formatDuration,
  formatTimestamp,
} from '../../shared/dates/format'
import { Badge } from '../../shared/ui/Feedback'
import { PrivateImage } from '../files/PrivateImage'
export function AttendanceRecord({
  record,
}: {
  record: components['schemas']['Attendance']
}) {
  const [open, setOpen] = useState(false)
  const zone = record.schedule.timeZone
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-title">{formatDate(record.workDate)}</h2>
        <Badge tone={record.punctuality === 'LATE' ? 'warning' : 'success'}>
          {record.punctuality === 'LATE'
            ? `Terlambat ${formatDuration(record.lateSeconds)}`
            : 'Tepat waktu'}
        </Badge>
      </div>
      <dl className="grid gap-4 rounded-card bg-surface p-5 sm:grid-cols-2">
        {[
          ['Check-in', formatTimestamp(record.checkInAt, zone)],
          ['Check-out', formatTimestamp(record.checkOutAt, zone)],
          ['Durasi tercatat', formatDuration(record.durationSeconds)],
          ['Zona waktu rekaman', zone],
          [
            'Jadwal mulai',
            formatTimestamp(record.schedule.plannedStartAt, zone),
          ],
          [
            'Jadwal selesai',
            formatTimestamp(record.schedule.plannedEndAt, zone),
          ],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-small text-text-muted">{label}</dt>
            <dd className="mt-1 [overflow-wrap:anywhere]">{value}</dd>
          </div>
        ))}
      </dl>
      <section className="space-y-3">
        <h2 className="text-title">Foto check-in</h2>
        <PrivateImage
          file={record.photo}
          alt={`Bukti check-in ${formatDate(record.workDate)}`}
          className="max-h-96 w-full rounded-panel object-contain"
        />
      </section>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Lihat dan unduh bukti
      </Button>
      <PrivateFileViewer
        file={record.photo}
        open={open}
        onClose={() => setOpen(false)}
      />
      <p className="text-small text-text-muted">
        Jadwal dan zona waktu merupakan snapshot pada saat kehadiran dicatat.
        Catatan ini tidak dapat diedit.
      </p>
    </div>
  )
}
