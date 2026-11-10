import type { Attendance, AttendanceDayPage } from '../../shared/api/types'
import type { ApiClient } from '../../shared/api/client'
export function listAttendanceDays(
  api: ApiClient,
  params: { from: string; to: string; page: number; pageSize: number },
  signal?: AbortSignal,
) {
  return api.request<AttendanceDayPage>({
    path: '/me/attendance-days',
    params,
    signal,
  })
}
export function getOwnAttendance(
  api: ApiClient,
  id: string,
  signal?: AbortSignal,
) {
  return api.request<Attendance>({
    path: `/me/attendances/${encodeURIComponent(id)}`,
    signal,
  })
}
