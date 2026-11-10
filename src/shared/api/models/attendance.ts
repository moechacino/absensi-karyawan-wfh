import type { EmployeeSummary } from './accounts'
import type { WorkSchedule } from './calendar'
import type { FileMetadata, Page } from './common'

export interface ScheduleSnapshot {
  scheduleVersionId: string
  workDate: string
  timeZone: string
  plannedStartAt: string
  plannedEndAt: string
  opensMinutesBeforeStart: number
}

export interface Attendance {
  id: string
  employeeId: string
  workDate: string
  state: 'WORKING' | 'COMPLETED' | 'MISSED_CHECK_OUT'
  schedule: ScheduleSnapshot
  checkInAt: string
  checkOutAt: string | null
  checkOutPunctuality: 'EARLY' | 'ON_TIME' | 'LATE' | null
  earlyCheckOutSeconds: number | null
  checkOutDeadlineAt: string | null
  punctuality: 'ON_TIME' | 'LATE'
  lateSeconds: number
  durationSeconds: number | null
  photo: FileMetadata
  version: number
}

export interface AttendanceDay {
  workDate: string
  status: 'NOT_CHECKED_IN' | 'WORKING' | 'COMPLETED' | 'MISSED_CHECK_OUT' | 'HOLIDAY' | 'REST_DAY' | 'UNCONFIGURED'
  schedule: ScheduleSnapshot | null
  attendance: Attendance | null
  canCheckIn: boolean
  canCheckOut: boolean
  blockReason:
    | 'SCHEDULE_NOT_CONFIGURED'
    | 'REST_DAY'
    | 'COMPANY_HOLIDAY'
    | 'CHECK_IN_TOO_EARLY'
    | 'CHECK_IN_WINDOW_CLOSED'
    | 'ALREADY_CHECKED_IN'
    | 'ALREADY_CHECKED_OUT'
    | 'MISSED_CHECK_OUT'
    | null
}

export interface Home {
  serverNow: string
  companyDate: string
  timeZone: string
  day: AttendanceDay
  workSchedule: WorkSchedule
  checkInWindow: { opensAt: string; deadlineAt: string; closesAt: string } | null
}

export interface CheckInInput {
  photo: Blob
}

export interface MonitoringRow {
  employee: EmployeeSummary
  day: AttendanceDay
}

export interface MonitoringPage extends Page<MonitoringRow> {
  summary: {
    notCheckedIn: number
    working: number
    completed: number
    missedCheckOut: number
    late: number
    holiday: number
    restDay: number
    unconfigured: number
  }
}

export type AttendanceDayPage = Page<AttendanceDay>
