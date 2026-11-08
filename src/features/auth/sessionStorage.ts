export const SESSION_KEY = 'absensi-wfh.session.v1'

export interface StoredSession {
  version: 1
  accessToken: string
  expiresAt: string
}

export function parseStoredSession(
  raw: string | null,
  now = Date.now(),
): StoredSession | null {
  if (!raw) return null
  try {
    const data: unknown = JSON.parse(raw)
    if (!data || typeof data !== 'object') return null
    const value = data as Record<string, unknown>
    if (
      value.version !== 1 ||
      typeof value.accessToken !== 'string' ||
      !value.accessToken.trim() ||
      typeof value.expiresAt !== 'string' ||
      !Number.isFinite(Date.parse(value.expiresAt)) ||
      Date.parse(value.expiresAt) <= now
    )
      return null
    return {
      version: 1,
      accessToken: value.accessToken,
      expiresAt: value.expiresAt,
    }
  } catch {
    return null
  }
}

export function readStoredSession(
  storage: Storage,
  now = Date.now(),
): StoredSession | null {
  const raw = storage.getItem(SESSION_KEY)
  const record = parseStoredSession(raw, now)
  if (raw && !record) storage.removeItem(SESSION_KEY)
  if (record && raw !== JSON.stringify(record)) writeStoredSession(storage, record)
  return record
}

export function writeStoredSession(
  storage: Storage,
  record: StoredSession,
): void {
  storage.setItem(
    SESSION_KEY,
    JSON.stringify({
      version: 1,
      accessToken: record.accessToken,
      expiresAt: record.expiresAt,
    }),
  )
}
