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

export interface ApiError extends Error {
  kind: ApiErrorKind
  status?: number
  problem?: Problem
  requestId?: string
  retryAfter?: string
}

const messages: Record<ApiErrorKind, string> = {
  http: 'Permintaan belum dapat diselesaikan.',
  network: 'Koneksi ke server terputus. Periksa hasil sebelum mencoba lagi.',
  timeout: 'Waktu tunggu habis. Periksa hasil sebelum mencoba lagi.',
  cancelled: 'Permintaan dibatalkan. Hasil tindakan mungkin belum diketahui.',
  configuration: 'Konfigurasi permintaan API tidak valid.',
}

/** Create a plain Error object with a small amount of safe API information. */
export function createApiError(
  kind: ApiErrorKind,
  details: Pick<
    ApiError,
    'status' | 'problem' | 'requestId' | 'retryAfter'
  > = {},
): ApiError {
  return Object.assign(new Error(messages[kind]), {
    name: 'ApiError',
    kind,
    ...details,
  })
}

export function isApiError(value: unknown): value is ApiError {
  return (
    value instanceof Error &&
    value.name === 'ApiError' &&
    ['http', 'network', 'timeout', 'cancelled', 'configuration'].includes(
      (value as ApiError).kind,
    )
  )
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFieldError(value: unknown): value is FieldError {
  if (!isObject(value)) return false
  return (
    typeof value.field === 'string' &&
    typeof value.code === 'string' &&
    typeof value.message === 'string'
  )
}

/** Read a Problem response after checking the fields the UI depends on. */
export function parseProblem(value: unknown): Problem | undefined {
  if (!isObject(value)) return undefined
  if (
    typeof value.type !== 'string' ||
    typeof value.title !== 'string' ||
    typeof value.code !== 'string' ||
    typeof value.requestId !== 'string' ||
    typeof value.status !== 'number' ||
    !Number.isInteger(value.status) ||
    value.status < 400 ||
    value.status > 599
  ) {
    return undefined
  }

  const errors =
    Array.isArray(value.errors) && value.errors.every(isFieldError)
      ? value.errors
      : undefined
  const details = isObject(value.details) ? value.details : undefined
  return {
    type: value.type,
    title: value.title,
    code: value.code,
    requestId: value.requestId,
    status: value.status,
    ...(typeof value.detail === 'string' ? { detail: value.detail } : {}),
    ...(errors ? { errors } : {}),
    ...(details ? { details } : {}),
  }
}

export async function normalizeApiError(failure: unknown): Promise<ApiError> {
  if (isApiError(failure)) return failure
  if (axios.isCancel(failure)) return createApiError('cancelled')
  if (!axios.isAxiosError(failure)) return createApiError('configuration')

  const response = failure.response
  if (!response) {
    const timedOut =
      failure.code === 'ECONNABORTED' || failure.code === 'ETIMEDOUT'
    return createApiError(timedOut ? 'timeout' : 'network')
  }

  const headers = AxiosHeaders.from(response.headers as RawAxiosHeaders)
  const requestIdHeader = headers.get('X-Request-Id')
  const retryAfterHeader = headers.get('Retry-After')
  let body: unknown = response.data
  if (body instanceof Blob) body = await readProblemBlob(body, headers)

  const problem = parseProblem(body)
  return createApiError('http', {
    status: response.status,
    problem,
    requestId:
      typeof requestIdHeader === 'string'
        ? requestIdHeader
        : problem?.requestId,
    retryAfter:
      typeof retryAfterHeader === 'string' ? retryAfterHeader : undefined,
  })
}

async function readProblemBlob(
  blob: Blob,
  headers: AxiosHeaders,
): Promise<unknown> {
  const contentType = String(headers.get('Content-Type') ?? blob.type)
    .split(';')[0]
    .trim()
    .toLowerCase()
  if (
    contentType !== 'application/problem+json' &&
    contentType !== 'application/json'
  ) {
    return undefined
  }
  try {
    return JSON.parse(await blob.text()) as unknown
  } catch {
    return undefined
  }
}

/** Convert Retry-After into milliseconds. This function does not start a retry. */
export function retryAfterMs(
  value: string | undefined,
  now = Date.now(),
): number | undefined {
  if (!value) return undefined
  if (/^\d+$/.test(value)) {
    const seconds = Number(value)
    return Number.isSafeInteger(seconds) ? seconds * 1000 : undefined
  }
  if (!/^[A-Za-z]{3},/.test(value)) return undefined
  const date = Date.parse(value)
  return Number.isFinite(date) ? Math.max(0, date - now) : undefined
}
