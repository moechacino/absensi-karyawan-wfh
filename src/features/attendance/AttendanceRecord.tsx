import { CheckoutSummary } from './CheckoutSummary'
import type { Attendance } from '../../shared/api/types'
import { useState } from 'react'
import { PrivateFileViewer } from '../files/PrivateFileViewer'
import { Button } from '../../shared/ui/Button'
import {
  formatDate,
  formatDuration,
  formatTimestamp,
  userTimeZone,
} from '../../shared/dates/format'
import { Alert, Badge } from '../../shared/ui/Feedback'
import { PrivateImage } from '../files/PrivateImage'
export function AttendanceRecord({
  record,
}: {
  record: Attendance
}) {
  const [open, setOpen] = useState(false)
  const zone = userTimeZone()
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
          ['Durasi tercatat', record.state === 'MISSED_CHECK_OUT' ? 'Tidak tersedia' : formatDuration(record.durationSeconds)],
          ['Zona waktu tampilan', zone],
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
      <CheckoutSummary attendance={record} />
      {record.state === 'MISSED_CHECK_OUT' && (
        <Alert title="Tidak check-out" tone="warning">
          Batas check-out pada pembukaan shift kerja berikutnya telah lewat. Waktu check-out dan durasi tidak dicatat otomatis.
        </Alert>
      )}
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
        Catatan ini memakai jadwal yang tersimpan saat check-in. Waktu ditampilkan dalam zona perangkat Anda ({zone}).
      </p>
    </div>
  )
}
