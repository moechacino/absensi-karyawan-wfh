import type { ApiClient } from '../../shared/api/client'
import type { JsonResult, MultipartBody } from '../../shared/api/types'
import { toFormData } from '../../shared/api/multipart'
export function checkIn(
  api: ApiClient,
  input: MultipartBody<'checkIn'>,
  context: { idempotencyKey?: string; signal: AbortSignal },
) {
  return api.request<JsonResult<'checkIn'>>({
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
  return api.request<JsonResult<'checkOut'>>({
    path: `/me/attendances/${encodeURIComponent(input.id)}/check-out`,
    method: 'POST',
    data: { expectedVersion: input.expectedVersion },
    ...context,
  })
}
