export type IconName =
  | 'calendar'
  | 'camera'
  | 'check'
  | 'clock'
  | 'close'
  | 'down'
  | 'download'
  | 'edit'
  | 'eye'
  | 'file'
  | 'filter'
  | 'grid'
  | 'history'
  | 'home'
  | 'image'
  | 'info'
  | 'left'
  | 'lock'
  | 'logout'
  | 'offline'
  | 'plus'
  | 'refresh'
  | 'right'
  | 'search'
  | 'shield'
  | 'upload'
  | 'user'
  | 'users'

// Only reviewed, repository-owned Figma exports enter this registry.
const assets = import.meta.glob<string>('../../assets/icons/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
})

export function Icon({
  name,
  label,
  className = '',
}: {
  name: IconName
  label?: string
  className?: string
}) {
  return (
    <span
      className={`inline-flex size-5 shrink-0 [&>svg]:size-full ${className}`}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      dangerouslySetInnerHTML={{
        __html: assets[`../../assets/icons/${name}.svg`],
      }}
    />
  )
}
