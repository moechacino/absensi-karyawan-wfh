import type { Attendance, CheckInInput } from '../../shared/api/types'
import type { ApiClient } from '../../shared/api/client'
import { toFormData } from '../../shared/api/multipart'
export function checkIn(
  api: ApiClient,
  input: CheckInInput,
  context: { idempotencyKey?: string; signal: AbortSignal },
) {
  return api.request<Attendance>({
    path: '/me/attendances/check-in',
    method: 'POST',
    data: toFormData(input),
    ...context,
  })
}
export function checkOut(
  api: ApiClient,
  input: { id: string; expectedVersion: number },
  context: { idempotencyKey?: string; signal: AbortSignal },
) {
  return api.request<Attendance>({
    path: `/me/attendances/${encodeURIComponent(input.id)}/check-out`,
    method: 'POST',
    data: { expectedVersion: input.expectedVersion },
    ...context,
  })
}
