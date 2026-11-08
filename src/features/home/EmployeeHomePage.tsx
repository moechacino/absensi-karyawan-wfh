import { useEffect } from 'react'
import { Link } from 'react-router'
import { useSession } from '../../shared/auth'
import { useHome } from './api'
import { useServerClock } from './useServerClock'
import { homeView } from './viewModel'
import {
  formatDate,
  formatDuration,
  formatTime,
} from '../../shared/dates/format'
import { Alert, Badge, LoadingState } from '../../shared/ui/Feedback'
import { QueryError } from '../../shared/ui/QueryFeedback'
import { Button } from '../../shared/ui/Button'
import { Icon } from '../../shared/icons/Icon'

export default function EmployeeHomePage() {
  const { profile } = useSession(),
    query = useHome()
  const clock = useServerClock(query.data?.serverNow)
  const data = query.data
  const refreshHome = query.refetch
  useEffect(() => {
    if (!data?.checkInWindow) return
    const server = Date.parse(data.serverNow)
    const next = [data.checkInWindow.opensAt, data.checkInWindow.closesAt]
      .map(Date.parse)
      .filter((time) => time > server)
      .sort((a, b) => a - b)[0]
    if (!next) return
    const timer = window.setTimeout(
      () => void refreshHome(),
      Math.min(next - server + 50, 2_147_000_000),
    )
    return () => clearTimeout(timer)
  }, [data, refreshHome])
  if (query.isPending) return <LoadingState />
  if (query.isError || !data)
    return <QueryError error={query.error} retry={() => void query.refetch()} />
  const view = homeView(data),
    attendance = data.day.attendance
  return (
    <div className="space-y-6">
      <div>
        <p className="text-small text-text-muted">
          Selamat datang, {profile?.fullName}
        </p>
        <h1 className="mt-2 text-heading font-medium">Absensi hari ini</h1>
        <p className="mt-2 text-text-muted">{formatDate(view.workDate)}</p>
        {view.workDate !== data.companyDate && (
          <p className="mt-2 text-small">
            Menampilkan hari kerja dari kehadiran yang masih terbuka.
          </p>
        )}
      </div>
      <section className="space-y-5 rounded-panel bg-forest p-6 text-white">
        <p className="flex items-center gap-2 text-small">
          <Icon name="clock" />
          Waktu server · {data.timeZone}
        </p>
        <p className="break-words font-mono text-clock tracking-wider">
          {formatTime(clock ?? data.serverNow, data.timeZone, true)}
        </p>
        <p className="text-title">{view.title}</p>
        {data.day.schedule && (
          <div className="flex flex-wrap justify-between gap-3 border-t border-white/20 pt-4 text-small">
            <span>Jadwal kerja</span>
            <span className="font-mono">
              {formatTime(
                data.day.schedule.plannedStartAt,
                data.day.schedule.timeZone,
              )}
              –
              {formatTime(
                data.day.schedule.plannedEndAt,
                data.day.schedule.timeZone,
              )}
            </span>
          </div>
        )}
      </section>
      {query.isFetching && (
        <p role="status" className="text-small text-text-muted">
          Memperbarui status…
        </p>
      )}
      {view.reason && <Alert title={view.reason} />}
      {view.checkIn && (
        <Link
          to="/app/check-in"
          className="flex min-h-13 items-center justify-center rounded-control bg-action px-5 py-3 text-on-action hover:bg-action-hover"
        >
          Check-in sekarang
        </Link>
      )}
      {view.checkOut && attendance && (
        <Link
          to={`/app/attendance/${attendance.id}?checkout=1`}
          className="flex min-h-13 items-center justify-center rounded-control bg-action px-5 py-3 text-on-action"
        >
          Check-out
        </Link>
      )}
      {attendance && (
        <section className="space-y-3 rounded-card bg-surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-medium">Kehadiran tercatat</h2>
            <Badge
              tone={attendance.punctuality === 'LATE' ? 'warning' : 'success'}
            >
              {attendance.punctuality === 'LATE'
                ? `Terlambat ${formatDuration(attendance.lateSeconds)}`
                : 'Tepat waktu'}
            </Badge>
          </div>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-small text-text-muted">Check-in</dt>
              <dd className="font-mono">
                {formatTime(attendance.checkInAt, attendance.schedule.timeZone)}
              </dd>
            </div>
            <div>
              <dt className="text-small text-text-muted">Check-out</dt>
              <dd className="font-mono">
                {formatTime(
                  attendance.checkOutAt,
                  attendance.schedule.timeZone,
                )}
              </dd>
            </div>
          </dl>
          <Link
            className="block text-action underline"
            to={`/app/attendance/${attendance.id}`}
          >
            Lihat detail
          </Link>
        </section>
      )}
      <div className="flex flex-wrap gap-3">
        <Link
          className="flex min-h-touch items-center rounded-control border border-control-border px-4"
          to="/app/schedule"
        >
          Jadwal perusahaan
        </Link>
        <Link
          className="flex min-h-touch items-center rounded-control border border-control-border px-4"
          to="/app/holidays"
        >
          Hari libur
        </Link>
        <Button
          variant="ghost"
          busy={query.isFetching}
          onClick={() => void query.refetch()}
        >
          Perbarui
        </Button>
      </div>
    </div>
  )
}
