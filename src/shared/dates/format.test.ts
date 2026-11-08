import { describe, expect, it } from 'vitest'
import {
  companyDate,
  formatDate,
  formatDuration,
  formatTime,
  isDateOnly,
} from './format'

describe('company calendar formatting', () => {
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
