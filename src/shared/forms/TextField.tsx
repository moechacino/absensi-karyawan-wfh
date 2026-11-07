import { useId } from 'react'
import type { ComponentPropsWithRef, ReactNode } from 'react'
import { Field } from './Field'
import { describedBy } from './fieldMetadata'
import type { FieldMetadata } from './fieldMetadata'
import { classes, controlStyles } from '../ui/styles'

export type TextFieldProps = ComponentPropsWithRef<'input'> &
  FieldMetadata & { trailing?: ReactNode }

export function TextField({
  label,
  hint,
  error,
  trailing,
  id: suppliedId,
  className,
  'aria-describedby': description,
  ...props
}: TextFieldProps) {
  const generatedId = useId()
  const id = suppliedId ?? generatedId
  return (
    <Field
      id={id}
      label={label}
      hint={hint}
      error={error}
      required={props.required}
    >
      <div className="relative">
        <input
          {...props}
          id={id}
          aria-invalid={error ? true : props['aria-invalid']}
          aria-describedby={describedBy(id, hint, error, description)}
          className={classes(
            controlStyles,
            Boolean(trailing) && 'pr-16',
            error && 'border-danger',
            className,
          )}
        />
        {trailing && (
          <div className="absolute inset-y-0 right-0 flex items-center">
            {trailing}
          </div>
        )}
      </div>
    </Field>
  )
}

export function TextAreaField({
  label,
  hint,
  error,
  id: suppliedId,
  className,
  'aria-describedby': description,
  ...props
}: ComponentPropsWithRef<'textarea'> & FieldMetadata) {
  const generatedId = useId()
  const id = suppliedId ?? generatedId
  return (
    <Field
      id={id}
      label={label}
      hint={hint}
      error={error}
      required={props.required}
    >
      <textarea
        rows={4}
        {...props}
        id={id}
        aria-invalid={error ? true : props['aria-invalid']}
        aria-describedby={describedBy(id, hint, error, description)}
        className={classes(
          controlStyles,
          'resize-y',
          error && 'border-danger',
          className,
        )}
      />
    </Field>
  )
}
