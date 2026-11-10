import type { Employee, EmployeePatch, RoleChange } from '../../shared/api/types'
import type { ApiClient } from '../../shared/api/client'
import { toFormData } from '../../shared/api/multipart'

export function employeeEditApi(api: ApiClient) {
  return {
    profile: (
      id: string,
      body: EmployeePatch,
      key: string,
      signal?: AbortSignal,
    ) =>
      api.request<Employee>({
        path: `/hr/employees/${encodeURIComponent(id)}`,
        method: 'PATCH',
        data: toFormData(body),
        idempotencyKey: key,
        signal,
      }),
    role: (
      id: string,
      body: RoleChange,
      signal?: AbortSignal,
    ) =>
      api.request<Employee>({
        path: `/hr/employees/${encodeURIComponent(id)}/role`,
        method: 'PUT',
        data: body,
        signal,
      }),
  }
}
