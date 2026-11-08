import type { ApiClient } from '../../shared/api/client'
import type { JsonBody, JsonResult } from '../../shared/api/types'

export function authService(api: ApiClient) {
  return {
    login: (data: JsonBody<'login'>, signal?: AbortSignal) =>
      api.request<JsonResult<'login'>>({
        path: '/auth/login',
        method: 'POST',
        data,
        signal,
      }),
    me: (signal?: AbortSignal) =>
      api.request<JsonResult<'getOwnProfile'>>({ path: '/me', signal }),
    logout: () =>
      api.request<JsonResult<'logout'>>({
        path: '/auth/logout',
        method: 'POST',
      }),
  }
}
