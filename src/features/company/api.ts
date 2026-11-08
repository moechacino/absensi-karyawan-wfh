import type { ApiClient } from '../../shared/api/client'
import type { JsonResult } from '../../shared/api/types'

export function getWorkSchedule(api: ApiClient, signal?: AbortSignal) {
  return api.request<JsonResult<'getWorkSchedule'>>({
    path: '/work-schedule',
    signal,
  })
}
export function getHolidayCalendar(
  api: ApiClient,
  year: number,
  signal?: AbortSignal,
) {
  return api.request<JsonResult<'getHolidayCalendar'>>({
    path: '/holidays',
    params: { year },
    signal,
  })
}
