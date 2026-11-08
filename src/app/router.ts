import { createElement } from 'react'
import type { ComponentType } from 'react'
import { Navigate, createBrowserRouter } from 'react-router'
import { AppLayout } from '../layouts/AppLayout'
import { ProtectedRoute, NotFoundPage, RouteErrorPage } from './RouteBoundary'
import { useSession } from '../shared/auth'
import { hrNavigation, visibleNavigation } from './routes'

const pages = import.meta.glob<{ default: ComponentType }>(
  '../features/**/*Page.tsx',
)
function page(path: string) {
  return async () => {
    const loader = pages[`../features/${path}.tsx`]
    if (!loader) throw new Error('Page module unavailable')
    return { Component: (await loader()).default }
  }
}
function HrIndex() {
  const { profile } = useSession()
  const first = visibleNavigation(hrNavigation, profile?.permissions ?? [])[0]
  return first
    ? createElement(Navigate, { to: first.path, replace: true })
    : createElement(NotFoundPage)
}
const hr = (
  permission: Parameters<typeof ProtectedRoute>[0]['permission'],
  children: { path: string; lazy: ReturnType<typeof page> }[],
) => ({ element: createElement(ProtectedRoute, { permission }), children })
export const router = createBrowserRouter([
  {
    path: '/',
    element: createElement(Navigate, { to: '/app', replace: true }),
  },
  {
    path: '/login',
    lazy: page('auth/LoginPage'),
    errorElement: createElement(RouteErrorPage),
  },
  {
    element: createElement(ProtectedRoute, { permission: 'SELF_SERVICE' }),
    errorElement: createElement(RouteErrorPage),
    children: [
      {
        path: '/app',
        element: createElement(AppLayout),
        children: [
          { index: true, lazy: page('home/EmployeeHomePage') },
          {
            path: 'attendance',
            lazy: page('attendance/AttendanceHistoryPage'),
          },
          {
            path: 'attendance/:attendanceId',
            lazy: page('attendance/AttendanceDetailPage'),
          },
          { path: 'check-in', lazy: page('attendance/CameraCheckInPage') },
          { path: 'schedule', lazy: page('company/CompanySchedulePage') },
          { path: 'holidays', lazy: page('company/HolidayCalendarPage') },
          { path: 'profile', lazy: page('profile/ProfilePage') },
          { path: 'password', lazy: page('profile/PasswordPage') },
        ],
      },
      {
        path: '/hr',
        element: createElement(AppLayout, { hr: true }),
        children: [
          { index: true, element: createElement(HrIndex) },
          hr('HR_ATTENDANCE_READ', [
            { path: 'attendance', lazy: page('monitoring/MonitoringPage') },
            {
              path: 'attendance/:attendanceId',
              lazy: page('monitoring/HrAttendanceDetailPage'),
            },
          ]),
          hr('HR_EMPLOYEES_MANAGE', [
            { path: 'employees', lazy: page('employees/EmployeesPage') },
            {
              path: 'employees/new',
              lazy: page('employees/CreateEmployeePage'),
            },
            {
              path: 'employees/:employeeId',
              lazy: page('employees/EmployeeDetailPage'),
            },
            {
              path: 'employees/:employeeId/edit',
              lazy: page('employees/EditEmployeePage'),
            },
          ]),
          hr('HR_ORGANIZATION_MANAGE', [
            { path: 'divisions', lazy: page('organization/DivisionsPage') },
            { path: 'positions', lazy: page('organization/PositionsPage') },
          ]),
          hr('HR_SCHEDULE_MANAGE', [
            { path: 'schedule', lazy: page('schedule/HrSchedulePage') },
          ]),
          hr('HR_HOLIDAYS_MANAGE', [
            { path: 'holidays', lazy: page('holidays/HrHolidayCalendarPage') },
          ]),
        ],
      },
    ],
  },
  { path: '*', element: createElement(NotFoundPage) },
])
