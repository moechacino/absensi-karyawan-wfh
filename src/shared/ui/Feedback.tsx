import type { PropsWithChildren, ReactNode } from 'react'
import { Icon } from '../icons/Icon'
import { Button } from './Button'
import { classes } from './styles'

type Tone = 'neutral' | 'success' | 'warning' | 'danger'
const tones: Record<Tone, string> = {
  neutral: 'bg-canvas text-ink',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
}

export function Badge({
  tone = 'neutral',
  children,
}: PropsWithChildren<{ tone?: Tone }>) {
  return (
    <span
      className={classes(
        'inline-flex max-w-full items-center rounded-control px-3 py-1 text-label font-medium [overflow-wrap:anywhere]',
        tones[tone],
      )}
    >
      {children}
    </span>
  )
}

export function Alert({
  title,
  tone = 'neutral',
  children,
  action,
}: PropsWithChildren<{ title: string; tone?: Tone; action?: ReactNode }>) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={classes('flex min-w-0 gap-3 rounded-card p-4', tones[tone])}
    >
      <Icon name={tone === 'success' ? 'check' : 'info'} className="mt-1" />
      <div className="min-w-0 flex-1 space-y-2 [overflow-wrap:anywhere]">
        <p className="font-medium">{title}</p>
        {children && <div className="text-small">{children}</div>}
        {action}
      </div>
    </div>
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`h-5 animate-pulse rounded-control bg-surface-muted motion-reduce:animate-none ${className}`}
    />
  )
}

export function LoadingState({ label = 'Memuat data…' }: { label?: string }) {
  return (
    <div role="status" className="space-y-3 p-4">
      <p className="flex items-center gap-2 text-text-muted">
        <Icon
          name="refresh"
          className="animate-spin motion-reduce:animate-none"
        />
        {label}
      </p>
      <Skeleton />
      <Skeleton className="w-2/3" />
    </div>
  )
}

export function EmptyState({
  title,
  children,
  action,
}: PropsWithChildren<{ title: string; action?: ReactNode }>) {
  return (
    <div className="space-y-3 rounded-card border border-border bg-surface p-6 [overflow-wrap:anywhere]">
      <h2 className="text-title font-medium">{title}</h2>
      <div className="text-text-muted">{children}</div>
      {action}
    </div>
  )
}

export function ErrorState({
  title = 'Data belum dapat dimuat',
  children,
  onRetry,
  busy,
}: PropsWithChildren<{
  title?: string
  onRetry?: () => void
  busy?: boolean
}>) {
  return (
    <Alert
      title={title}
      tone="danger"
      action={
        onRetry && (
          <Button variant="secondary" busy={busy} onClick={onRetry}>
            Coba lagi
          </Button>
        )
      }
    >
      {children}
    </Alert>
  )
}
