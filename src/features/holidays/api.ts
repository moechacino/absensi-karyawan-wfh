import type { ChangeImpact, HolidayChange, HolidayChanged } from '../../shared/api/types'
import type { ApiClient } from '../../shared/api/client'

export function previewHolidayChange(
  api: ApiClient,
  input: HolidayChange,
  signal?: AbortSignal,
) {
  return api.request<ChangeImpact>({
    path: '/hr/holidays/preview',
    method: 'POST',
    data: input,
    signal,
  })
}
export function changeHolidayCalendar(
  api: ApiClient,
  input: HolidayChange,
  idempotencyKey: string,
  signal?: AbortSignal,
) {
  return api.request<HolidayChanged>({
    path: '/hr/holidays/changes',
    method: 'POST',
    data: input,
    idempotencyKey,
    signal,
  })
}
