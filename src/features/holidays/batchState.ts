import type { Holiday, HolidayCalendar } from '../../shared/api/types'
import { isDateOnly } from '../../shared/dates/format'

export type { Holiday, HolidayCalendar } from '../../shared/api/types'

export type HolidayBatch = {
  year: number
  expectedVersion: number
  upsert: Holiday[]
  remove: string[]
}
export type HolidayChanges = Pick<
  HolidayBatch,
  'year' | 'expectedVersion' | 'upsert' | 'remove'
>

export function emptyBatch(calendar: HolidayCalendar): HolidayBatch {
  return {
    year: calendar.year,
    expectedVersion: calendar.version,
    upsert: [],
    remove: [],
  }
}

function validDate(date: string, year: number, companyDate: string): boolean {
  return (
    isDateOnly(date) && Number(date.slice(0, 4)) === year && date >= companyDate
  )
}

export function holidayDateError(
  date: string,
  year: number,
  companyDate: string,
): string | undefined {
  if (!isDateOnly(date)) return 'Pilih tanggal yang valid.'
  if (Number(date.slice(0, 4)) !== year)
    return `Tanggal harus berada pada tahun ${year}.`
  if (date < companyDate)
    return 'Tanggal yang sudah berlalu hanya dapat dilihat.'
  return undefined
}

export function upsertHoliday(
  batch: HolidayBatch,
  value: Holiday,
  companyDate: string,
): HolidayBatch {
  if (!validDate(value.date, batch.year, companyDate)) return batch
  return {
    ...batch,
    upsert: [
      ...batch.upsert.filter((item) => item.date !== value.date),
      { ...value },
    ],
    remove: batch.remove.filter((date) => date !== value.date),
  }
}

export function removeHoliday(
  batch: HolidayBatch,
  date: string,
  calendar: HolidayCalendar,
  companyDate: string,
): HolidayBatch {
  if (holidayDateError(date, batch.year, companyDate)) return batch
  const existed = calendar.items.some((item) => item.date === date)
  return {
    ...batch,
    upsert: batch.upsert.filter((item) => item.date !== date),
    remove: existed
      ? [...new Set([...batch.remove, date])]
      : batch.remove.filter((item) => item !== date),
  }
}

export function restoreHoliday(
  batch: HolidayBatch,
  date: string,
): HolidayBatch {
  return {
    ...batch,
    remove: batch.remove.filter((item) => item !== date),
    upsert: batch.upsert.filter((item) => item.date !== date),
  }
}

export function holidayChanges(
  batch: HolidayBatch,
  calendar: HolidayCalendar,
): HolidayChanges {
  const original = new Map(calendar.items.map((item) => [item.date, item]))
  const upsert = batch.upsert
    .filter(
      (item) =>
        JSON.stringify(item) !== JSON.stringify(original.get(item.date)),
    )
    .sort((a, b) => a.date.localeCompare(b.date))
  const remove = [...new Set(batch.remove)]
    .filter((date) => original.has(date))
    .sort()
  return {
    year: batch.year,
    expectedVersion: batch.expectedVersion,
    upsert,
    remove,
  }
}

export function validateHolidayBatch(
  batch: HolidayBatch,
  calendar: HolidayCalendar,
  companyDate: string,
): Record<string, string> {
  const errors: Record<string, string> = {}
  if (batch.year !== calendar.year)
    errors.year = 'Tahun batch dan kalender berbeda.'
  if (batch.expectedVersion !== calendar.version)
    errors.version = 'Kalender berubah. Muat ulang dan tinjau perubahan.'
  if (!batch.upsert.length && !batch.remove.length)
    errors.batch = 'Tandai setidaknya satu perubahan tanggal.'
  const seen = new Set<string>()
  for (const item of batch.upsert) {
    const message = holidayDateError(item.date, batch.year, companyDate)
    if (message) errors[item.date] = message
    if (seen.has(item.date)) errors[item.date] = 'Tanggal tidak boleh duplikat.'
    seen.add(item.date)
    if (!item.name.trim())
      errors[`${item.date}:name`] = 'Nama hari libur wajib diisi.'
    if (!['COMPANY', 'PUBLIC', 'OTHER'].includes(item.category))
      errors[`${item.date}:category`] = 'Pilih kategori yang valid.'
  }
  const removals = new Set<string>()
  for (const date of batch.remove) {
    if (holidayDateError(date, batch.year, companyDate))
      errors[date] = holidayDateError(date, batch.year, companyDate)!
    if (removals.has(date) || seen.has(date))
      errors[date] = 'Tanggal duplikat atau tercantum pada kedua daftar.'
    removals.add(date)
  }
  return errors
}

export function batchIsDirty(
  batch: HolidayBatch,
  calendar: HolidayCalendar,
): boolean {
  return (
    batch.upsert.length > 0 ||
    batch.remove.length > 0 ||
    holidayChanges(batch, calendar).upsert.length > 0 ||
    holidayChanges(batch, calendar).remove.length > 0
  )
}

export function calendarMonth(year: number, month: number) {
  const first = new Date(Date.UTC(year, month, 1, 12))
  const count = new Date(Date.UTC(year, month + 1, 0, 12)).getUTCDate()
  const leading = (first.getUTCDay() + 6) % 7
  return {
    leading,
    days: Array.from({ length: count }, (_, index) => index + 1),
  }
}

export function holidayMonthLabel(year: number, month: number) {
  return new Intl.DateTimeFormat('id-ID', {
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month, 15, 12)))
}
