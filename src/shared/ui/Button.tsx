import type { ButtonHTMLAttributes } from 'react'
import { Icon } from '../icons/Icon'
import type { IconName } from '../icons/Icon'
import { classes, focusRing } from './styles'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
const variants: Record<Variant, string> = {
  primary:
    'bg-action text-on-action enabled:hover:bg-action-hover enabled:active:bg-forest',
  secondary:
    'border border-control-border bg-surface text-ink enabled:hover:bg-canvas',
  danger: 'bg-danger text-on-action enabled:hover:brightness-90',
  ghost: 'text-ink enabled:hover:bg-surface-muted',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  busy?: boolean
  busyLabel?: string
}

export function Button({
  variant = 'primary',
  busy = false,
  busyLabel,
  disabled,
  type = 'button',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={classes(
        'inline-flex min-h-13 min-w-touch items-center justify-center gap-2 rounded-control px-4 py-3 text-center font-medium [overflow-wrap:anywhere] transition-colors duration-hover active:duration-press motion-reduce:transition-none disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-text-muted',
        focusRing,
        variants[variant],
        className,
      )}
    >
      {busy && (
        <Icon
          name="refresh"
          className="animate-spin motion-reduce:animate-none"
        />
      )}
      {busy && busyLabel ? busyLabel : children}
    </button>
  )
}

export function IconButton({
  icon,
  label,
  ...props
}: Omit<ButtonProps, 'children' | 'aria-label'> & {
  icon: IconName
  label: string
}) {
  return (
    <Button variant="ghost" {...props} aria-label={label}>
      <Icon name={icon} />
    </Button>
  )
}
