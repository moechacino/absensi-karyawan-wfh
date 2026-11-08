import { describe, expect, it, vi } from 'vitest'
import { createApiError } from '../../api/problem'
import { createCommand } from '../controller'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (value: unknown) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

function problem(code: string, status = 409) {
  return createApiError('http', {
    status,
    problem: {
      type: 'urn:problem',
      title: 'Command rejected',
      code,
      status,
      requestId: 'request',
    },
  })
}

describe('command controller', () => {
  it('deduplicates clicks, freezes a snapshot and confirms only after the server', async () => {
    const request = deferred<{ id: string }>()
    const execute = vi.fn(
      (_input: { expectedVersion: number; nested: { title: string } }) => {
        void _input
        return request.promise
      },
    )
    const controller = createCommand({ identity: 'one', execute })
    const input = { expectedVersion: 2, nested: { title: 'before' } }
    const first = controller.run(input)
    input.nested.title = 'after'
    expect(controller.getState().status).toBe('submitting')
    expect(execute.mock.calls[0][0]).toEqual({
      expectedVersion: 2,
      nested: { title: 'before' },
    })
    expect(Object.isFrozen(execute.mock.calls[0][0])).toBe(true)
    await expect(controller.run(input)).rejects.toMatchObject({
      kind: 'configuration',
    })
    expect(
      controller.run({ expectedVersion: 2, nested: { title: 'before' } }),
    ).toBe(first)
    request.resolve({ id: 'saved' })
    expect(await first).toEqual({ id: 'saved' })
    expect(controller.getState().status).toBe('confirmed')
    await controller.run({ nested: { title: 'before' }, expectedVersion: 2 })
    expect(execute).toHaveBeenCalledOnce()
  })

  it('retains the same actor/key/version/file for a deliberate uncertain retry', async () => {
    const photo = new File(['photo'], 'capture.png', { type: 'image/png' })
    const execute = vi.fn(
      async (
        _input: { photo: File; expectedVersion: number },
        _context: { idempotencyKey?: string; signal: AbortSignal },
      ) => {
        void _input
        void _context
        return { id: 'ok' }
      },
    )
    execute.mockRejectedValueOnce(createApiError('timeout'))
    const controller = createCommand({ identity: 'actor', execute })
    expect(await controller.run({ photo, expectedVersion: 4 })).toBeUndefined()
    expect(controller.getState().status).toBe('uncertain')
    const firstKey = execute.mock.calls[0][1].idempotencyKey
    await expect(
      controller.run({
        photo: new File(['different'], 'capture.png'),
        expectedVersion: 4,
      }),
    ).rejects.toMatchObject({ kind: 'configuration' })
    await controller.retry()
    expect(execute.mock.calls[1][0].photo).toBe(photo)
    expect(execute.mock.calls[1][1].idempotencyKey).toBe(firstKey)
    expect(controller.getState().status).toBe('confirmed')
    controller.reset()
    await controller.run({ photo, expectedVersion: 5 })
    expect(execute.mock.calls[2][1].idempotencyKey).not.toBe(firstKey)
  })

  it.each([
    [problem('OPERATION_IN_PROGRESS'), 'in-progress'],
    [problem('IDEMPOTENCY_KEY_REUSED'), 'conflict'],
    [problem('VERSION_CONFLICT'), 'conflict'],
    [problem('PREVIEW_STALE'), 'conflict'],
    [createApiError('http', { status: 422 }), 'idle'],
    [createApiError('network'), 'uncertain'],
    [createApiError('cancelled'), 'uncertain'],
    [createApiError('http', { status: 503 }), 'uncertain'],
  ])('distinguishes stable error outcomes', async (error, expected) => {
    const controller = createCommand({
      identity: 'one',
      execute: vi.fn().mockRejectedValue(error),
    })
    await controller.run({ field: 'value' })
    expect(controller.getState()).toMatchObject({ status: expected, error })
  })

  it('does not allow an old identity or late success to confirm a new account', async () => {
    let identity: string | null = 'one'
    const request = deferred<string>()
    const confirmed = vi.fn()
    const controller = createCommand({
      identity,
      getIdentity: () => identity,
      execute: () => request.promise,
      onConfirmed: confirmed,
    })
    const pending = controller.run({ field: 'value' })
    identity = 'two'
    controller.dispose()
    request.resolve('late secret')
    expect(await pending).toBeUndefined()
    expect(controller.getState()).toMatchObject({
      status: 'idle',
      result: undefined,
    })
    expect(confirmed).not.toHaveBeenCalled()
    await expect(controller.run({ field: 'value' })).rejects.toMatchObject({
      kind: 'configuration',
    })
  })

  it('aborts reset intents and ignores their late failures', async () => {
    const request = deferred<string>()
    const execute = vi.fn(
      (_input: object, _context: { signal: AbortSignal }) => {
        void _input
        void _context
        return request.promise
      },
    )
    const controller = createCommand({ identity: 'one', execute })
    const pending = controller.run({})
    controller.reset()
    expect(execute.mock.calls[0][1].signal.aborted).toBe(true)
    request.reject(createApiError('network'))
    await pending
    expect(controller.getState().status).toBe('idle')
  })

  it('keeps confirmed results when subsequent invalidation fails', async () => {
    const controller = createCommand({
      identity: 'one',
      execute: async () => 'saved',
      onConfirmed: async () => {
        throw createApiError('network')
      },
    })
    expect(await controller.run({})).toBe('saved')
    expect(controller.getState()).toMatchObject({
      status: 'confirmed',
      result: 'saved',
      error: null,
      refreshError: { kind: 'network' },
    })
  })

  it('supports commands with no idempotency header and StrictMode effect reactivation', async () => {
    const execute = vi.fn(
      async (_input: object, _context: { idempotencyKey?: string }) => {
        void _input
        void _context
        return 'done'
      },
    )
    const controller = createCommand({
      identity: 'one',
      execute,
      idempotent: false,
    })
    controller.dispose()
    controller.activate()
    await controller.run({})
    expect(execute.mock.calls[0][1].idempotencyKey).toBeUndefined()
  })
})
