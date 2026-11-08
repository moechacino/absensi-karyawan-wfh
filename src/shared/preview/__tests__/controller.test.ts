import { describe, expect, it, vi } from 'vitest'
import { createApiError } from '../../api/problem'
import { createPreview } from '../controller'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (value: unknown) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

describe('preview coordination', () => {
  it('invalidates immediately on edits and ignores superseded successful responses', async () => {
    const first = deferred<string>(),
      second = deferred<string>()
    const execute = vi
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)
    const preview = createPreview({ identity: 'one', execute })
    const a = preview.run({ timezone: 'Asia/Jakarta' })
    preview.invalidate()
    expect(execute.mock.calls[0][1].aborted).toBe(true)
    const b = preview.run({ timezone: 'Asia/Makassar' })
    first.resolve('stale-token')
    expect(await a).toBeUndefined()
    expect(preview.getState().status).toBe('loading')
    second.resolve('current-token')
    await b
    expect(preview.isCurrent({ timezone: 'Asia/Jakarta' })).toBe(false)
    expect(preview.isCurrent({ timezone: 'Asia/Makassar' })).toBe(true)
    preview.invalidate()
    expect(preview.getState()).toMatchObject({
      status: 'idle',
      result: undefined,
    })
  })

  it('expires only according to returned expiry and rejects already expired/invalid tokens', async () => {
    vi.useFakeTimers()
    vi.setSystemTime('2026-11-08T12:00:00Z')
    const preview = createPreview({
      identity: 'one',
      execute: async () => ({
        token: 'token',
        expiresAt: '2026-11-08T12:00:05Z',
      }),
      getExpiresAt: (result) => result.expiresAt,
    })
    await preview.run({ version: 1 })
    expect(preview.isCurrent({ version: 1 })).toBe(true)
    vi.advanceTimersByTime(5000)
    expect(preview.getState().status).toBe('idle')
    expect(preview.isCurrent({ version: 1 })).toBe(false)
    for (const expiresAt of ['2026-11-08T11:59:00Z', 'invalid']) {
      const expired = createPreview({
        identity: 'one',
        execute: async () => ({ expiresAt }),
        getExpiresAt: (result) => result.expiresAt,
      })
      await expired.run({})
      expect(expired.getState().status).toBe('idle')
    }
  })

  it('keeps late failures and old-account results from replacing a later preview', async () => {
    let identity = 'one'
    const first = deferred<string>()
    const execute = vi
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce('new')
    const preview = createPreview({
      identity: 'one',
      getIdentity: () => identity,
      execute,
    })
    const pending = preview.run({ version: 1 })
    await preview.run({ version: 2 })
    first.reject(createApiError('network'))
    await pending
    expect(preview.getState()).toMatchObject({ status: 'ready', result: 'new' })
    identity = 'two'
    expect(preview.isCurrent({ version: 2 })).toBe(false)
    preview.dispose()
    expect(preview.getState().result).toBeUndefined()
  })

  it('normalizes current errors without making a failed preview submit-ready', async () => {
    const preview = createPreview({
      identity: 'one',
      execute: async () => {
        throw createApiError('http', { status: 422 })
      },
    })
    await preview.run({})
    expect(preview.getState()).toMatchObject({
      status: 'error',
      error: { status: 422 },
    })
    expect(preview.isCurrent({})).toBe(false)
  })
})
