import { describe, expect, it } from 'vitest'
import type { components } from '../../shared/api/schema'
import { blockLabels, homeView, statusLabels } from './viewModel'
const home: components['schemas']['Home'] = {
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
  checkInContextToken: null,
}
describe('authoritative home projection', () => {
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
        checkInContextToken: 'context',
        day: { ...home.day, canCheckIn: true },
      }).checkIn,
    ).toBe(true)
  })
  it('retains the server work date for overnight records and requires context', () => {
    expect(homeView(home).workDate).toBe('2026-11-07')
    expect(
      homeView({ ...home, day: { ...home.day, canCheckIn: true } }).checkIn,
    ).toBe(false)
    expect(
      homeView({ ...home, day: { ...home.day, canCheckOut: true } }).checkOut,
    ).toBe(false)
  })
})
