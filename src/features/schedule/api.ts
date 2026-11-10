import type {
  ScheduleChange,
  ScheduleChanged,
  ScheduleHistoryPage,
  SchedulePreview,
  TimeZoneChoices,
} from '../../shared/api/types'
import type { ApiClient } from '../../shared/api/client'

export function searchTimeZones(
  api: ApiClient,
  q: string,
  atDate: string,
  signal?: AbortSignal,
) {
  return api.request<TimeZoneChoices>({
    path: '/reference/time-zones',
    params: { q, atDate },
    signal,
  })
}
export function previewWorkSchedule(
  api: ApiClient,
  input: ScheduleChange,
  signal?: AbortSignal,
) {
  return api.request<SchedulePreview>({
    path: '/hr/work-schedule/preview',
    method: 'POST',
    data: input,
    signal,
  })
}
export function changeWorkSchedule(
  api: ApiClient,
  input: ScheduleChange,
  idempotencyKey: string,
  signal?: AbortSignal,
) {
  return api.request<ScheduleChanged>({
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
  return api.request<ScheduleHistoryPage>({
    path: '/hr/work-schedule/versions',
    params: { page, pageSize: 20 },
    signal,
  })
}
