import { describe, expect, it } from 'vitest'
import {
  hasAccess,
  hrNavigation,
  routeIsActive,
  visibleNavigation,
} from '../routes'
import { safeReturnPath } from '../../shared/navigation/safeReturn'

describe('route boundaries', () => {
  it.each([
    'https://evil.example',
    '//evil.example',
    '/app\\evil',
    '/app/time-off',
    '/hr/time-off-types',
    '/app#secret',
    '/unknown',
  ])('rejects unsafe or deferred return path %s', (path) => {
    expect(safeReturnPath(path)).toBe('/app')
  })
  it('keeps valid internal filters and attendance deep links', () => {
    expect(safeReturnPath('/app/attendance?from=2026-11-01&page=2')).toBe(
      '/app/attendance?from=2026-11-01&page=2',
    )
    expect(
      safeReturnPath('/app/attendance/f47ac10b-58cc-4372-a567-0e02b2c3d479'),
    ).toContain('f47ac10b')
  })
  it('uses server permissions rather than a persisted role for HR navigation', () => {
    expect(visibleNavigation(hrNavigation, ['SELF_SERVICE'])).toEqual([])
    expect(
      visibleNavigation(hrNavigation, ['HR_ATTENDANCE_READ']).map(
        (item) => item.path,
      ),
    ).toEqual(['/hr/attendance'])
    expect(hasAccess(['SELF_SERVICE'], 'HR_EMPLOYEES_MANAGE')).toBe(false)
  })
  it('highlights only the matching navigation branch', () => {
    expect(routeIsActive('/app/attendance/id', '/app/attendance')).toBe(true)
    expect(routeIsActive('/app/profile', '/app')).toBe(false)
    expect(routeIsActive('/hr/employees-other', '/hr/employees')).toBe(false)
  })
})
