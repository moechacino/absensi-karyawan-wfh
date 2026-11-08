import type { components } from '../../shared/api/schema'
export const statusLabels: Record<
  components['schemas']['AttendanceDay']['status'],
  string
> = {
  NOT_CHECKED_IN: 'Belum check-in',
  WORKING: 'Sedang bekerja',
  COMPLETED: 'Selesai bekerja',
  HOLIDAY: 'Hari libur',
  REST_DAY: 'Hari istirahat',
  UNCONFIGURED: 'Jadwal belum diatur',
}
export const blockLabels: Record<
  NonNullable<components['schemas']['AttendanceDay']['blockReason']>,
  string
> = {
  SCHEDULE_NOT_CONFIGURED: 'Jadwal kerja belum diatur oleh HR.',
  REST_DAY: 'Hari ini bukan hari kerja sesuai jadwal.',
  COMPANY_HOLIDAY: 'Hari ini merupakan hari libur perusahaan.',
  CHECK_IN_TOO_EARLY: 'Waktu check-in belum dibuka.',
  CHECK_IN_WINDOW_CLOSED: 'Jendela check-in telah ditutup.',
  ALREADY_CHECKED_IN: 'Check-in telah tercatat.',
  ALREADY_CHECKED_OUT: 'Kehadiran hari kerja ini telah selesai.',
}
export function homeView(home: components['schemas']['Home']) {
  return {
    title: statusLabels[home.day.status],
    reason: home.day.blockReason ? blockLabels[home.day.blockReason] : null,
    checkIn: home.day.canCheckIn,
    checkOut: home.day.canCheckOut && home.day.attendance?.state === 'WORKING',
    workDate: home.day.workDate,
  }
}
