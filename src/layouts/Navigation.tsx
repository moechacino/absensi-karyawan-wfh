import { NavLink } from 'react-router'
import type { NavigationItem } from '../app/routes'
import { Icon } from '../shared/icons/Icon'
import { focusRing } from '../shared/ui/styles'

export function Navigation({
  items,
  compact,
  onNavigate,
}: {
  items: NavigationItem[]
  compact?: boolean
  onNavigate?: () => void
}) {
  return items.map((item) => (
    <NavLink
      key={item.path}
      to={item.path}
      end={item.path === '/app'}
      onClick={onNavigate}
      className={({ isActive }) =>
        `flex min-h-touch min-w-0 items-center gap-3 rounded-control px-3 py-3 ${compact ? 'flex-1 flex-col gap-1 px-1 text-label' : ''} ${isActive ? 'bg-success-soft font-medium text-action' : 'text-text-muted hover:bg-canvas'} ${focusRing}`
      }
    >
      <Icon name={item.icon} />
      <span className="min-w-0 [overflow-wrap:anywhere]">{item.label}</span>
    </NavLink>
  ))
}
