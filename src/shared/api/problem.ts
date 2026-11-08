import axios, { AxiosHeaders } from 'axios'
import type { RawAxiosHeaders } from 'axios'
import type { components } from './schema'

export type Problem = components['schemas']['Problem']
export type FieldError = components['schemas']['FieldError']
export type ApiErrorKind =
  | 'http'
  | 'network'
  | 'timeout'
  | 'cancelled'
  | 'configuration'

/** Safe error data produced by functions, never a custom Error class. */
export interface ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status?: number
  readonly problem?: Problem
  readonly requestId?: string
  readonly retryAfter?: string
}

export function createApiError(
  kind: ApiErrorKind,
  metadata: {
    status?: number
    problem?: Problem
    requestId?: string
    retryAfter?: string
  } = {},
): ApiError {
  const messages: Record<ApiErrorKind, string> = {
    http: 'Permintaan belum dapat diselesaikan.',
    network: 'Koneksi ke server terputus. Periksa hasil sebelum mencoba lagi.',
    timeout: 'Waktu tunggu habis. Periksa hasil sebelum mencoba lagi.',
    cancelled: 'Permintaan dibatalkan. Hasil tindakan mungkin belum diketahui.',
    configuration: 'Konfigurasi permintaan API tidak valid.',
  }
  return Object.assign(new Error(messages[kind]), {
    name: 'ApiError',
    kind,
    status: metadata.status,
    problem: metadata.problem,
    requestId: metadata.requestId,
    retryAfter: metadata.retryAfter,
  })
}

export function isApiError(value: unknown): value is ApiError {
  return (
    value instanceof Error &&
    value.name === 'ApiError' &&
    'kind' in value &&
    ['http', 'network', 'timeout', 'cancelled', 'configuration'].includes(
      String(value.kind),
    )
  )
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function fieldError(value: unknown): value is FieldError {
  return (
    record(value) &&
    typeof value.field === 'string' &&
    typeof value.code === 'string' &&
    typeof value.message === 'string'
  )
}

/** Validate the error shape only; generated API types are not runtime validators. */
export function parseProblem(value: unknown): Problem | undefined {
  if (
    !record(value) ||
    typeof value.type !== 'string' ||
    typeof value.title !== 'string' ||
    typeof value.code !== 'string' ||
    typeof value.requestId !== 'string' ||
    typeof value.status !== 'number' ||
    !Number.isInteger(value.status) ||
    value.status < 400 ||
    value.status > 599
  )
    return undefined
  return {
    type: value.type,
    title: value.title,
    code: value.code,
    requestId: value.requestId,
    status: value.status,
    ...(typeof value.detail === 'string' && { detail: value.detail }),
    ...(Array.isArray(value.errors) &&
      value.errors.every(fieldError) && { errors: value.errors }),
    ...(record(value.details) && { details: value.details }),
  }
}

export async function normalizeApiError(error: unknown): Promise<ApiError> {
  if (isApiError(error)) return error
  if (axios.isCancel(error)) return createApiError('cancelled')
  if (!axios.isAxiosError(error)) return createApiError('configuration')
  if (!error.response) {
    return createApiError(
      ['ECONNABORTED', 'ETIMEDOUT'].includes(error.code ?? '')
        ? 'timeout'
        : 'network',
    )
  }
  const { status, headers, data } = error.response
  const responseHeaders = AxiosHeaders.from(headers as RawAxiosHeaders)
  const requestId = responseHeaders.get('X-Request-Id')
  const retryAfter = responseHeaders.get('Retry-After')
  let body: unknown = data
  if (data instanceof Blob) {
    const type = String(responseHeaders.get('Content-Type') ?? data.type)
      .split(';')[0]
      .trim()
      .toLowerCase()
    body = undefined
    if (type === 'application/problem+json' || type === 'application/json') {
      try {
        body = JSON.parse(await data.text())
      } catch {
        /* Safe fallback for truncated/invalid JSON. */
      }
    }
  }
  const problem = parseProblem(body)
  return createApiError('http', {
    status,
    problem,
    requestId: typeof requestId === 'string' ? requestId : problem?.requestId,
    retryAfter: typeof retryAfter === 'string' ? retryAfter : undefined,
  })
}

/** Exposes server guidance to UI/query policies; never schedules a retry. */
export function retryAfterMs(
  value: string | undefined,
  now = Date.now(),
): number | undefined {
  if (!value?.trim()) return undefined
  const text = value.trim()
  if (/^\d+$/.test(text)) {
    const milliseconds = Number(text) * 1000
    return Number.isSafeInteger(milliseconds) ? milliseconds : undefined
  }
  if (!/^[A-Za-z]{3},/.test(text)) return undefined
  const time = Date.parse(text)
  return Number.isFinite(time) ? Math.max(0, time - now) : undefined
}
