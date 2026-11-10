import type { AttendanceDay, Home } from '../../shared/api/types'
export const statusLabels: Record<
  AttendanceDay['status'],
  string
> = {
  NOT_CHECKED_IN: 'Belum check-in',
  WORKING: 'Sedang bekerja',
  COMPLETED: 'Selesai bekerja',
  MISSED_CHECK_OUT: 'Tidak check-out',
  HOLIDAY: 'Hari libur',
  REST_DAY: 'Hari istirahat',
  UNCONFIGURED: 'Jadwal belum diatur',
}
export const blockLabels: Record<
  NonNullable<AttendanceDay['blockReason']>,
  string
> = {
  SCHEDULE_NOT_CONFIGURED: 'Jadwal kerja belum diatur oleh HR.',
  REST_DAY: 'Hari ini bukan hari kerja sesuai jadwal.',
  COMPANY_HOLIDAY: 'Hari ini merupakan hari libur perusahaan.',
  CHECK_IN_TOO_EARLY: 'Waktu check-in belum dibuka.',
  CHECK_IN_WINDOW_CLOSED: 'Jendela check-in telah ditutup.',
  ALREADY_CHECKED_IN: 'Check-in telah tercatat.',
  ALREADY_CHECKED_OUT: 'Kehadiran hari kerja ini telah selesai.',
  MISSED_CHECK_OUT: 'Batas check-out pada pembukaan shift kerja berikutnya telah lewat. Kehadiran ini tidak dapat ditutup.',
}

/** Refresh server eligibility when a window or an open shift reaches its boundary. */
export function nextAttendanceBoundary(home: Home): number | undefined {
  const boundaries = [
    home.checkInWindow?.opensAt,
    home.checkInWindow?.closesAt,
    home.day.attendance?.state === 'WORKING'
      ? home.day.attendance.checkOutDeadlineAt
      : undefined,
  ]
  return boundaries
    .filter((value): value is string => Boolean(value))
    .map(Date.parse)
    .filter((time) => time > Date.parse(home.serverNow))
    .sort((a, b) => a - b)[0]
}
export function homeView(home: Home) {
  return {
    title: statusLabels[home.day.status],
    reason: home.day.blockReason ? blockLabels[home.day.blockReason] : null,
    checkIn: home.day.canCheckIn,
    checkOut: home.day.canCheckOut && home.day.attendance?.state === 'WORKING',
    workDate: home.day.workDate,
  }
}
