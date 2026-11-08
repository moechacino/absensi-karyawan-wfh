import { Link, useSearchParams } from 'react-router'
import { useApi, useSession } from '../../shared/auth'
import { useHome } from '../home/api'
import { statusLabels } from '../home/viewModel'
import { monitoringFilters, monitoringRowView, summaryCards } from './model'
import { useMonitoring } from './useMonitoring'
import { DivisionFilter } from './DivisionFilter'
import { updateFilter } from '../attendance/historyFilters'
import { AttendanceDayCard } from '../attendance/AttendanceDayCard'
import { formatDuration, formatTime } from '../../shared/dates/format'
import { TextField } from '../../shared/forms/TextField'
import { SelectField } from '../../shared/forms/SelectField'
import {
  Alert,
  Badge,
  EmptyState,
  LoadingState,
} from '../../shared/ui/Feedback'
import { QueryError } from '../../shared/ui/QueryFeedback'
import { ResponsiveList } from '../../shared/ui/ResponsiveList'
import { Pagination } from '../../shared/ui/Pagination'
import { Button } from '../../shared/ui/Button'
export default function MonitoringPage() {
  const api = useApi(),
    { profile } = useSession(),
    home = useHome(),
    [params, setParams] = useSearchParams()
  const filters = monitoringFilters(params, home.data?.companyDate)
  const query = useMonitoring(api, profile?.id, filters)
  const change = (name: string, value: string) =>
    setParams(updateFilter(params, name, value))
  const back = `/hr/attendance?${params}`
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-heading font-medium">Monitoring absensi</h1>
          <p className="mt-2 text-text-muted">
            Ringkasan kehadiran karyawan yang bekerja dari rumah.
          </p>
        </div>
        <Button
          variant="secondary"
          disabled={!filters.valid}
          busy={query.isFetching}
          onClick={() => void query.refetch()}
        >
          Perbarui
        </Button>
      </div>
      <Alert title="Absensi hanya dapat dilihat">
        Waktu dan bukti foto tidak dapat diedit. Indikator terlambat dapat
        termasuk dalam sedang bekerja atau selesai.
      </Alert>
      <section
        className="grid gap-4 rounded-panel border border-border bg-surface p-5 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Filter monitoring"
      >
        <TextField
          label="Tanggal perusahaan"
          type="date"
          value={filters.params.date}
          onChange={(event) => change('date', event.target.value)}
        />
        <TextField
          label="Cari karyawan"
          placeholder="Nama atau kode karyawan"
          maxLength={160}
          value={filters.params.q ?? ''}
          onChange={(event) => change('q', event.target.value)}
        />
        <DivisionFilter
          value={filters.params.divisionId ?? ''}
          onChange={(value) => change('divisionId', value)}
        />
        <SelectField
          label="Status"
          value={filters.params.status ?? ''}
          onChange={(value) => change('status', value)}
          options={[
            { value: '', label: 'Semua status' },
            ...Object.entries(statusLabels).map(([value, label]) => ({
              value,
              label,
            })),
          ]}
        />
        <SelectField
          label="Ketepatan waktu"
          value={filters.params.punctuality ?? ''}
          onChange={(value) => change('punctuality', value)}
          options={[
            { value: '', label: 'Semua' },
            { value: 'ON_TIME', label: 'Tepat waktu' },
            { value: 'LATE', label: 'Terlambat' },
          ]}
        />
      </section>
      {!params.has('date') && home.isPending ? (
        <LoadingState label="Menentukan tanggal perusahaan…" />
      ) : !filters.valid ? (
        !params.has('date') && home.isError ? (
          <QueryError error={home.error} retry={() => void home.refetch()} />
        ) : (
          <p role="status">Pilih tanggal dan filter yang valid.</p>
        )
      ) : query.isPending ? (
        <LoadingState />
      ) : query.isError && !query.data ? (
        <QueryError error={query.error} retry={() => void query.refetch()} />
      ) : query.data ? (
        <>
          <dl className="grid grid-cols-2 gap-4 rounded-panel bg-surface p-5 xl:grid-cols-4">
            {summaryCards(query.data.summary).map((item) => (
              <div key={item.label}>
                <dt className="text-small text-text-muted">{item.label}</dt>
                <dd className="mt-2 font-mono text-heading">{item.value}</dd>
              </div>
            ))}
          </dl>
          {query.isFetching && (
            <p role="status" className="text-small text-text-muted">
              Memperbarui data yang terlihat…
            </p>
          )}
          {query.isError && (
            <QueryError
              error={query.error}
              retry={() => void query.refetch()}
            />
          )}
          <ResponsiveList
            label="Kehadiran karyawan"
            items={query.data.items}
            rowKey={(row) => row.employee.id}
            empty={
              <EmptyState title="Tidak ada hasil">
                Ubah tanggal atau filter untuk mencari kehadiran.
              </EmptyState>
            }
            columns={[
              {
                key: 'employee',
                heading: 'Karyawan',
                render: (row) => (
                  <>
                    <p className="font-medium">
                      {monitoringRowView(row).employeeName}
                    </p>
                    <p className="text-label text-text-muted">
                      {monitoringRowView(row).employeeCode}
                    </p>
                  </>
                ),
              },
              {
                key: 'division',
                heading: 'Divisi',
                render: (row) => monitoringRowView(row).divisionName,
              },
              {
                key: 'time',
                heading: 'Check-in / out',
                render: (row) =>
                  monitoringRowView(row).attendanceId ? (
                    <>
                      <p>
                        {formatTime(
                          monitoringRowView(row).checkInAt,
                          monitoringRowView(row).timeZone ?? '',
                        )}{' '}
                        /{' '}
                        {formatTime(
                          monitoringRowView(row).checkOutAt,
                          monitoringRowView(row).timeZone ?? '',
                        )}
                      </p>
                      <p className="text-label text-text-muted">
                        {monitoringRowView(row).timeZone}
                      </p>
                    </>
                  ) : (
                    '—'
                  ),
              },
              {
                key: 'status',
                heading: 'Status',
                render: (row) => (
                  <>
                    <Badge>{monitoringRowView(row).status}</Badge>
                    {monitoringRowView(row).punctuality === 'LATE' && (
                      <p className="mt-2 text-small text-warning">
                        Terlambat{' '}
                        {formatDuration(
                          monitoringRowView(row).lateSeconds ?? 0,
                        )}
                      </p>
                    )}
                  </>
                ),
              },
              {
                key: 'detail',
                heading: 'Detail',
                render: (row) =>
                  monitoringRowView(row).attendanceId ? (
                    <Link
                      className="inline-flex min-h-touch items-center text-action underline"
                      to={`/hr/attendance/${monitoringRowView(row).attendanceId}?returnTo=${encodeURIComponent(back)}`}
                    >
                      Lihat
                    </Link>
                  ) : (
                    'Tidak ada catatan'
                  ),
              },
            ]}
            renderCard={(row) => (
              <>
                <p className="mb-1 font-medium">
                  {monitoringRowView(row).employeeName}
                </p>
                <p className="mb-4 text-label text-text-muted">
                  {monitoringRowView(row).employeeCode} ·{' '}
                  {monitoringRowView(row).divisionName}
                </p>
                <AttendanceDayCard
                  day={row.day}
                  detailPath="/hr/attendance"
                  returnTo={back}
                />
              </>
            )}
          />
          <Pagination
            page={filters.params.page}
            totalPages={query.data.pagination.totalPages}
            busy={query.isFetching}
            onPageChange={(page) =>
              setParams(updateFilter(params, 'page', String(page), false))
            }
          />
        </>
      ) : (
        <LoadingState />
      )}
    </div>
  )
}
