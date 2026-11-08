import { act, renderHook } from '@testing-library/react'
import { StrictMode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { useCommand } from '../useCommand'
import { createApiError } from '../../api/problem'

function wrapper({ children }: { children: React.ReactNode }) {
  return <StrictMode>{children}</StrictMode>
}

describe('command hook lifecycle', () => {
  it('survives StrictMode, uses current callbacks, and clears snapshots across identities', async () => {
    const execute = vi.fn(async (value: { name: string }) => value.name)
    const oldConfirmed = vi.fn(),
      nextConfirmed = vi.fn()
    const { result, rerender } = renderHook(
      ({ identity, onConfirmed }) =>
        useCommand({
          identity,
          execute,
          onConfirmed,
        }),
      { wrapper, initialProps: { identity: 'one', onConfirmed: oldConfirmed } },
    )
    rerender({ identity: 'one', onConfirmed: nextConfirmed })
    await act(async () => {
      await result.current.run({ name: 'saved' })
    })
    expect(result.current).toMatchObject({
      status: 'confirmed',
      result: 'saved',
    })
    expect(oldConfirmed).not.toHaveBeenCalled()
    expect(nextConfirmed).toHaveBeenCalledWith('saved')
    rerender({ identity: 'two', onConfirmed: nextConfirmed })
    expect(result.current).toMatchObject({ status: 'idle', result: undefined })
    await act(async () => {
      await result.current.run({ name: 'other account' })
    })
    expect(execute).toHaveBeenCalledTimes(2)
  })

  it('exposes uncertain intent until deliberate retry rather than automatically rerunning', async () => {
    const execute = vi
      .fn()
      .mockRejectedValueOnce(createApiError('network'))
      .mockResolvedValueOnce('saved')
    const { result } = renderHook(
      () => useCommand({ identity: 'one', execute }),
      { wrapper },
    )
    await act(async () => {
      await result.current.run({ expectedVersion: 1 })
    })
    expect(result.current.status).toBe('uncertain')
    expect(execute).toHaveBeenCalledOnce()
    await act(async () => {
      await result.current.retry()
    })
    expect(result.current.status).toBe('confirmed')
    expect(execute.mock.calls[1][1].idempotencyKey).toBe(
      execute.mock.calls[0][1].idempotencyKey,
    )
  })
})
