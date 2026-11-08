import type { ApiClient } from '../../shared/api/client'
import type { JsonBody, JsonResult } from '../../shared/api/types'

export function searchTimeZones(
  api: ApiClient,
  q: string,
  atDate: string,
  signal?: AbortSignal,
) {
  return api.request<JsonResult<'searchTimeZones'>>({
    path: '/reference/time-zones',
    params: { q, atDate },
    signal,
  })
}
export function previewWorkSchedule(
  api: ApiClient,
  input: JsonBody<'previewWorkSchedule'>,
  signal?: AbortSignal,
) {
  return api.request<JsonResult<'previewWorkSchedule'>>({
    path: '/hr/work-schedule/preview',
    method: 'POST',
    data: input,
    signal,
  })
}
export function changeWorkSchedule(
  api: ApiClient,
  input: JsonBody<'changeWorkSchedule'>,
  idempotencyKey: string,
  signal?: AbortSignal,
) {
  return api.request<JsonResult<'changeWorkSchedule'>>({
    path: '/hr/work-schedule',
    method: 'PUT',
    data: input,
    idempotencyKey,
    signal,
  })
}
export function listScheduleVersions(
  api: ApiClient,
  page: number,
  signal?: AbortSignal,
) {
  return api.request<JsonResult<'listWorkScheduleVersions'>>({
    path: '/hr/work-schedule/versions',
    params: { page, pageSize: 20 },
    signal,
  })
}
