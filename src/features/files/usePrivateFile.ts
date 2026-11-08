import { useEffect, useState } from 'react'
import { useApi, useSession } from '../../shared/auth'
import { createApiError, normalizeApiError } from '../../shared/api/problem'
import type { ApiError } from '../../shared/api/problem'
import { registerAccountCleanup } from '../../shared/query/cleanup'
import { validFileMetadata, verifiedImageBlob } from './contentPath'
import type { FileMetadata } from './contentPath'

interface Result {
  key: string
  url: string | null
  error: ApiError | null
}

/** Bytes and object URLs never enter Query caches or persistent storage. */
export function usePrivateFile(
  file: FileMetadata | null | undefined,
  enabled = true,
) {
  const api = useApi()
  const { profile, status } = useSession()
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<Result | null>(null)
  const key = JSON.stringify([
    profile?.id,
    status,
    file?.id,
    file?.contentPath,
    file?.mimeType,
    file?.sizeBytes,
    enabled,
    attempt,
  ])
  const active = enabled && !!file && status === 'authenticated'

  useEffect(() => {
    if (!active || !file) return
    let alive = true
    let objectUrl: string | null = null
    const controller = new AbortController()
    const cleanup = () => {
      alive = false
      controller.abort()
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
        objectUrl = null
      }
    }
    const unregister = registerAccountCleanup(() => {
      cleanup()
      setResult(null)
    })
    async function load() {
      try {
        if (!validFileMetadata(file!)) throw createApiError('configuration')
        const blob = await api.readFile(file!, controller.signal)
        if (!alive) return
        if (!verifiedImageBlob(blob, file!))
          throw createApiError('configuration')
        objectUrl = URL.createObjectURL(blob)
        if (alive) setResult({ key, url: objectUrl, error: null })
      } catch (failure) {
        const error = await normalizeApiError(failure)
        if (alive) setResult({ key, url: null, error })
      }
    }
    void load()
    return () => {
      unregister()
      cleanup()
    }
  }, [key, api, active, file])

  return {
    url: active && result?.key === key ? result.url : null,
    error: active && result?.key === key ? result.error : null,
    loading: active && result?.key !== key,
    retry: () => setAttempt((value) => value + 1),
  }
}
