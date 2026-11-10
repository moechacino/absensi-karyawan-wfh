import type { Home } from '../../../shared/api/types'

export const closedHome: Home = {
  serverNow: '2026-11-10T08:17:18.845Z',
  companyDate: '2026-11-10',
  timeZone: 'Asia/Jayapura',
  day: {
    workDate: '2026-11-10',
    status: 'NOT_CHECKED_IN',
    schedule: {
      opensMinutesBeforeStart: 15,
      scheduleVersionId: 'schedule',
      workDate: '2026-11-10',
      timeZone: 'Asia/Jayapura',
      plannedStartAt: '2026-11-09T23:00:00.000Z',
      plannedEndAt: '2026-11-10T08:00:00.000Z',
    },
    attendance: null,
    canCheckIn: false,
    canCheckOut: false,
    blockReason: 'CHECK_IN_WINDOW_CLOSED',
  },
  workSchedule: {
    version: 2,
    current: {
      id: 'schedule',
      opensMinutesBeforeStart: 15,
      workingDays: [1, 2, 3, 4, 5],
      startTime: '08:00',
      endTime: '17:00',
      endDayOffset: 0,
      timeZone: 'Asia/Jayapura',
      effectiveFrom: '2026-11-10',
      effectiveAt: '2026-11-10T07:20:48.383Z',
      state: 'ACTIVE',
      createdAt: '2026-11-10T07:20:48.383Z',
      createdBy: { id: 'hr', fullName: 'HR Contoh' },
    },
    upcoming: null,
    checkInPolicy: { opensMinutesBeforeStart: 15, lateAfterMinutes: 0 },
  },
  checkInWindow: {
    opensAt: '2026-11-09T22:45:00.000Z',
    deadlineAt: '2026-11-09T23:00:00.000Z',
    closesAt: '2026-11-10T08:00:00.000Z',
  },
}

export const overnightAttendance: import('../../../shared/api/types').Attendance = {
  id: 'overnight-attendance',
  employeeId: 'employee',
  workDate: '2026-11-09',
  state: 'WORKING',
  schedule: {
    scheduleVersionId: 'schedule', workDate: '2026-11-09', timeZone: 'Asia/Jakarta',
    plannedStartAt: '2026-11-09T13:00:00Z', plannedEndAt: '2026-11-09T21:00:00Z',
    opensMinutesBeforeStart: 15,
  },
  checkInAt: '2026-11-09T13:00:00Z',
  checkOutAt: null,
  checkOutPunctuality: null,
  earlyCheckOutSeconds: null,
  checkOutDeadlineAt: '2026-11-10T12:45:00Z',
  punctuality: 'ON_TIME', lateSeconds: 0, durationSeconds: null, version: 1,
  photo: { id: 'photo', fileName: 'photo.jpg', mimeType: 'image/jpeg', purpose: 'CHECK_IN_PHOTO', sizeBytes: 1, contentPath: '/api/v1/files/photo' },
}
