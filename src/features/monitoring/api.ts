import type { Attendance, MonitoringPage } from '../../shared/api/types'
import type { ApiClient } from '../../shared/api/client'
export function monitorAttendance(
  api: ApiClient,
  params: Record<string, string | number | undefined>,
  signal?: AbortSignal,
) {
  return api.request<MonitoringPage>({
    path: '/hr/attendance-days',
    params,
    signal,
  })
}
export function getAttendanceForHR(
  api: ApiClient,
  id: string,
  signal?: AbortSignal,
) {
  return api.request<Attendance>({
    path: `/hr/attendances/${encodeURIComponent(id)}`,
    signal,
  })
}
