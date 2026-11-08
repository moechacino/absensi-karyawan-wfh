import { describe, expect, it } from 'vitest'
import type { components } from '../../../shared/api/schema'
import {
  batchIsDirty,
  calendarMonth,
  emptyBatch,
  holidayChanges,
  holidayDateError,
  holidayMonthLabel,
  removeHoliday,
  restoreHoliday,
  upsertHoliday,
  validateHolidayBatch,
} from '../batchState'

const base: components['schemas']['HolidayCalendar'] = {
  year: 2026,
  version: 4,
  items: [
    { date: '2026-11-12', name: 'Hari Perusahaan', category: 'COMPANY' },
    { date: '2026-12-25', name: 'Hari Natal', category: 'PUBLIC' },
  ],
}
const today = '2026-11-08'

describe('explicit yearly holiday batch', () => {
  it('starts empty and sends only changed dates, never replacing untouched dates', () => {
    const start = emptyBatch(base)
    expect(holidayChanges(start, base)).toEqual({
      year: 2026,
      expectedVersion: 4,
      upsert: [],
      remove: [],
    })
    const updated = upsertHoliday(
      start,
      { date: '2026-11-12', name: 'Hari Perusahaan', category: 'OTHER' },
      today,
    )
    const added = upsertHoliday(
      updated,
      { date: '2026-11-20', name: 'Hari khusus', category: 'COMPANY' },
      today,
    )
    expect(holidayChanges(added, base)).toEqual({
      year: 2026,
      expectedVersion: 4,
      upsert: [
        { date: '2026-11-12', name: 'Hari Perusahaan', category: 'OTHER' },
        { date: '2026-11-20', name: 'Hari khusus', category: 'COMPANY' },
      ],
      remove: [],
    })
    expect(holidayChanges(added, base).upsert).not.toContainEqual(base.items[1])
  })

  it('removes an existing date explicitly and removes a new draft without sending either operation', () => {
    let batch = removeHoliday(emptyBatch(base), '2026-11-12', base, today)
    expect(holidayChanges(batch, base).remove).toEqual(['2026-11-12'])
    batch = restoreHoliday(batch, '2026-11-12')
    expect(holidayChanges(batch, base).remove).toEqual([])
    batch = upsertHoliday(
      batch,
      { date: '2026-11-20', name: 'Baru', category: 'OTHER' },
      today,
    )
    batch = removeHoliday(batch, '2026-11-20', base, today)
    expect(holidayChanges(batch, base)).toEqual({
      year: 2026,
      expectedVersion: 4,
      upsert: [],
      remove: [],
    })
  })

  it('prevents past dates, cross-year entries, malformed dates, blanks and stale base versions', () => {
    expect(holidayDateError('2026-11-07', 2026, today)).toContain('berlalu')
    expect(holidayDateError('2027-01-01', 2026, today)).toContain('tahun 2026')
    expect(holidayDateError('2026-02-30', 2026, today)).toContain('valid')
    const dirty = upsertHoliday(
      emptyBatch(base),
      { date: '2026-11-08', name: '  ', category: 'COMPANY' },
      today,
    )
    expect(
      validateHolidayBatch(dirty, base, today)['2026-11-08:name'],
    ).toContain('wajib')
    expect(
      validateHolidayBatch({ ...dirty, expectedVersion: 3 }, base, today)
        .version,
    ).toContain('berubah')
  })

  it('prevents duplicates and a date appearing in upsert and remove', () => {
    const malformed = {
      year: 2026,
      expectedVersion: 4,
      upsert: [
        { date: '2026-11-12', name: 'Changed', category: 'COMPANY' as const },
        { date: '2026-11-12', name: 'Duplicate', category: 'OTHER' as const },
      ],
      remove: ['2026-11-12', '2026-11-12'],
    }
    const errors = validateHolidayBatch(malformed, base, today)
    expect(errors['2026-11-12']).toContain('duplikat')
    expect(holidayChanges(malformed, base).remove).toEqual(['2026-11-12'])
  })

  it('keeps dirty input across a refreshed calendar version for renewed review', () => {
    const draft = upsertHoliday(
      emptyBatch(base),
      { date: '2026-11-20', name: 'Rapat', category: 'COMPANY' },
      today,
    )
    const latest = {
      ...base,
      version: 5,
      items: [
        ...base.items,
        { date: '2026-11-14', name: 'Another', category: 'OTHER' as const },
      ],
    }
    const refreshed = { ...draft, expectedVersion: latest.version }
    expect(batchIsDirty(refreshed, latest)).toBe(true)
    expect(holidayChanges(refreshed, latest).expectedVersion).toBe(5)
    expect(holidayChanges(refreshed, latest).upsert).toHaveLength(1)
    expect(holidayChanges(refreshed, latest).upsert[0].name).toBe('Rapat')
  })

  it('builds date-only month layouts and handles leap/year boundaries', () => {
    expect(calendarMonth(2024, 1).days).toHaveLength(29)
    expect(calendarMonth(2026, 0).leading).toBe(3)
    expect(holidayMonthLabel(2026, 0)).toBe('Januari')
    expect(calendarMonth(2026, 11).days.at(-1)).toBe(31)
  })
})
