import { createApiClient } from '../../shared/api/client'
import type { ApiClientOptions } from '../../shared/api/client'
import {
  createApiError,
  isApiError,
  normalizeApiError,
} from '../../shared/api/problem'
import type { ApiError } from '../../shared/api/problem'
import type { JsonBody, JsonResult } from '../../shared/api/types'
import { authService } from './api'
import {
  readStoredSession,
  SESSION_KEY,
  writeStoredSession,
} from './sessionStorage'
import type { StoredSession } from './sessionStorage'

export type SessionStatus = 'loading' | 'authenticated' | 'anonymous' | 'error'
export interface SessionSnapshot {
  status: SessionStatus
  profile: JsonResult<'getOwnProfile'> | null
  expiresAt: string | null
  error: ApiError | null
  reason: 'expired' | 'storage' | null
}

interface SessionControllerOptions
  extends Pick<ApiClientOptions, 'baseUrl' | 'appOrigin' | 'adapter'> {
  storage: () => Storage
  cleanup: () => void
  now?: () => number
}

function storageError(): ApiError {
  return Object.assign(createApiError('configuration'), {
    message:
      'Penyimpanan sesi tidak tersedia. Izinkan penyimpanan browser lalu coba lagi.',
  })
}

/** In-memory session state with generation guards; no JWT decoding or cached role. */
export function createSessionController({
  storage,
  cleanup,
  now = Date.now,
  ...apiOptions
}: SessionControllerOptions) {
  let snapshot: SessionSnapshot = {
    status: 'loading',
    profile: null,
    expiresAt: null,
    error: null,
    reason: null,
  }
  let token: string | null = null
  let generation = 0
  let deadline = 0
  let request: AbortController | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  let started = false
  const listeners = new Set<() => void>()
  const api = createApiClient({
    ...apiOptions,
    getAccessToken: () => token,
    onAuthenticationFailure: () => clearSession('expired'),
  })
  const service = authService(api)

  function publish(next: SessionSnapshot) {
    snapshot = next
    listeners.forEach((listener) => listener())
  }
  function invalidate() {
    generation++
    request?.abort()
    request = undefined
    clearTimeout(timer)
    cleanup()
  }
  function clearSession(reason: SessionSnapshot['reason'] = null) {
    invalidate()
    token = null
    deadline = 0
    let error: ApiError | null = null
    try {
      storage().removeItem(SESSION_KEY)
    } catch {
      error = storageError()
    }
    publish({
      status: error ? 'error' : 'anonymous',
      profile: null,
      expiresAt: null,
      error,
      reason: error ? 'storage' : reason,
    })
  }
  function recheck() {
    if (token && deadline && now() >= deadline) clearSession('expired')
  }
  function scheduleExpiry() {
    clearTimeout(timer)
    if (!token) return
    const remaining = deadline - now()
    if (remaining <= 0) {
      clearSession('expired')
      return
    }
    timer = setTimeout(
      () => {
        recheck()
        if (token) scheduleExpiry()
      },
      Math.min(remaining, 2_147_483_647),
    )
  }

  async function restore() {
    invalidate()
    const revision = generation
    publish({
      status: 'loading',
      profile: null,
      expiresAt: null,
      error: null,
      reason: null,
    })
    let record: StoredSession | null
    try {
      record = readStoredSession(storage(), now())
    } catch {
      token = null
      publish({
        status: 'error',
        profile: null,
        expiresAt: null,
        error: storageError(),
        reason: 'storage',
      })
      return
    }
    if (!record) {
      token = null
      publish({
        status: 'anonymous',
        profile: null,
        expiresAt: null,
        error: null,
        reason: null,
      })
      return
    }
    token = record.accessToken
    deadline = Date.parse(record.expiresAt)
    scheduleExpiry()
    request = new AbortController()
    try {
      const profile = await service.me(request.signal)
      if (revision !== generation) return
      recheck()
      if (revision !== generation) return
      publish({
        status: 'authenticated',
        profile,
        expiresAt: record.expiresAt,
        error: null,
        reason: null,
      })
    } catch (failure) {
      if (revision !== generation) return
      const error = await normalizeApiError(failure)
      if (revision !== generation) return
      if (error.status === 401) {
        clearSession('expired')
        return
      }
      publish({
        status: 'error',
        profile: null,
        expiresAt: record.expiresAt,
        error,
        reason: null,
      })
    }
  }

  async function login(input: JsonBody<'login'>) {
    invalidate()
    token = null
    const revision = generation
    request = new AbortController()
    publish({
      status: 'anonymous',
      profile: null,
      expiresAt: null,
      error: null,
      reason: null,
    })
    try {
      try {
        storage().removeItem(SESSION_KEY)
      } catch {
        throw storageError()
      }
      const result = await service.login(input, request.signal)
      if (revision !== generation) throw createApiError('cancelled')
      const serverNow = Date.parse(result.serverNow)
      const expiry = Date.parse(result.expiresAt)
      const remaining = Math.min(result.expiresIn * 1000, expiry - serverNow)
      if (!result.accessToken || !Number.isFinite(remaining) || remaining <= 0)
        throw createApiError('configuration')
      try {
        writeStoredSession(storage(), {
          version: 1,
          accessToken: result.accessToken,
          expiresAt: result.expiresAt,
        })
      } catch {
        throw storageError()
      }
      token = result.accessToken
      deadline = now() + remaining
      publish({
        status: 'authenticated',
        profile: result.employee,
        expiresAt: result.expiresAt,
        error: null,
        reason: null,
      })
      scheduleExpiry()
    } catch (failure) {
      const error = isApiError(failure)
        ? failure
        : await normalizeApiError(failure)
      if (revision === generation) {
        token = null
        publish({
          status: 'anonymous',
          profile: null,
          expiresAt: null,
          error,
          reason: error.kind === 'configuration' ? 'storage' : null,
        })
      }
      throw error
    }
  }

  async function logout() {
    // Start revocation with the old token before clearing local state immediately.
    const revocation = token
      ? service.logout().catch(() => undefined)
      : Promise.resolve()
    clearSession()
    await revocation
  }

  return {
    api,
    login,
    logout,
    clearSession: () => clearSession(),
    recheck,
    retry: () => {
      void restore()
    },
    refreshProfile: async () => {
      if (!token) return
      const revision = generation
      const profile = await service.me()
      if (revision === generation)
        publish({ ...snapshot, status: 'authenticated', profile, error: null })
    },
    start: () => {
      if (!started) {
        started = true
        void restore()
      }
    },
    stop: () => {
      started = false
      generation++
      request?.abort()
      clearTimeout(timer)
    },
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
