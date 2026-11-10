import type { LoginInput, LoginResult, MeProfile } from '../../shared/api/types'
import type { ApiClient } from '../../shared/api/client'

export function authService(api: ApiClient) {
  return {
    login: (data: LoginInput, signal?: AbortSignal) =>
      api.request<LoginResult>({
        path: '/auth/login',
        method: 'POST',
        data,
        signal,
      }),
    me: (signal?: AbortSignal) =>
      api.request<MeProfile>({ path: '/me', signal }),
    logout: () =>
      api.request<undefined>({
        path: '/auth/logout',
        method: 'POST',
      }),
  }
}
