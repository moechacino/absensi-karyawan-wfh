import { normalizeApiError } from '../api/problem'
import type { ApiError } from '../api/problem'
import { intentFingerprint, snapshotInput } from '../commands/snapshot'

export interface PreviewOptions<Input, Result> {
  identity: string | null
  getIdentity?: () => string | null
  execute: (input: Input, signal: AbortSignal) => Promise<Result>
  getExpiresAt?: (result: Result) => string | undefined
}
export interface PreviewState<Result> {
  status: 'idle' | 'loading' | 'ready' | 'error'
  result: Result | undefined
  error: ApiError | null
}

export function createPreview<Input, Result>(
  options: PreviewOptions<Input, Result>,
) {
  let callbacks = options
  let state: PreviewState<Result> = {
    status: 'idle',
    result: undefined,
    error: null,
  }
  const listeners = new Set<() => void>()
  let generation = 0
  let fingerprint: string | undefined
  let abort: AbortController | undefined
  let expiry: number | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  let disposed = false
  const identityMatches = () =>
    Boolean(options.identity) &&
    (!options.getIdentity || options.identity === options.getIdentity())
  function emit(next: PreviewState<Result>) {
    state = next
    for (const listener of listeners) listener()
  }
  function invalidate() {
    generation++
    abort?.abort()
    clearTimeout(timer)
    expiry = undefined
    fingerprint = undefined
    emit({ status: 'idle', result: undefined, error: null })
  }
  async function run(input: Input): Promise<Result | undefined> {
    if (disposed || !identityMatches()) return undefined
    invalidate()
    fingerprint = intentFingerprint(input)
    const captured = generation
    abort = new AbortController()
    emit({ status: 'loading', result: undefined, error: null })
    try {
      const result = await callbacks.execute(snapshotInput(input), abort.signal)
      if (disposed || generation !== captured || !identityMatches())
        return undefined
      const expiresAt = callbacks.getExpiresAt?.(result)
      expiry = expiresAt ? Date.parse(expiresAt) : undefined
      if (
        expiresAt &&
        (!Number.isFinite(expiry) || (expiry ?? 0) <= Date.now())
      ) {
        invalidate()
        return undefined
      }
      emit({ status: 'ready', result, error: null })
      if (expiry !== undefined)
        timer = setTimeout(
          invalidate,
          Math.min(expiry - Date.now(), 2_147_483_647),
        )
      return result
    } catch (failure) {
      const error = await normalizeApiError(failure)
      if (!disposed && generation === captured && identityMatches())
        emit({ status: 'error', result: undefined, error })
      return undefined
    }
  }
  return {
    configure(next: PreviewOptions<Input, Result>) {
      callbacks = next
    },
    getState: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    run,
    invalidate,
    isCurrent: (input: Input) =>
      state.status === 'ready' &&
      identityMatches() &&
      fingerprint === intentFingerprint(input) &&
      (expiry === undefined || expiry > Date.now()),
    activate() {
      disposed = false
    },
    dispose() {
      invalidate()
      disposed = true
    },
  }
}
