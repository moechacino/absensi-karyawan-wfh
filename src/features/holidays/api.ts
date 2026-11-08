import type { ApiClient } from '../../shared/api/client'
import type { JsonBody, JsonResult } from '../../shared/api/types'

export function previewHolidayChange(
  api: ApiClient,
  input: JsonBody<'previewHolidayChange'>,
  signal?: AbortSignal,
) {
  return api.request<JsonResult<'previewHolidayChange'>>({
    path: '/hr/holidays/preview',
    method: 'POST',
    data: input,
    signal,
  })
}
export function changeHolidayCalendar(
  api: ApiClient,
  input: JsonBody<'changeHolidayCalendar'>,
  idempotencyKey: string,
  signal?: AbortSignal,
) {
  return api.request<JsonResult<'changeHolidayCalendar'>>({
    path: '/hr/holidays/changes',
    method: 'POST',
    data: input,
    idempotencyKey,
    signal,
  })
}
