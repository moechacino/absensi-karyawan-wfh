import { AxiosError, AxiosHeaders, CanceledError } from 'axios'
import { describe, expect, it } from 'vitest'
import { normalizeApiError, parseProblem, retryAfterMs } from '../problem'

// jsdom Blob lacks text(); mock that browser primitive without a transport.
function textBlob(text: string, type: string): Blob {
  return Object.assign(new Blob([text], { type }), { text: async () => text })
}

const problem = {
  type: 'urn:problem:validation',
  title: 'Validation failed',
  status: 422,
  code: 'VALIDATION_FAILED',
  requestId: 'problem-request',
  detail: 'Check fields.',
  errors: [
    { field: 'email', code: 'INVALID_EMAIL', message: 'Email tidak valid.' },
  ],
  details: { expectedVersion: 2 },
}

function httpError(data: unknown, status = 422, headers = new AxiosHeaders()) {
  return new AxiosError(
    'Raw message must not escape',
    'ERR_BAD_REQUEST',
    undefined,
    undefined,
    {
      status,
      statusText: '',
      headers,
      data,
      config: {
        headers: new AxiosHeaders({ Authorization: 'Bearer private-token' }),
      },
    },
  )
}

describe('Problem boundary', () => {
  it('preserves contract metadata and prefers response correlation headers', async () => {
    const error = await normalizeApiError(
      httpError(
        problem,
        422,
        new AxiosHeaders({
          'x-request-id': 'header-request',
          'retry-after': '30',
        }),
      ),
    )
    expect(error).toMatchObject({
      kind: 'http',
      status: 422,
      problem,
      requestId: 'header-request',
      retryAfter: '30',
    })
    expect(error.message).not.toContain('Raw message')
    expect(error).not.toHaveProperty('config')
    expect(error).not.toHaveProperty('cause')
    expect(JSON.stringify(error)).not.toContain('private-token')
  })

  it('uses body correlation IDs when no response header is exposed', async () => {
    expect(await normalizeApiError(httpError(problem))).toMatchObject({
      requestId: 'problem-request',
    })
  })

  it.each([
    null,
    '<html>Internal credentials</html>',
    { message: 'Database password' },
    { ...problem, status: '422' },
    { ...problem, code: null },
    { ...problem, status: 200 },
  ])('handles unexpected bodies with a safe fallback (%j)', async (body) => {
    const error = await normalizeApiError(httpError(body, 500))
    expect(error).toMatchObject({
      kind: 'http',
      status: 500,
      problem: undefined,
    })
    expect(JSON.stringify(error)).not.toContain('password')
  })

  it('drops malformed optional errors/details instead of passing unsafe shapes to forms', () => {
    expect(
      parseProblem({ ...problem, errors: [{ field: 'email' }], details: [] }),
    ).toEqual({ ...problem, errors: undefined, details: undefined })
  })

  it('parses Problem JSON returned as an error blob', async () => {
    const body = textBlob(JSON.stringify(problem), 'application/problem+json')
    expect(await normalizeApiError(httpError(body))).toMatchObject({ problem })
  })

  it('safely falls back for truncated JSON and private binary error blobs', async () => {
    for (const body of [
      textBlob('{bad', 'application/problem+json'),
      textBlob('private bytes', 'image/png'),
    ]) {
      expect(await normalizeApiError(httpError(body))).toMatchObject({
        kind: 'http',
        problem: undefined,
      })
    }
  })

  it.each([
    [new CanceledError('private message'), 'cancelled'],
    [new AxiosError('private message', 'ERR_NETWORK'), 'network'],
    [new AxiosError('private message', 'ECONNABORTED'), 'timeout'],
    [new AxiosError('private message', 'ETIMEDOUT'), 'timeout'],
    [new Error('private config'), 'configuration'],
  ])(
    'distinguishes failures without exposing raw transport messages',
    async (failure, kind) => {
      const error = await normalizeApiError(failure)
      expect(error.kind).toBe(kind)
      expect(error.status).toBeUndefined()
      expect(error.message).not.toContain('private')
    },
  )

  it('parses Retry-After seconds/dates without inventing retry commands', () => {
    const now = Date.parse('Sat, 07 Nov 2026 12:00:00 GMT')
    expect(retryAfterMs('30', now)).toBe(30_000)
    expect(retryAfterMs('Sat, 07 Nov 2026 12:01:00 GMT', now)).toBe(60_000)
    expect(retryAfterMs('Sat, 07 Nov 2026 11:59:00 GMT', now)).toBe(0)
    for (const value of [
      undefined,
      '',
      '-1',
      '1.5',
      'tomorrow',
      '99999999999999999',
    ])
      expect(retryAfterMs(value, now)).toBeUndefined()
  })
})
