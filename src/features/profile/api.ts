import type { ApiClient } from '../../shared/api/client'
import type { JsonBody, JsonResult } from '../../shared/api/types'

export function changePassword(
  api: ApiClient,
  data: JsonBody<'changeOwnPassword'>,
  signal?: AbortSignal,
) {
  return api.request<JsonResult<'changeOwnPassword'>>({
    path: '/auth/password',
    method: 'POST',
    data,
    signal,
  })
}
