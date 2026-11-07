import type { ReactNode } from 'react'

export interface FieldMetadata {
  label: string
  hint?: ReactNode
  error?: string
}

export function describedBy(
  id: string,
  hint: ReactNode,
  error?: string,
  existing?: string,
) {
  return (
    [
      existing,
      hint ? `${id}-hint` : undefined,
      error ? `${id}-error` : undefined,
    ]
      .filter(Boolean)
      .join(' ') || undefined
  )
}
