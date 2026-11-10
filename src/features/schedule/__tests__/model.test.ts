import { describe, expect, it, vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import { invalidateGroup } from '../../../shared/query/invalidation'
import type { ApiClient } from '../../../shared/api/client'
import type { ScheduleInput, SchedulePreview } from '../model'
import {
  activationLabel,
  canApplySchedule,
  initialSchedule,
  offsetLabel,
  validateSchedule,
} from '../model'
import { searchTimeZones, changeWorkSchedule } from '../api'

const input: ScheduleInput = {
  expectedVersion: 2,
  workingDays: [1, 2, 3, 4, 5],
  startTime: '09:00',
  endTime: '17:00',
  endDayOffset: 0,
  timeZone: 'Asia/Jakarta',
  effectiveFrom: '2026-11-16',
  opensMinutesBeforeStart: 15,
}
function preview(): SchedulePreview {
  return {
    schedule: input,
    activationMode: 'ON_SAVE',
    effectiveAt: null,
    comparisonDate: '2026-11-08',
    impact: {
      canApply: true,
      issues: [],
    },
  }
}

describe('schedule configuration', () => {
  it('requires distinct ISO weekdays and positive duration under 24h without calculating DST', () => {
    expect(validateSchedule(input)).toEqual({})
    expect(
      validateSchedule({
        ...input,
        startTime: '22:00',
        endTime: '06:00',
        endDayOffset: 1,
      }),
    ).toEqual({})
    for (const workingDays of [[], [1, 1], [0], [8]])
      expect(
        validateSchedule({ ...input, workingDays }).workingDays,
      ).toBeDefined()
    for (const patch of [
      { startTime: '25:00' },
      { endTime: '08:00' },
      { endTime: '09:00' },
      { endTime: '09:00', endDayOffset: 1 as const },
    ])
      expect(
        Object.keys(validateSchedule({ ...input, ...patch })).length,
      ).toBeGreaterThan(0)
    expect(
      validateSchedule({ ...input, effectiveFrom: '2026-02-30' }).effectiveFrom,
    ).toBeDefined()
    expect(validateSchedule({ ...input, timeZone: '' }).timeZone).toBeDefined()
  })

  it('binds the advisory preview to exact input/version and current validation', () => {
    const result = preview()
    expect(canApplySchedule(input, result)).toBe(true)
    for (const changed of [
      { ...input, expectedVersion: 3 },
      { ...input, timeZone: 'Asia/Makassar' },
      { ...input, workingDays: [1] },
      { ...input, opensMinutesBeforeStart: 60 },
    ])
      expect(canApplySchedule(changed, result)).toBe(false)
    expect(
      canApplySchedule(input, {
        ...result,
        impact: { ...result.impact, canApply: false },
      }),
    ).toBe(false)
  })

  it('describes ON_SAVE without inventing an instant and retains exact future activation', () => {
    expect(activationLabel(preview())).toContain('belum ditentukan')
    expect(
      activationLabel({
        activationMode: 'AT_INSTANT',
        effectiveAt: '2026-11-16T00:00:00+08:00',
      }),
    ).toContain('2026-11-16T00:00:00+08:00')
    expect(offsetLabel(330)).toBe('UTC+05:30')
    expect(offsetLabel(-240)).toBe('UTC-04:00')
  })

  it('supports an unconfigured schedule without inventing a valid default', () => {
    expect(
      initialSchedule({
        version: 0,
        current: null,
        upcoming: null,
        checkInPolicy: { opensMinutesBeforeStart: 15, lateAfterMinutes: 0 },
      }),
    ).toMatchObject({
      expectedVersion: 0,
      workingDays: [],
      timeZone: '',
      effectiveFrom: '',
      opensMinutesBeforeStart: 15,
    })
  })

  it('accepts only integer early allowances from 0 through 1440 minutes', () => {
    for (const opensMinutesBeforeStart of [0, 15, 1440])
      expect(validateSchedule({ ...input, opensMinutesBeforeStart })).toEqual({})
    for (const opensMinutesBeforeStart of [-1, 1441, 0.5, NaN, Infinity])
      expect(validateSchedule({ ...input, opensMinutesBeforeStart }).opensMinutesBeforeStart).toBeDefined()
  })

  it('sends timezone search date and immutable save input/key through Axios service functions', async () => {
    const request = vi.fn().mockResolvedValue({ items: [] })
    const api = { request } as unknown as ApiClient
    const signal = new AbortController().signal
    await searchTimeZones(api, 'America', '2026-11-16', signal)
    expect(request).toHaveBeenLastCalledWith({
      path: '/reference/time-zones',
      params: { q: 'America', atDate: '2026-11-16' },
      signal,
    })
    const body = { ...input }
    await changeWorkSchedule(api, body, 'stable-intent', signal)
    expect(request).toHaveBeenLastCalledWith({
      path: '/hr/work-schedule',
      method: 'PUT',
      data: body,
      idempotencyKey: 'stable-intent',
      signal,
    })
  })
  it('refreshes confirmed configuration read models for the current identity only', async () => {
    const client = new QueryClient()
    for (const actor of ['one', 'two'])
      for (const resource of [
        'schedule',
        'schedule-versions',
        'holidays',
        'home',
        'attendance',
        'monitoring',
        'employees',
      ])
        client.setQueryData(['private', actor, resource], { version: 1 })
    await invalidateGroup(client, 'one', 'configuration')
    for (const resource of [
      'schedule',
      'schedule-versions',
      'holidays',
      'home',
      'attendance',
      'monitoring',
    ])
      expect(
        client.getQueryState(['private', 'one', resource])?.isInvalidated,
      ).toBe(true)
    expect(
      client.getQueryState(['private', 'one', 'employees'])?.isInvalidated,
    ).toBe(false)
    expect(
      client.getQueryState(['private', 'two', 'schedule'])?.isInvalidated,
    ).toBe(false)
    client.clear()
  })
})
