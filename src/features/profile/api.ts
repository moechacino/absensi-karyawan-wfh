import type { PasswordInput } from '../../shared/api/types'
import type { ApiClient } from '../../shared/api/client'

export function changePassword(
  api: ApiClient,
  data: PasswordInput,
  signal?: AbortSignal,
) {
  return api.request<undefined>({
    path: '/auth/password',
    method: 'POST',
    data,
    signal,
  })
}
