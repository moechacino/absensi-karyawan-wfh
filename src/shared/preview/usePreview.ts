import { useLayoutEffect, useMemo, useSyncExternalStore } from 'react'
import { createPreview } from './controller'
import type { PreviewOptions } from './controller'
import { createApiError } from '../api/problem'
import { registerAccountCleanup } from '../query/cleanup'

async function unconfigured(): Promise<never> {
  throw createApiError('configuration')
}

export function usePreview<Input, Result>(
  options: PreviewOptions<Input, Result>,
) {
  const preview = useMemo(
    () =>
      createPreview<Input, Result>({
        identity: options.identity,
        execute: unconfigured,
      }),
    [options.identity],
  )
  useLayoutEffect(() => {
    preview.configure(options)
  }, [preview, options])
  useLayoutEffect(() => {
    preview.activate()
    const unregister = registerAccountCleanup(preview.dispose)
    return () => {
      unregister()
      preview.dispose()
    }
  }, [preview])
  const state = useSyncExternalStore(
    preview.subscribe,
    preview.getState,
    preview.getState,
  )
  return {
    ...state,
    run: preview.run,
    invalidate: preview.invalidate,
    isCurrent: preview.isCurrent,
  }
}
