import { AxiosError, AxiosHeaders } from 'axios'
import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSessionController } from '../sessionController'
import {
  parseStoredSession,
  SESSION_KEY,
  writeStoredSession,
} from '../sessionStorage'
import type { JsonResult } from '../../../shared/api/types'

const now = Date.parse('2026-11-08T00:00:00Z')
const expiresAt = new Date(now + 3_600_000).toISOString()
const profile: JsonResult<'getOwnProfile'> = {
  id: 'employee-one',
  fullName: 'Contoh Karyawan',
  division: { id: 'division', name: 'Engineering', code: 'ENG' },
  position: { id: 'position', name: 'Developer', code: 'DEV' },
  email: 'contoh@example.test',
  role: 'EMPLOYEE',
  status: 'ACTIVE',
  version: 1,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  hasPasswordChanged: false,
  permissions: [],
  photo: null,
  passwordPolicy: {
    minLength: 15,
    maxLength: 128,
    requiresDifferentPassword: true,
  },
}
const loginResult: JsonResult<'login'> = {
  accessToken: 'private-token',
  tokenType: 'Bearer',
  expiresIn: 3600,
  expiresAt,
  serverNow: new Date(now).toISOString(),
  employee: profile,
}
const sessions: ReturnType<typeof createSessionController>[] = []
function harness(storage: () => Storage = () => sessionStorage) {
  const cleanup = vi.fn()
  const adapter = vi.fn<AxiosAdapter>(async (config) => ({
    config,
    data: config.url?.endsWith('/auth/login') ? loginResult : profile,
    status: 200,
    statusText: '',
    headers: {},
  }))
  const session = createSessionController({
    storage,
    cleanup,
    adapter,
    baseUrl: '/api/v1',
    appOrigin: 'https://app.example',
    now: () => Date.now(),
  })
  sessions.push(session)
  return { session, adapter, cleanup }
}
function reject(config: InternalAxiosRequestConfig, status: number): never {
  throw new AxiosError('Raw error', 'ERR_BAD_REQUEST', config, undefined, {
    config,
    data: null,
    status,
    statusText: '',
    headers: new AxiosHeaders(),
  })
}
async function settle() {
  await vi.waitFor(() => expect(1).toBe(1))
  await new Promise((resolve) => setTimeout(resolve, 0))
}
function stored() {
  writeStoredSession(sessionStorage, {
    version: 1,
    accessToken: 'restored-token',
    expiresAt,
  })
}
afterEach(() => {
  sessions.splice(0).forEach((session) => session.stop())
})

describe('sessionStorage record', () => {
  it('keeps only the version, JWT and expiry, never a persisted identity or password', () => {
    writeStoredSession(sessionStorage, {
      version: 1,
      accessToken: 'private-token',
      expiresAt,
    })
    expect(JSON.parse(sessionStorage.getItem(SESSION_KEY)!)).toEqual({
      version: 1,
      accessToken: 'private-token',
      expiresAt,
    })
    expect(
      parseStoredSession(
        JSON.stringify({
          version: 1,
          accessToken: 't',
          expiresAt,
          profile,
          password: 'private',
        }),
        now,
      ),
    ).toEqual({ version: 1, accessToken: 't', expiresAt })
  })
  it.each([
    null,
    '{invalid',
    '{}',
    'null',
    JSON.stringify({ version: 2, accessToken: 't', expiresAt }),
    JSON.stringify({ version: 1, accessToken: '', expiresAt }),
    JSON.stringify({ version: 1, accessToken: 't', expiresAt: 'invalid' }),
    JSON.stringify({
      version: 1,
      accessToken: 't',
      expiresAt: new Date(now).toISOString(),
    }),
  ])('rejects malformed or expired records (%s)', (raw) =>
    expect(parseStoredSession(raw, now)).toBeNull(),
  )
})

describe('session lifecycle', () => {
  it('restores only after /me validates the identity', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(now)
    stored()
    const { session, adapter } = harness()
    let resolve:
      | ((value: Awaited<ReturnType<AxiosAdapter>>) => void)
      | undefined
    adapter.mockImplementationOnce(
      (config) =>
        new Promise((done) => {
          resolve = (value) => done({ ...value, config })
        }),
    )
    session.start()
    expect(session.getSnapshot().status).toBe('loading')
    await vi.waitFor(() => expect(adapter).toHaveBeenCalledOnce())
    const config = adapter.mock.calls[0][0]
    expect(config.headers.get('Authorization')).toBe('Bearer restored-token')
    resolve!({
      config,
      data: profile,
      status: 200,
      statusText: '',
      headers: {},
    })
    await vi.waitFor(() =>
      expect(session.getSnapshot()).toMatchObject({
        status: 'authenticated',
        profile,
      }),
    )
  })

  it('removes malformed records without calling the server', async () => {
    sessionStorage.setItem(SESSION_KEY, '{bad')
    const { session, adapter } = harness()
    session.start()
    expect(session.getSnapshot().status).toBe('anonymous')
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull()
    expect(adapter).not.toHaveBeenCalled()
  })

  it.each([401, 403, 503])(
    'handles bootstrap HTTP %s without a login loop',
    async (status) => {
      vi.spyOn(Date, 'now').mockReturnValue(now)
      stored()
      const { session, adapter } = harness()
      adapter.mockImplementationOnce(async (config) => reject(config, status))
      session.start()
      await vi.waitFor(() =>
        expect(session.getSnapshot().status).toBe(
          status === 401 ? 'anonymous' : 'error',
        ),
      )
      expect(session.getSnapshot().profile).toBeNull()
      expect(Boolean(sessionStorage.getItem(SESSION_KEY))).toBe(status !== 401)
      expect(adapter).toHaveBeenCalledOnce()
      if (status !== 401) {
        session.retry()
        await vi.waitFor(() =>
          expect(session.getSnapshot().status).toBe('authenticated'),
        )
      }
    },
  )

  it('keeps a transient /me failure hidden and supports an explicit retry', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(now)
    stored()
    const { session, adapter } = harness()
    adapter.mockRejectedValueOnce(new AxiosError('Offline', 'ERR_NETWORK'))
    session.start()
    await vi.waitFor(() => expect(session.getSnapshot().status).toBe('error'))
    expect(session.getSnapshot().profile).toBeNull()
    expect(sessionStorage.getItem(SESSION_KEY)).not.toBeNull()
    session.retry()
    await vi.waitFor(() =>
      expect(session.getSnapshot().profile).toEqual(profile),
    )
  })

  it('preserves exact login credentials, stores only token/expiry and permits unchanged-password access', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(now)
    const { session, adapter } = harness()
    await session.login({
      email: 'user@example.test',
      password: '  unchanged password  ',
    })
    expect(JSON.parse(adapter.mock.calls[0][0].data as string)).toEqual({
      email: 'user@example.test',
      password: '  unchanged password  ',
    })
    expect(session.getSnapshot()).toMatchObject({
      status: 'authenticated',
      profile: { hasPasswordChanged: false },
    })
    expect(
      Object.keys(JSON.parse(sessionStorage.getItem(SESSION_KEY)!)),
    ).toEqual(['version', 'accessToken', 'expiresAt'])
    expect(localStorage.length).toBe(0)
  })

  it('does not claim login success when sessionStorage writes fail', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(now)
    const { session } = harness(
      () =>
        ({
          ...sessionStorage,
          removeItem: () => undefined,
          setItem: () => {
            throw new Error('Quota failure')
          },
        }) as Storage,
    )
    await expect(
      session.login({ email: 'user@example.test', password: 'private' }),
    ).rejects.toMatchObject({ kind: 'configuration' })
    expect(session.getSnapshot()).toMatchObject({
      status: 'anonymous',
      profile: null,
      reason: 'storage',
    })
  })

  it('exposes unavailable storage safely rather than falling back to localStorage', () => {
    const { session, adapter } = harness(() => {
      throw new Error('Storage disabled')
    })
    session.start()
    expect(session.getSnapshot()).toMatchObject({
      status: 'error',
      reason: 'storage',
      profile: null,
    })
    expect(adapter).not.toHaveBeenCalled()
    expect(localStorage.length).toBe(0)
  })

  it('expires using the returned server duration despite local clock skew', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(now + 86_400_000)
    const { session, cleanup } = harness()
    await session.login({ email: 'user@example.test', password: 'private' })
    expect(session.getSnapshot().status).toBe('authenticated')
    await vi.advanceTimersByTimeAsync(3_600_000)
    expect(session.getSnapshot()).toMatchObject({
      status: 'anonymous',
      reason: 'expired',
      profile: null,
    })
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull()
    expect(cleanup).toHaveBeenCalled()
  })

  it('rechecks expiry after a suspended tab resumes', async () => {
    let clock = now
    vi.spyOn(Date, 'now').mockImplementation(() => clock)
    const { session } = harness()
    await session.login({ email: 'user@example.test', password: 'private' })
    clock += 3_600_001
    session.recheck()
    expect(session.getSnapshot().status).toBe('anonymous')
  })

  it.each([true, false])(
    'clears local/private state even when logout network success is %s',
    async (success) => {
      vi.spyOn(Date, 'now').mockReturnValue(now)
      const { session, adapter, cleanup } = harness()
      await session.login({ email: 'user@example.test', password: 'private' })
      if (!success)
        adapter.mockRejectedValueOnce(new AxiosError('Offline', 'ERR_NETWORK'))
      await session.logout()
      expect(session.getSnapshot()).toMatchObject({
        status: 'anonymous',
        profile: null,
      })
      expect(sessionStorage.getItem(SESSION_KEY)).toBeNull()
      expect(cleanup).toHaveBeenCalledTimes(2)
      expect(adapter.mock.calls[1][0].headers.get('Authorization')).toBe(
        'Bearer private-token',
      )
    },
  )

  it('ignores an earlier /me response after logout and a different login', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(now)
    stored()
    const { session, adapter } = harness()
    let finish: (() => void) | undefined
    adapter.mockImplementationOnce(
      (config) =>
        new Promise((resolve) => {
          finish = () =>
            resolve({
              config,
              data: { ...profile, id: 'old-employee' },
              status: 200,
              statusText: '',
              headers: {},
            })
        }),
    )
    session.start()
    await vi.waitFor(() => expect(finish).toBeDefined())
    session.clearSession()
    await session.login({ email: 'user@example.test', password: 'private' })
    finish!()
    await settle()
    expect(session.getSnapshot().profile?.id).toBe(profile.id)
    expect(sessionStorage.getItem(SESSION_KEY)).toContain('private-token')
  })
})
