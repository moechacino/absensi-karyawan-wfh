import { createApiError, normalizeApiError } from '../api/problem'
import type { ApiError } from '../api/problem'
import { intentFingerprint, snapshotInput } from './snapshot'

export type CommandStatus =
  | 'idle'
  | 'submitting'
  | 'confirmed'
  | 'uncertain'
  | 'in-progress'
  | 'conflict'
export interface CommandState<Result> {
  status: CommandStatus
  error: ApiError | null
  result: Result | undefined
  refreshError: ApiError | null
}
export interface CommandContext {
  idempotencyKey: string | undefined
  signal: AbortSignal
}
export interface CommandOptions<Input, Result> {
  identity: string | null
  getIdentity?: () => string | null
  execute: (input: Input, context: CommandContext) => Promise<Result>
  onConfirmed?: (result: Result) => void | Promise<void>
  idempotent?: boolean
}

function failureStatus(error: ApiError): CommandStatus {
  const code = error.problem?.code
  if (code === 'OPERATION_IN_PROGRESS') return 'in-progress'
  if (
    code &&
    [
      'VERSION_CONFLICT',
      'PREVIEW_STALE',
      'REVIEW_STALE',
      'IDEMPOTENCY_KEY_REUSED',
      'INITIAL_CREDENTIALS_UNAVAILABLE',
    ].includes(code)
  )
    return 'conflict'
  if (
    ['network', 'timeout', 'cancelled'].includes(error.kind) ||
    (error.status ?? 0) >= 500
  )
    return 'uncertain'
  return 'idle'
}

export function createCommand<Input, Result>(
  options: CommandOptions<Input, Result>,
) {
  let callbacks = options
  let state: CommandState<Result> = {
    status: 'idle',
    error: null,
    result: undefined,
    refreshError: null,
  }
  const listeners = new Set<() => void>()
  let generation = 0
  let intent: { input: Input; fingerprint: string; key?: string } | undefined
  let active: Promise<Result | undefined> | undefined
  let abort: AbortController | undefined
  let disposed = false
  function emit(next: CommandState<Result>) {
    state = next
    for (const listener of listeners) listener()
  }
  function current(captured: number): boolean {
    return (
      !disposed &&
      generation === captured &&
      Boolean(options.identity) &&
      (!options.getIdentity || options.getIdentity() === options.identity)
    )
  }
  function reset() {
    generation++
    abort?.abort()
    active = undefined
    intent = undefined
    emit({ status: 'idle', error: null, result: undefined, refreshError: null })
  }
  function run(input: Input): Promise<Result | undefined> {
    if (
      disposed ||
      !options.identity ||
      (options.getIdentity && options.getIdentity() !== options.identity)
    )
      return Promise.reject(createApiError('configuration'))
    const fingerprint = intentFingerprint(input)
    if (intent && intent.fingerprint !== fingerprint)
      return Promise.reject(createApiError('configuration'))
    if (active) return active
    if (state.status === 'confirmed') return Promise.resolve(state.result)
    if (state.status === 'conflict') return Promise.resolve(undefined)
    intent ??= {
      input: snapshotInput(input),
      fingerprint,
      key: options.idempotent === false ? undefined : crypto.randomUUID(),
    }
    const saved = intent
    const captured = generation
    abort = new AbortController()
    const signal = abort.signal
    emit({
      status: 'submitting',
      error: null,
      result: undefined,
      refreshError: null,
    })
    active = (async () => {
      let result: Result
      try {
        result = await callbacks.execute(saved.input, {
          idempotencyKey: saved.key,
          signal,
        })
      } catch (failure) {
        const error = await normalizeApiError(failure)
        if (current(captured))
          emit({
            status: failureStatus(error),
            error,
            result: undefined,
            refreshError: null,
          })
        return undefined
      }
      if (!current(captured)) return undefined
      emit({ status: 'confirmed', error: null, result, refreshError: null })
      // Refresh failures cannot turn a server-confirmed command into a replayable write.
      try {
        await callbacks.onConfirmed?.(result)
      } catch (failure) {
        if (current(captured))
          emit({ ...state, refreshError: await normalizeApiError(failure) })
      }
      return current(captured) ? result : undefined
    })().finally(() => {
      if (generation === captured) active = undefined
    })
    return active
  }
  return {
    configure(next: CommandOptions<Input, Result>) {
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
    retry: () => (intent ? run(intent.input) : Promise.resolve(undefined)),
    reset,
    activate() {
      disposed = false
    },
    dispose() {
      reset()
      disposed = true
    },
  }
}
