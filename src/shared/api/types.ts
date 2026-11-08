import type { components } from './schema'

type Schemas = components['schemas']

/** JSON bodies accepted by the named OpenAPI operations. */
interface JsonRequestBodies {
  login: Schemas['LoginInput']
  changeOwnPassword: Schemas['PasswordInput']
  createEmployee: Schemas['EmployeeCreate']
  changeEmployeeRole: Schemas['RoleChange']
  createDivision: Schemas['DivisionCreate']
  updateDivision: Schemas['DivisionPatch']
  createPosition: Schemas['PositionCreate']
  updatePosition: Schemas['PositionPatch']
  previewWorkSchedule: Schemas['ScheduleChange']
  changeWorkSchedule: Schemas['ScheduleWrite']
  previewHolidayChange: Schemas['HolidayChange']
  changeHolidayCalendar: Schemas['HolidayWrite']
  checkOut: Schemas['VersionInput']
}

/** Multipart bodies accepted by the two active image upload operations. */
interface MultipartRequestBodies {
  checkIn: { photo: Blob }
  updateEmployee: Schemas['EmployeePatch']
}

/** Successful JSON response for each operation. A 204 response is undefined. */
interface JsonResponses {
  login: Schemas['LoginResult']
  logout: undefined
  changeOwnPassword: undefined
  getOwnProfile: Schemas['MeProfile']
  listEmployees: Schemas['EmployeePage']
  createEmployee: Schemas['EmployeeCreated']
  getEmployee: Schemas['Employee']
  updateEmployee: Schemas['Employee']
  changeEmployeeRole: Schemas['Employee']
  listDivisions: Schemas['DivisionPage']
  createDivision: Schemas['Division']
  updateDivision: Schemas['Division']
  listPositions: Schemas['PositionPage']
  createPosition: Schemas['Position']
  updatePosition: Schemas['Position']
  getWorkSchedule: Schemas['WorkSchedule']
  searchTimeZones: Schemas['TimeZoneChoices']
  previewWorkSchedule: Schemas['SchedulePreview']
  changeWorkSchedule: Schemas['ScheduleChanged']
  listWorkScheduleVersions: Schemas['ScheduleHistoryPage']
  getHolidayCalendar: Schemas['HolidayCalendar']
  previewHolidayChange: Schemas['ChangeImpact']
  changeHolidayCalendar: Schemas['HolidayChanged']
  getEmployeeHome: Schemas['Home']
  listOwnAttendanceDays: Schemas['AttendanceDayPage']
  checkIn: Schemas['Attendance']
  getOwnAttendance: Schemas['Attendance']
  checkOut: Schemas['Attendance']
  monitorAttendance: Schemas['MonitoringPage']
  getAttendanceForHR: Schemas['Attendance']
  getEmployeeInitialCredentials: Schemas['InitialCredentialsRead']
}

export type JsonBody<Operation extends keyof JsonRequestBodies> =
  JsonRequestBodies[Operation]
export type MultipartBody<Operation extends keyof MultipartRequestBodies> =
  MultipartRequestBodies[Operation]
export type JsonResult<Operation extends keyof JsonResponses> =
  JsonResponses[Operation]
