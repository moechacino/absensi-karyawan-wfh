import { AxiosError, AxiosHeaders, CanceledError } from 'axios'
import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios'
import { describe, expect, it, vi } from 'vitest'
import { createApiClient } from '../client'
import type { JsonBody, JsonResult } from '../types'

function harness() {
  const adapter = vi.fn<AxiosAdapter>(async (config) => ({
    data: { id: 'direct-result' },
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  }))
  const token = vi.fn<() => string | null>(() => 'token-one')
  const onAuthenticationFailure = vi.fn()
  const client = createApiClient({
    baseUrl: '/api/v1',
    appOrigin: 'https://app.example',
    getAccessToken: token,
    onAuthenticationFailure,
    adapter,
  })
  return { adapter, token, onAuthenticationFailure, client }
}

function rejectHttp(config: InternalAxiosRequestConfig, status: number): never {
  throw new AxiosError('Failed', 'ERR_BAD_RESPONSE', config, undefined, {
    config,
    status,
    statusText: '',
    headers: new AxiosHeaders(),
    data: null,
  })
}

const file = {
  id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  contentPath: '/api/v1/files/f47ac10b-58cc-4372-a567-0e02b2c3d479',
}

describe('Axios API boundary', () => {
  it('returns direct JSON/list results and keeps abort, cache, and auth policies at the boundary', async () => {
    const { client, adapter } = harness()
    const signal = new AbortController().signal
    const result = {
      items: [{ id: 'row' }],
      pagination: { page: 1, totalPages: 2 },
    }
    adapter.mockImplementationOnce(async (config) => ({
      config,
      data: result,
      status: 200,
      statusText: '',
      headers: {},
    }))
    expect(
      await client.request({
        path: '/me/attendance-days',
        params: { page: 1 },
        signal,
      }),
    ).toBe(result)
    const config = adapter.mock.calls[0][0]
    expect(config.url).toBe('https://app.example/api/v1/me/attendance-days')
    expect(config.headers.get('Authorization')).toBe('Bearer token-one')
    expect(config.signal).toBe(signal)
    expect(config.params).toEqual({ page: 1 })
    expect(config.fetchOptions).toMatchObject({
      cache: 'no-store',
      redirect: 'error',
    })
    expect(config.withXSRFToken).toBe(false)
    expect(config.withCredentials).toBe(false)
  })

  it('reads the current token for each request instead of retaining the previous session', async () => {
    const { client, adapter, token } = harness()
    await client.request({ path: '/me' })
    token.mockReturnValue('token-two')
    await client.request({ path: '/me' })
    token.mockReturnValue(null)
    await client.request({ path: '/me' })
    expect(
      adapter.mock.calls.map(([config]) => config.headers.get('Authorization')),
    ).toEqual(['Bearer token-one', 'Bearer token-two', false])
  })

  it('keeps login/explicit public requests anonymous and supports generated JSON bodies/results', async () => {
    const { client, token, adapter } = harness()
    const data: JsonBody<'login'> = {
      email: 'contoh@example.test',
      password: '  unchanged  ',
    }
    await client.request<JsonResult<'login'>>({
      path: '/auth/login',
      method: 'POST',
      data,
    })
    await client.request({ path: '/me', authenticated: false })
    expect(token).not.toHaveBeenCalled()
    expect(adapter.mock.calls[0][0].headers.get('Authorization')).toBe(false)
    expect(JSON.parse(adapter.mock.calls[0][0].data as string)).toEqual(data)
  })

  it.each([
    'https://other.example/api/v1/me',
    'https://app.example/api/v1/me',
    '//other.example/me',
    '/../../other',
    '/%2e%2e/other',
    '/%252e%252e/other',
    '/x/%2f..%2fother',
    '/x/%255cother',
    '/me?token=secret',
    '/me#fragment',
    '/me\\other',
    '/%00',
    '/bad%',
  ])(
    'rejects unsafe path %s before reading a token or sending anything',
    async (path) => {
      const { client, adapter, token } = harness()
      await expect(client.request({ path })).rejects.toMatchObject({
        kind: 'configuration',
      })
      expect(adapter).not.toHaveBeenCalled()
      expect(token).not.toHaveBeenCalled()
    },
  )

  it('supports an explicitly configured different API origin while rejecting outside paths', async () => {
    const { adapter, token } = harness()
    const client = createApiClient({
      baseUrl: 'https://api.example/api/v1',
      appOrigin: 'https://app.example',
      getAccessToken: token,
      adapter,
    })
    await client.request({ path: '/me' })
    expect(adapter.mock.calls[0][0].url).toBe('https://api.example/api/v1/me')
    for (const baseUrl of [
      '//other.example/api/v1',
      'https://user:pass@api.example/api/v1',
      '/other',
      'ftp://api.example/api/v1',
    ])
      expect(() =>
        createApiClient({
          baseUrl,
          appOrigin: 'https://app.example',
          getAccessToken: token,
        }),
      ).toThrow()
  })

  it('returns undefined for a 204 response without parsing a nonexistent body', async () => {
    const { client, adapter } = harness()
    adapter.mockImplementationOnce(async (config) => ({
      config,
      data: '',
      status: 204,
      statusText: '',
      headers: {},
    }))
    const result: JsonResult<'logout'> = await client.request({
      path: '/auth/logout',
      method: 'POST',
    })
    expect(result).toBeUndefined()
  })

  it('does not set a multipart boundary or let Axios default to JSON/form-urlencoded', async () => {
    const { client, adapter } = harness()
    const data = new FormData()
    data.append(
      'photo',
      new File(['bytes'], 'photo.png', { type: 'image/png' }),
    )
    await client.request({
      path: '/me/attendances/check-in',
      method: 'POST',
      data,
      idempotencyKey: 'intent-key',
    })
    const config = adapter.mock.calls[0][0]
    expect(config.data).toBe(data)
    expect(config.headers.getContentType()).toBe(false)
    expect(config.headers.get('Idempotency-Key')).toBe('intent-key')
  })

  it('delegates authenticated 401 only for the token that is still current', async () => {
    const { client, adapter, token, onAuthenticationFailure } = harness()
    adapter.mockImplementation(async (config) => rejectHttp(config, 401))
    await expect(client.request({ path: '/me' })).rejects.toMatchObject({
      kind: 'http',
      status: 401,
    })
    expect(onAuthenticationFailure).toHaveBeenCalledWith(
      'token-one',
      expect.objectContaining({ status: 401 }),
    )
    onAuthenticationFailure.mockClear()
    adapter.mockImplementation(async (config) => {
      token.mockReturnValue('new-account')
      return rejectHttp(config, 401)
    })
    await expect(client.request({ path: '/me' })).rejects.toMatchObject({
      status: 401,
    })
    expect(onAuthenticationFailure).not.toHaveBeenCalled()
  })

  it('does not sign out for invalid login credentials or permission/CSRF denial', async () => {
    const { client, adapter, onAuthenticationFailure } = harness()
    adapter.mockImplementationOnce(async (config) => rejectHttp(config, 401))
    await expect(
      client.request({ path: '/auth/login', method: 'POST' }),
    ).rejects.toMatchObject({ status: 401 })
    adapter.mockImplementationOnce(async (config) => rejectHttp(config, 403))
    await expect(client.request({ path: '/me' })).rejects.toMatchObject({
      status: 403,
    })
    expect(onAuthenticationFailure).not.toHaveBeenCalled()
  })

  it('normalizes cancellation/timeouts without replaying uncertain writes', async () => {
    const { client, adapter } = harness()
    adapter.mockRejectedValueOnce(new CanceledError())
    await expect(
      client.request({ path: '/hr/employees', method: 'POST' }),
    ).rejects.toMatchObject({ kind: 'cancelled' })
    adapter.mockRejectedValueOnce(new AxiosError('private info', 'ETIMEDOUT'))
    await expect(
      client.request({ path: '/hr/employees', method: 'POST' }),
    ).rejects.toMatchObject({ kind: 'timeout' })
    expect(adapter).toHaveBeenCalledTimes(2)
  })

  it('returns authenticated file blobs and rejects mismatched/external metadata', async () => {
    const { client, adapter } = harness()
    const data = new Blob(['image bytes'], { type: 'image/png' })
    adapter.mockImplementationOnce(async (config) => ({
      config,
      data,
      status: 200,
      statusText: '',
      headers: {},
    }))
    expect(await client.readFile(file)).toBe(data)
    expect(adapter.mock.calls[0][0].responseType).toBe('blob')
    expect(adapter.mock.calls[0][0].headers.get('Authorization')).toBe(
      'Bearer token-one',
    )
    expect(adapter.mock.calls[0][0].url).toBe(
      `https://app.example${file.contentPath}`,
    )
    for (const contentPath of [
      'https://other.example/file',
      '/api/v1/files/another-id',
      `${file.contentPath}?token=secret`,
    ])
      await expect(
        client.readFile({ ...file, contentPath }),
      ).rejects.toMatchObject({ kind: 'configuration' })
    expect(adapter).toHaveBeenCalledOnce()
  })
})
