import type { Attendance } from '../../shared/api/types'
import { formatDuration, formatTimestamp } from '../../shared/dates/format'

export function CheckoutSummary({ attendance }: { attendance: Attendance }) {
  const labels = {
    EARLY: 'Lebih awal (EARLY)',
    ON_TIME: 'Tepat waktu (ON_TIME)',
    LATE: 'Terlambat (LATE)',
  }
  return (
    <div className="space-y-1 text-small text-text-muted">
      {attendance.checkOutPunctuality && (
        <p>Status check-out: {labels[attendance.checkOutPunctuality]}.</p>
      )}
      {attendance.checkOutPunctuality === 'EARLY' && attendance.earlyCheckOutSeconds !== null && (
        <p>Pulang lebih awal: {formatDuration(attendance.earlyCheckOutSeconds)} ({attendance.earlyCheckOutSeconds} detik).</p>
      )}
      {attendance.state === 'WORKING' && attendance.checkOutDeadlineAt && (
        <p>
          Check-out sebelum {formatTimestamp(attendance.checkOutDeadlineAt)}.
          {' '}Setelah jadwal selesai tetap dapat check-out sebagai LATE hingga batas ini.
        </p>
      )}
    </div>
  )
}
