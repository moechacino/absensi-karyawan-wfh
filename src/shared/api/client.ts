import axios, { AxiosHeaders } from 'axios'
import type { AxiosAdapter, Method } from 'axios'
import { createApiError, normalizeApiError } from './problem'
import type { ApiError } from './problem'
import type { components } from './schema'

export interface ApiClientOptions {
  baseUrl: string
  /** Actual browser origin, used when the configured base URL is relative. */
  appOrigin: string
  getAccessToken: () => string | null
  onAuthenticationFailure?: (context: {
    token: string
    error: ApiError
  }) => void
  /** Replaces transport in isolated unit tests; production uses Axios fetch. */
  adapter?: AxiosAdapter
}

export interface ApiRequest<Body = unknown> {
  /** Relative to /api/v1, e.g. /me. Query values belong in params. */
  path: string
  method?: Extract<Method, 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'>
  data?: Body
  params?: Record<
    string,
    string | number | boolean | readonly string[] | undefined
  >
  signal?: AbortSignal
  auth?: 'required' | 'none'
  idempotencyKey?: string
  timeout?: number
}

type FileReference = Pick<
  components['schemas']['FileMetadata'],
  'id' | 'contentPath'
>

function apiBase(baseUrl: string, appOrigin: string): URL {
  try {
    const origin = new URL(appOrigin)
    if (
      !['http:', 'https:'].includes(origin.protocol) ||
      origin.username ||
      origin.password
    )
      throw new Error()
    const url = new URL(baseUrl, origin.origin)
    if (
      (baseUrl !== '/api/v1' && !/^https?:\/\//.test(baseUrl)) ||
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== '/api/v1'
    )
      throw new Error()
    return url
  } catch {
    throw createApiError('configuration')
  }
}

/** Reject ambiguous paths before reading a token or calling Axios. */
function requestUrl(base: URL, path: string): string {
  if (!/^\/[A-Za-z0-9_~!$&'()+,;=:@%./-]*$/.test(path) || path.startsWith('//'))
    throw createApiError('configuration')
  const segments = path.split('/')
  if (
    segments.some((segment) => {
      // Decode repeatedly to reject encoded separators/traversal, including nested encodings.
      let decoded = segment
      for (let pass = 0; pass < segment.length + 1; pass++) {
        let next: string
        try {
          next = decodeURIComponent(decoded)
        } catch {
          return true
        }
        if (
          next === '.' ||
          next === '..' ||
          /[\\/?#]/.test(next) ||
          Array.from(next).some(
            (char) => char.charCodeAt(0) <= 32 || char.charCodeAt(0) === 127,
          )
        )
          return true
        if (next === decoded) return false
        decoded = next
      }
      return true
    })
  )
    throw createApiError('configuration')
  const url = new URL(`${base.pathname}${path}`, base.origin)
  if (
    url.origin !== base.origin ||
    !url.pathname.startsWith(`${base.pathname}/`)
  )
    throw createApiError('configuration')
  return url.href
}

export function createApiClient({
  baseUrl,
  appOrigin,
  getAccessToken,
  onAuthenticationFailure,
  adapter,
}: ApiClientOptions) {
  const base = apiBase(baseUrl, appOrigin)
  // Keep this instance private: callers cannot bypass the URL/auth/cache policies.
  const http = axios.create({
    adapter: adapter ?? 'fetch',
    withCredentials: false,
    withXSRFToken: false,
    xsrfCookieName: undefined,
    xsrfHeaderName: undefined,
    paramsSerializer: { indexes: null },
    // Bypass the browser HTTP cache; reject redirects before credentials/body can follow them.
    fetchOptions: { cache: 'no-store', redirect: 'error' },
  })

  async function send<Result, Body>(
    request: ApiRequest<Body>,
    responseType: 'json' | 'blob',
  ): Promise<Result> {
    const url = requestUrl(base, request.path)
    // Login is anonymous even if a previous session token remains in memory.
    const anonymous = request.auth === 'none' || request.path === '/auth/login'
    const token = anonymous ? null : getAccessToken()
    const headers = new AxiosHeaders({
      Accept:
        responseType === 'blob'
          ? 'image/jpeg, image/png, image/webp, application/problem+json'
          : 'application/json, application/problem+json',
    })
    headers.set('Authorization', token ? `Bearer ${token}` : false)
    if (request.idempotencyKey)
      headers.set('Idempotency-Key', request.idempotencyKey)
    // false locks out Axios's POST default; the fetch adapter/browser owns the boundary.
    headers.setContentType(
      request.data instanceof FormData ? false : 'application/json',
    )
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
      if (error.status === 401 && token && getAccessToken() === token)
        onAuthenticationFailure?.({ token, error })
      throw error
    }
  }

  return {
    request<Result, Body = unknown>(
      request: ApiRequest<Body>,
    ): Promise<Result> {
      return send<Result, Body>(request, 'json')
    },
    readFile(
      file: FileReference,
      options: Pick<ApiRequest, 'signal'> = {},
    ): Promise<Blob> {
      const uuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (
        !uuid.test(file.id) ||
        file.contentPath !== `/api/v1/files/${file.id}`
      )
        return Promise.reject(createApiError('configuration'))
      return send<Blob, never>(
        { path: `/files/${file.id}`, signal: options.signal },
        'blob',
      )
    },
  }
}

export type ApiClient = ReturnType<typeof createApiClient>
