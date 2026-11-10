import type { ScheduleChange, SchedulePreview, WorkSchedule } from '../../shared/api/types'
import { intentFingerprint } from '../../shared/commands/snapshot'
import { isDateOnly } from '../../shared/dates/format'

export type { SchedulePreview } from '../../shared/api/types'

export type ScheduleInput = ScheduleChange
export const weekdays = [
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
  'Minggu',
]
const timePattern = /^([01][0-9]|2[0-3]):[0-5][0-9]$/
const minutes = (time: string) =>
  Number(time.slice(0, 2)) * 60 + Number(time.slice(3))

export function validateSchedule(input: ScheduleInput): Record<string, string> {
  const errors: Record<string, string> = {}
  if (
    !Number.isInteger(input.opensMinutesBeforeStart) ||
    input.opensMinutesBeforeStart < 0 || input.opensMinutesBeforeStart > 1440
  )
    errors.opensMinutesBeforeStart = 'Isi bilangan bulat antara 0 dan 1440 menit.'
  if (
    !input.workingDays.length ||
    new Set(input.workingDays).size !== input.workingDays.length ||
    input.workingDays.some(
      (day) => !Number.isInteger(day) || day < 1 || day > 7,
    )
  )
    errors.workingDays = 'Pilih minimal satu hari kerja yang berbeda.'
  if (!timePattern.test(input.startTime))
    errors.startTime = 'Gunakan jam HH:mm.'
  if (!timePattern.test(input.endTime)) errors.endTime = 'Gunakan jam HH:mm.'
  if (![0, 1].includes(input.endDayOffset))
    errors.endDayOffset = 'Pilih hari selesai.'
  if (!errors.startTime && !errors.endTime && !errors.endDayOffset) {
    const duration =
      minutes(input.endTime) +
      input.endDayOffset * 1440 -
      minutes(input.startTime)
    if (duration <= 0 || duration >= 1440)
      errors.endTime = 'Durasi harus lebih dari 0 dan kurang dari 24 jam.'
  }
  if (!input.timeZone.trim()) errors.timeZone = 'Pilih zona waktu IANA.'
  if (!isDateOnly(input.effectiveFrom))
    errors.effectiveFrom = 'Pilih tanggal berlaku yang valid.'
  return errors
}

export function initialSchedule(
  model: WorkSchedule,
): ScheduleInput {
  const source = model.upcoming ?? model.current
  return {
    expectedVersion: model.version,
    workingDays: [...(source?.workingDays ?? [])].sort((a, b) => a - b),
    startTime: source?.startTime ?? '',
    endTime: source?.endTime ?? '',
    endDayOffset: source?.endDayOffset ?? 0,
    timeZone: source?.timeZone ?? '',
    effectiveFrom: '',
    opensMinutesBeforeStart: source?.opensMinutesBeforeStart ?? 15,
  }
}

export function canApplySchedule(
  input: ScheduleInput,
  preview: SchedulePreview | undefined,
): boolean {
  return Boolean(
    preview &&
      preview.impact.canApply &&
      intentFingerprint(input) === intentFingerprint(preview.schedule),
  )
}

export function activationLabel(
  preview: Pick<SchedulePreview, 'activationMode' | 'effectiveAt'>,
): string {
  return preview.activationMode === 'ON_SAVE'
    ? 'Berlaku saat penyimpanan dikonfirmasi server; waktu pastinya belum ditentukan.'
    : preview.effectiveAt
      ? `Aktivasi tepat: ${preview.effectiveAt}`
      : 'Waktu aktivasi belum tersedia.'
}

export function offsetLabel(minutes: number): string {
  const magnitude = Math.abs(minutes)
  return `UTC${minutes >= 0 ? '+' : '-'}${String(Math.floor(magnitude / 60)).padStart(2, '0')}:${String(magnitude % 60).padStart(2, '0')}`
}
