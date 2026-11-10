import type { HolidayCalendar, WorkSchedule } from '../../shared/api/types'
import type { ApiClient } from '../../shared/api/client'

export function getWorkSchedule(api: ApiClient, signal?: AbortSignal) {
  return api.request<WorkSchedule>({
    path: '/work-schedule',
    signal,
  })
}
export function getHolidayCalendar(
  api: ApiClient,
  year: number,
  signal?: AbortSignal,
) {
  return api.request<HolidayCalendar>({
    path: '/holidays',
    params: { year },
    signal,
  })
}
