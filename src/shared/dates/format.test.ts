import { describe, expect, it, vi } from 'vitest'
import {
  companyDate,
  formatDate,
  formatDuration,
  formatTime,
  formatTimestamp,
  formatLocalDate,
  isDateOnly,
} from './format'

describe('company calendar formatting', () => {
  it('uses the device timezone for instants, including a different local date', () => {
    const resolved = new Intl.DateTimeFormat().resolvedOptions()
    vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({ ...resolved, timeZone: 'America/Los_Angeles' })
    expect(formatLocalDate('2027-01-01T01:00:00Z')).toContain('31 Desember 2026')
    expect(formatTimestamp('2027-01-01T01:00:00Z')).toBe(formatTimestamp('2027-01-01T01:00:00Z', 'America/Los_Angeles'))
    expect(formatTime('2027-01-01T01:00:00Z')).toBe('17.00')
    expect(formatTime('2026-07-01T01:00:00Z')).toBe('18.00')
    expect(formatDate('2027-01-01')).toBe('1 Januari 2027')
  })
  it('preserves date-only values across timezone/year boundaries', () => {
    expect(formatDate('2027-01-01')).toContain('1 Januari 2027')
    expect(companyDate('2026-12-31T18:00:00Z', 'Asia/Jakarta')).toBe(
      '2027-01-01',
    )
    expect(companyDate('2026-12-31T18:00:00Z', 'America/New_York')).toBe(
      '2026-12-31',
    )
  })
  it('rejects impossible dates and formats stored timezone timestamps', () => {
    expect(isDateOnly('2026-02-30')).toBe(false)
    expect(isDateOnly('2024-02-29')).toBe(true)
    expect(formatTime('2026-11-07T02:00:00Z', 'Asia/Jakarta')).toContain('09')
    expect(formatTime(null, 'Asia/Jakarta')).toBe('—')
    expect(formatTime('invalid', 'Asia/Jakarta')).toBe('—')
  })
  it('keeps positive subminute lateness visible', () => {
    expect(formatDuration(1)).toBe('1 detik')
    expect(formatDuration(3661)).toBe('1 jam 1 menit')
    expect(formatDuration(null)).toBe('Sedang berlangsung')
  })
})
