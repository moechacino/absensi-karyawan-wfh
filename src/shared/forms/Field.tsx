import type { PropsWithChildren } from 'react'
import type { FieldMetadata } from './fieldMetadata'

export function Field({
  id,
  label,
  hint,
  error,
  required,
  children,
}: PropsWithChildren<FieldMetadata & { id: string; required?: boolean }>) {
  return (
    <div className="min-w-0 space-y-2">
      <label htmlFor={id} className="block text-label font-medium">
        {label}
        {required && (
          <span>
            {' '}
            <span aria-hidden="true">*</span>
            <span className="sr-only">(wajib)</span>
          </span>
        )}
      </label>
      {children}
      {hint && (
        <div
          id={`${id}-hint`}
          className="text-small text-text-muted [overflow-wrap:anywhere]"
        >
          {hint}
        </div>
      )}
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="text-small text-danger [overflow-wrap:anywhere]"
        >
          {error}
        </p>
      )}
    </div>
  )
}
