import type { Home } from '../../shared/api/types'
import { describe, expect, it } from 'vitest'
import { blockLabels, homeView, nextAttendanceBoundary, statusLabels } from './viewModel'
import { closedHome, overnightAttendance } from './__tests__/fixtures'
const home: Home = {
  serverNow: '2026-11-08T02:00:00Z',
  companyDate: '2026-11-08',
  timeZone: 'Asia/Jakarta',
  day: {
    workDate: '2026-11-07',
    status: 'NOT_CHECKED_IN',
    schedule: null,
    attendance: null,
    canCheckIn: false,
    canCheckOut: false,
    blockReason: null,
  },
  workSchedule: {
    version: 0,
    current: null,
    upcoming: null,
    checkInPolicy: { opensMinutesBeforeStart: 15, lateAfterMinutes: 0 },
  },
  checkInWindow: null,
}
describe('authoritative home projection', () => {
  it('refreshes at the authoritative early opening and next working shift checkout deadline', () => {
    expect(nextAttendanceBoundary({ ...closedHome, serverNow: '2026-11-09T22:40:00Z' })).toBe(Date.parse('2026-11-09T22:45:00Z'))
    expect(nextAttendanceBoundary(closedHome)).toBeUndefined()
    const attendance = overnightAttendance
    const overnight = {
      ...closedHome,
      serverNow: '2026-11-09T19:00:00Z',
      checkInWindow: null,
      day: { ...closedHome.day, workDate: '2026-11-09', status: 'WORKING' as const, attendance, canCheckOut: true },
    }
    expect(homeView(overnight).checkOut).toBe(true)
    expect(nextAttendanceBoundary(overnight)).toBe(Date.parse(attendance.checkOutDeadlineAt!))
    // 04:05 local is after the overnight planned end; checkout remains available.
    const afterEnd = { ...overnight, serverNow: '2026-11-09T21:05:00Z' }
    expect(homeView(afterEnd).checkOut).toBe(true)
    expect(homeView(afterEnd).workDate).toBe('2026-11-09')
    expect(nextAttendanceBoundary(afterEnd)).toBe(Date.parse(attendance.checkOutDeadlineAt!))
    // The server may skip rest days/holidays; never substitute a locally calculated date.
    const afterHoliday = { ...afterEnd, day: { ...afterEnd.day, attendance: { ...attendance, checkOutDeadlineAt: '2026-11-12T12:45:00Z' } } }
    expect(nextAttendanceBoundary(afterHoliday)).toBe(Date.parse('2026-11-12T12:45:00Z'))
    const missed = { ...overnight, day: { ...overnight.day, status: 'MISSED_CHECK_OUT' as const, attendance: { ...attendance, state: 'MISSED_CHECK_OUT' as const }, canCheckIn: true } }
    expect(homeView(missed).checkOut).toBe(false)
    expect(homeView(missed).checkIn).toBe(true)
    expect(nextAttendanceBoundary(missed)).toBeUndefined()
  })
  it('maps every active server status and block reason without calculating eligibility', () => {
    for (const status of Object.keys(
      statusLabels,
    ) as (keyof typeof statusLabels)[])
      expect(homeView({ ...home, day: { ...home.day, status } }).title).toBe(
        statusLabels[status],
      )
    for (const blockReason of Object.keys(
      blockLabels,
    ) as (keyof typeof blockLabels)[])
      expect(
        homeView({ ...home, day: { ...home.day, blockReason } }).reason,
      ).toBe(blockLabels[blockReason])
    expect(homeView(home).checkIn).toBe(false)
    expect(
      homeView({
        ...home,
        day: { ...home.day, canCheckIn: true },
      }).checkIn,
    ).toBe(true)
  })
  it('retains the server work date and follows current server eligibility', () => {
    expect(homeView(home).workDate).toBe('2026-11-07')
    expect(
      homeView({ ...home, day: { ...home.day, canCheckIn: true } }).checkIn,
    ).toBe(true)
    expect(
      homeView({ ...home, day: { ...home.day, canCheckOut: true } }).checkOut,
    ).toBe(false)
  })
})
