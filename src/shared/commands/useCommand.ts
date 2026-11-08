import { useLayoutEffect, useMemo, useSyncExternalStore } from 'react'
import { createCommand } from './controller'
import type { CommandOptions } from './controller'
import { createApiError } from '../api/problem'
import { registerAccountCleanup } from '../query/cleanup'

async function unconfigured(): Promise<never> {
  throw createApiError('configuration')
}

export function useCommand<Input, Result>(
  options: CommandOptions<Input, Result>,
) {
  const command = useMemo(
    () =>
      createCommand<Input, Result>({
        identity: options.identity,
        idempotent: options.idempotent,
        execute: unconfigured,
      }),
    [options.identity, options.idempotent],
  )
  useLayoutEffect(() => {
    command.configure(options)
  }, [command, options])
  useLayoutEffect(() => {
    command.activate()
    const unregister = registerAccountCleanup(command.dispose)
    return () => {
      unregister()
      command.dispose()
    }
  }, [command])
  const state = useSyncExternalStore(
    command.subscribe,
    command.getState,
    command.getState,
  )
  return {
    ...state,
    run: command.run,
    retry: command.retry,
    reset: command.reset,
  }
}
