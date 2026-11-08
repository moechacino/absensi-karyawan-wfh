import type { ApiClient } from '../../shared/api/client'
import type { JsonResult } from '../../shared/api/types'
export function listAttendanceDays(
  api: ApiClient,
  params: { from: string; to: string; page: number; pageSize: number },
  signal?: AbortSignal,
) {
  return api.request<JsonResult<'listOwnAttendanceDays'>>({
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
  return api.request<JsonResult<'getOwnAttendance'>>({
    path: `/me/attendances/${encodeURIComponent(id)}`,
    signal,
  })
}
