export const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest'

export const controlStyles = `min-h-13 w-full min-w-0 rounded-control border border-control-border bg-surface px-4 py-3 text-body text-ink placeholder:text-text-muted disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-text-muted ${focusRing}`

export function classes(...values: (string | false | undefined | null)[]) {
  return values.filter(Boolean).join(' ')
}
