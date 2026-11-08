import axios, { AxiosHeaders } from 'axios'
import type { AxiosAdapter } from 'axios'
import { createApiError, normalizeApiError } from './problem'
import type { ApiError } from './problem'

export interface ApiClientOptions {
  baseUrl: string
  appOrigin: string
  getAccessToken: () => string | null
  onAuthenticationFailure?: (token: string, error: ApiError) => void
  adapter?: AxiosAdapter
}

export interface ApiRequest {
  /** A path like /me. Do not include the /api/v1 prefix or a query string. */
  path: string
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  data?: unknown
  params?: Record<string, string | number | boolean | undefined>
  signal?: AbortSignal
  authenticated?: boolean
  idempotencyKey?: string
  timeout?: number
}

export interface ApiClient {
  request<Result>(request: ApiRequest): Promise<Result>
  readFile(
    file: { id: string; contentPath: string },
    signal?: AbortSignal,
  ): Promise<Blob>
}

function apiBaseUrl(baseUrl: string, appOrigin: string): URL {
  try {
    if (baseUrl.startsWith('//')) throw new Error()
    const origin = new URL(appOrigin)
    const base = new URL(baseUrl, origin.origin)
    const validProtocol =
      base.protocol === 'https:' || base.protocol === 'http:'
    if (
      !validProtocol ||
      base.username ||
      base.password ||
      base.search ||
      base.hash ||
      base.pathname !== '/api/v1'
    ) {
      throw new Error()
    }
    return base
  } catch {
    throw createApiError('configuration')
  }
}

function makeUrl(base: URL, path: string): string {
  const simplePath = /^\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/
  if (!simplePath.test(path) || path.startsWith('/api/v1')) {
    throw createApiError('configuration')
  }

  const url = new URL(`${base.pathname}${path}`, base.origin)
  if (
    url.origin !== base.origin ||
    !url.pathname.startsWith(`${base.pathname}/`)
  ) {
    throw createApiError('configuration')
  }
  return url.href
}

export function createApiClient(options: ApiClientOptions): ApiClient {
  const base = apiBaseUrl(options.baseUrl, options.appOrigin)
  const http = axios.create({
    adapter: options.adapter ?? 'fetch',
    withCredentials: false,
    withXSRFToken: false,
    xsrfCookieName: undefined,
    xsrfHeaderName: undefined,
    paramsSerializer: { indexes: null },
    fetchOptions: { cache: 'no-store', redirect: 'error' },
  })

  async function send<Result>(
    request: ApiRequest,
    responseType: 'json' | 'blob',
  ): Promise<Result> {
    const url = makeUrl(base, request.path)
    const isLogin = request.path === '/auth/login'
    const token =
      request.authenticated === false || isLogin
        ? null
        : options.getAccessToken()
    const headers = new AxiosHeaders({
      Accept:
        responseType === 'blob'
          ? 'image/jpeg, image/png, image/webp, application/problem+json'
          : 'application/json, application/problem+json',
    })
    headers.set('Authorization', token ? `Bearer ${token}` : false)
    if (request.idempotencyKey)
      headers.set('Idempotency-Key', request.idempotencyKey)
    if (request.data instanceof FormData) headers.setContentType(false)
    else if (request.data !== undefined)
      headers.setContentType('application/json')

    try {
      const response = await http.request<Result>({
        url,
        method: request.method ?? 'GET',
        data: request.data,
        params: request.params,
        signal: request.signal,
        timeout: request.timeout,
        responseType,
        headers,
      })
      return response.status === 204 ? (undefined as Result) : response.data
    } catch (failure) {
      const error = await normalizeApiError(failure)
      if (error.status === 401 && token && options.getAccessToken() === token) {
        options.onAuthenticationFailure?.(token, error)
      }
      throw error
    }
  }

  return {
    request<Result>(request: ApiRequest): Promise<Result> {
      return send<Result>(request, 'json')
    },
    readFile(file, signal) {
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          file.id,
        )
      if (!isUuid || file.contentPath !== `/api/v1/files/${file.id}`) {
        return Promise.reject(createApiError('configuration'))
      }
      return send<Blob>({ path: `/files/${file.id}`, signal }, 'blob')
    },
  }
}
