import type {
  Employee,
  EmployeeCreate,
  EmployeeCreated,
  EmployeePage,
  InitialCredentialsRead,
} from '../../shared/api/types'
import type { ApiClient } from '../../shared/api/client'
import { toFormData } from '../../shared/api/multipart'
import type { employeeFilters } from './model'

export function employeesApi(api: ApiClient) {
  return {
    list: (filters: ReturnType<typeof employeeFilters>, signal?: AbortSignal) =>
      api.request<EmployeePage>({
        path: '/hr/employees',
        params: filters,
        signal,
      }),
    detail: (id: string, signal?: AbortSignal) =>
      api.request<Employee>({
        path: `/hr/employees/${encodeURIComponent(id)}`,
        signal,
      }),
    create: (
      data: EmployeeCreate,
      key: string,
      signal?: AbortSignal,
    ) =>
      api.request<EmployeeCreated>({
        path: '/hr/employees',
        method: 'POST',
        data: toFormData(data),
        idempotencyKey: key,
        signal,
      }),
    initialCredentials: (id: string, signal?: AbortSignal) =>
      api.request<InitialCredentialsRead>({
        path: `/hr/employees/${encodeURIComponent(id)}/initial-credentials`,
        signal,
      }),
  }
}
