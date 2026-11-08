import { isDateOnly } from '../../shared/dates/format'
import { statusLabels } from '../home/viewModel'
import type { components } from '../../shared/api/schema'

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const punctualities = ['ON_TIME', 'LATE'] as const

type MonitoringRow = components['schemas']['MonitoringRow']
type MonitoringSummary = components['schemas']['MonitoringPage']['summary']

export function monitoringFilters(
  params: URLSearchParams,
  companyDate?: string,
) {
  const selected = params.get('date') ?? companyDate ?? ''
  const status = params.get('status') ?? ''
  const punctuality = params.get('punctuality') ?? ''
  const divisionId = params.get('divisionId') ?? ''
  const page = Number(params.get('page') ?? 1)
  const pageSize = Number(params.get('pageSize') ?? 20)
  const q = params.get('q') ?? ''
  const valid =
    isDateOnly(selected) &&
    Number.isInteger(page) &&
    page >= 1 &&
    Number.isInteger(pageSize) &&
    pageSize >= 1 &&
    pageSize <= 100 &&
    q.length <= 160 &&
    (!divisionId || uuid.test(divisionId)) &&
    (!status || Object.hasOwn(statusLabels, status)) &&
    (!punctuality ||
      punctualities.includes(punctuality as (typeof punctualities)[number]))
  return {
    valid,
    params: {
      date: selected,
      page,
      pageSize,
      q: q || undefined,
      divisionId: divisionId || undefined,
      status: status || undefined,
      punctuality: punctuality || undefined,
    },
  }
}

/** Late overlaps WORKING/COMPLETED, so exclusive totals sum statuses only. */
export function summaryCards(summary: MonitoringSummary) {
  return [
    {
      label: 'Total hasil',
      value:
        summary.notCheckedIn +
        summary.working +
        summary.completed +
        summary.holiday +
        summary.restDay +
        summary.unconfigured,
    },
    { label: 'Sedang bekerja', value: summary.working },
    { label: 'Selesai', value: summary.completed },
    { label: 'Belum check-in', value: summary.notCheckedIn },
    { label: 'Terlambat', value: summary.late },
    { label: 'Hari libur', value: summary.holiday },
    { label: 'Istirahat', value: summary.restDay },
    { label: 'Belum diatur', value: summary.unconfigured },
  ]
}

export function monitoringRowView(row: MonitoringRow) {
  const attendance = row.day.attendance
  return {
    employeeName: row.employee.fullName,
    employeeCode: row.employee.employeeCode,
    divisionName: row.employee.division.name,
    status: statusLabels[row.day.status],
    attendanceId: attendance?.id,
    timeZone: attendance?.schedule.timeZone ?? row.day.schedule?.timeZone,
    checkInAt: attendance?.checkInAt ?? null,
    checkOutAt: attendance?.checkOutAt ?? null,
    punctuality: attendance?.punctuality,
    lateSeconds: attendance?.lateSeconds,
  }
}

export function monitoringQuerySettings(
  identity: string | undefined,
  filters: ReturnType<typeof monitoringFilters>,
) {
  return {
    queryKey: ['private', identity, 'monitoring', filters.params],
    enabled: filters.valid && Boolean(identity),
    refetchOnWindowFocus: true as const,
    refetchOnReconnect: true as const,
  }
}
