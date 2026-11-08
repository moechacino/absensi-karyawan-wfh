import { useEffect, useState } from 'react'
import { registerAccountCleanup } from '../../shared/query/cleanup'

/** Local unsent image preview only; selecting a file never uploads it. */
export function useLocalPreview(file: File | null | undefined): string | null {
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(
    null,
  )
  useEffect(() => {
    if (!file) return
    let alive = true
    let url: string | null = null
    const cleanup = () => {
      alive = false
      if (url) {
        URL.revokeObjectURL(url)
        url = null
      }
    }
    const unregister = registerAccountCleanup(() => {
      cleanup()
      setPreview(null)
    })
    // Object URL work stays out of render, including aborted/StrictMode renders.
    void Promise.resolve().then(() => {
      if (
        !alive ||
        !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
      )
        return
      try {
        url = URL.createObjectURL(file)
        setPreview({ file, url })
      } catch {
        /* The caller retains its local file even if preview is unavailable. */
      }
    })
    return () => {
      unregister()
      cleanup()
    }
  }, [file])
  return preview && preview.file === file ? preview.url : null
}
