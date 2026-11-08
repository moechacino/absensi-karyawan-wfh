import type { components } from '../shared/api/schema'
import type { IconName } from '../shared/icons/Icon'

type Permission = components['schemas']['Permission']
export interface NavigationItem {
  path: string
  label: string
  icon: IconName
  permission: Permission
}
export const employeeNavigation: NavigationItem[] = [
  { path: '/app', label: 'Beranda', icon: 'home', permission: 'SELF_SERVICE' },
  {
    path: '/app/attendance',
    label: 'Riwayat',
    icon: 'history',
    permission: 'SELF_SERVICE',
  },
  {
    path: '/app/holidays',
    label: 'Kalender',
    icon: 'calendar',
    permission: 'SELF_SERVICE',
  },
  {
    path: '/app/profile',
    label: 'Profil',
    icon: 'user',
    permission: 'SELF_SERVICE',
  },
]
export const hrNavigation: NavigationItem[] = [
  {
    path: '/hr/attendance',
    label: 'Monitoring',
    icon: 'grid',
    permission: 'HR_ATTENDANCE_READ',
  },
  {
    path: '/hr/employees',
    label: 'Karyawan',
    icon: 'users',
    permission: 'HR_EMPLOYEES_MANAGE',
  },
  {
    path: '/hr/divisions',
    label: 'Divisi',
    icon: 'grid',
    permission: 'HR_ORGANIZATION_MANAGE',
  },
  {
    path: '/hr/positions',
    label: 'Posisi',
    icon: 'user',
    permission: 'HR_ORGANIZATION_MANAGE',
  },
  {
    path: '/hr/schedule',
    label: 'Jadwal global',
    icon: 'clock',
    permission: 'HR_SCHEDULE_MANAGE',
  },
  {
    path: '/hr/holidays',
    label: 'Hari libur',
    icon: 'calendar',
    permission: 'HR_HOLIDAYS_MANAGE',
  },
]
export function visibleNavigation(
  items: NavigationItem[],
  permissions: readonly Permission[],
) {
  return items.filter((item) => permissions.includes(item.permission))
}
export function routeIsActive(pathname: string, path: string) {
  return (
    pathname === path || (path !== '/app' && pathname.startsWith(`${path}/`))
  )
}
export function hasAccess(
  permissions: readonly Permission[],
  permission?: Permission,
) {
  return !permission || permissions.includes(permission)
}
