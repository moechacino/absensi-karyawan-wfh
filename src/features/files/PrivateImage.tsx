import { useState } from 'react'
import type { ReactNode } from 'react'
import { usePrivateFile } from './usePrivateFile'
import type { FileMetadata } from './contentPath'

export function PrivateImage({
  file,
  alt,
  className = '',
  fallback,
}: {
  file: FileMetadata | null | undefined
  alt: string
  className?: string
  fallback?: ReactNode
}) {
  const { url, loading } = usePrivateFile(file)
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  if (url && url !== failedUrl)
    return (
      <img
        src={url}
        alt={alt}
        className={className}
        onError={() => setFailedUrl(url)}
      />
    )
  const initials = alt
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => Array.from(part)[0])
    .join('')
    .toLocaleUpperCase('id-ID')
  return (
    <span
      role="img"
      aria-label={alt}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center overflow-hidden rounded-control bg-surface-muted text-text-muted ${className}`}
    >
      {fallback ?? (initials || '—')}
    </span>
  )
}
