import { createApiError } from '../api/problem'

const blobs = new WeakMap<Blob, number>()
let nextBlob = 0

/** Blob bytes are immutable; retain only their in-memory identity, never serialize them. */
export function intentFingerprint(value: unknown): string {
  if (value instanceof Blob) {
    if (!blobs.has(value)) blobs.set(value, ++nextBlob)
    return `blob:${blobs.get(value)}`
  }
  if (Array.isArray(value)) return `[${value.map(intentFingerprint).join(',')}]`
  if (value && typeof value === 'object') {
    if (
      Object.getPrototypeOf(value) !== Object.prototype &&
      Object.getPrototypeOf(value) !== null
    )
      throw createApiError('configuration')
    return `{${Object.keys(value)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${intentFingerprint((value as Record<string, unknown>)[key])}`,
      )
      .join(',')}}`
  }
  if (typeof value === 'number' && !Number.isFinite(value))
    throw createApiError('configuration')
  if (['function', 'symbol', 'bigint'].includes(typeof value))
    throw createApiError('configuration')
  return `${typeof value}:${JSON.stringify(value)}`
}

export function snapshotInput<T>(value: T): T {
  if (value instanceof Blob || value === null || typeof value !== 'object')
    return value
  if (Array.isArray(value)) return Object.freeze(value.map(snapshotInput)) as T
  return Object.freeze(
    Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, snapshotInput(child)]),
    ),
  ) as T
}
