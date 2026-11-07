import { useId } from 'react'
import { Field } from './Field'
import { describedBy } from './fieldMetadata'
import type { FieldMetadata } from './fieldMetadata'
import { Button } from '../ui/Button'
import { Icon } from '../icons/Icon'
import { classes, focusRing } from '../ui/styles'

export function FileField({
  label,
  hint,
  error,
  file,
  onChange,
  accept,
  required,
  disabled,
  busy,
}: FieldMetadata & {
  file: File | null
  onChange: (file: File | null) => void
  accept?: string
  required?: boolean
  disabled?: boolean
  busy?: boolean
}) {
  const id = useId()
  return (
    <Field id={id} label={label} hint={hint} error={error} required={required}>
      <div className="space-y-3 rounded-card border border-control-border bg-surface p-4">
        <input
          id={id}
          type="file"
          accept={accept}
          disabled={disabled || busy}
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, hint, error)}
          className={classes(
            'block min-h-touch w-full min-w-0 text-small file:mr-3 file:min-h-touch file:rounded-control file:border-0 file:bg-surface-muted file:px-3 file:text-ink disabled:opacity-60',
            focusRing,
          )}
          onChange={(event) => {
            const selected = event.currentTarget.files?.[0]
            event.currentTarget.value = ''
            if (selected) onChange(selected)
          }}
        />
        {file && (
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <Icon
              name={file.type.startsWith('image/') ? 'image' : 'file'}
              className="text-action"
            />
            <div className="min-w-0 flex-1 text-small [overflow-wrap:anywhere]">
              <p>{file.name}</p>
              <p className="text-text-muted">
                {new Intl.NumberFormat('id-ID').format(file.size)} byte
              </p>
            </div>
            <Button
              variant="secondary"
              disabled={disabled || busy}
              onClick={() => onChange(null)}
              aria-label={`Hapus ${file.name}`}
            >
              Hapus
            </Button>
          </div>
        )}
        {busy && (
          <p role="status" className="text-small text-text-muted">
            Mengirim pengajuan…
          </p>
        )}
      </div>
    </Field>
  )
}
