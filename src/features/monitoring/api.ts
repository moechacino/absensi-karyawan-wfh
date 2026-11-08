import type { ApiClient } from '../../shared/api/client'
import type { JsonResult } from '../../shared/api/types'
export function monitorAttendance(
  api: ApiClient,
  params: Record<string, string | number | undefined>,
  signal?: AbortSignal,
) {
  return api.request<JsonResult<'monitorAttendance'>>({
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
  return api.request<JsonResult<'getAttendanceForHR'>>({
    path: `/hr/attendances/${encodeURIComponent(id)}`,
    signal,
  })
}
