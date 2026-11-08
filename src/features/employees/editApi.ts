import type { ApiClient } from '../../shared/api/client'
import type {
  JsonBody,
  JsonResult,
  MultipartBody,
} from '../../shared/api/types'
import { toFormData } from '../../shared/api/multipart'

export function employeeEditApi(api: ApiClient) {
  return {
    profile: (
      id: string,
      body: MultipartBody<'updateEmployee'>,
      key: string,
      signal?: AbortSignal,
    ) =>
      api.request<JsonResult<'updateEmployee'>>({
        path: `/hr/employees/${encodeURIComponent(id)}`,
        method: 'PATCH',
        data: toFormData(body),
        idempotencyKey: key,
        signal,
      }),
    role: (
      id: string,
      body: JsonBody<'changeEmployeeRole'>,
      signal?: AbortSignal,
    ) =>
      api.request<JsonResult<'changeEmployeeRole'>>({
        path: `/hr/employees/${encodeURIComponent(id)}/role`,
        method: 'PUT',
        data: body,
        signal,
      }),
  }
}
