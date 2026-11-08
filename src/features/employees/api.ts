import type { ApiClient } from '../../shared/api/client'
import type { JsonBody, JsonResult } from '../../shared/api/types'
import type { employeeFilters } from './model'

export function employeesApi(api: ApiClient) {
  return {
    list: (filters: ReturnType<typeof employeeFilters>, signal?: AbortSignal) =>
      api.request<JsonResult<'listEmployees'>>({
        path: '/hr/employees',
        params: filters,
        signal,
      }),
    detail: (id: string, signal?: AbortSignal) =>
      api.request<JsonResult<'getEmployee'>>({
        path: `/hr/employees/${encodeURIComponent(id)}`,
        signal,
      }),
    create: (
      data: JsonBody<'createEmployee'>,
      key: string,
      signal?: AbortSignal,
    ) =>
      api.request<JsonResult<'createEmployee'>>({
        path: '/hr/employees',
        method: 'POST',
        data,
        idempotencyKey: key,
        signal,
      }),
    initialCredentials: (id: string, signal?: AbortSignal) =>
      api.request<JsonResult<'getEmployeeInitialCredentials'>>({
        path: `/hr/employees/${encodeURIComponent(id)}/initial-credentials`,
        signal,
      }),
  }
}
