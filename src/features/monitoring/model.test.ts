import { describe, expect, it, vi } from 'vitest'
import type { ApiClient } from '../../shared/api/client'
import type { components } from '../../shared/api/schema'
import {
  monitoringFilters,
  monitoringQuerySettings,
  monitoringRowView,
  summaryCards,
} from './model'
import { getAttendanceForHR, monitorAttendance } from './api'

const employee = {
  id: 'e1',
  fullName: 'Karyawan Contoh',
  division: { id: 'd1', code: 'DIV-1', name: 'Product' },
  position: { id: 'p1', code: 'POS-1', name: 'Designer' },
  photo: null,
}
const projectedDay: components['schemas']['AttendanceDay'] = {
  workDate: '2026-11-08',
  status: 'HOLIDAY',
  schedule: null,
  attendance: null,
  canCheckIn: false,
  canCheckOut: false,
  blockReason: 'COMPANY_HOLIDAY',
}

describe('read-only monitoring', () => {
  it('uses company context rather than device UTC date and validates the active contract filters', () => {
    expect(
      monitoringFilters(new URLSearchParams(), '2027-01-01'),
    ).toMatchObject({
      valid: true,
      params: { date: '2027-01-01', page: 1, pageSize: 20 },
    })
    expect(
      monitoringFilters(new URLSearchParams('date=2026-11-08&status=TIME_OFF'))
        .valid,
    ).toBe(false)
    expect(
      monitoringFilters(
        new URLSearchParams(
          'date=2026-11-08&status=WORKING&punctuality=LATE&divisionId=bad',
        ),
      ).valid,
    ).toBe(false)
    expect(
      monitoringFilters(
        new URLSearchParams(
          'date=2026-11-08&status=WORKING&punctuality=LATE&divisionId=550e8400-e29b-41d4-a716-446655440000',
        ),
      ).valid,
    ).toBe(true)
    expect(
      monitoringFilters(new URLSearchParams('date=2026-02-30')).valid,
    ).toBe(false)
    expect(
      monitoringFilters(
        new URLSearchParams(`date=2026-11-08&q=${'x'.repeat(161)}`),
      ).valid,
    ).toBe(false)
  })

  it('maps nullable actual records without inventing an attendance ID or detail route', () => {
    const view = monitoringRowView({ employee, day: projectedDay })
    expect(view).toMatchObject({
      employeeName: 'Karyawan Contoh',
      status: 'Hari libur',
      attendanceId: undefined,
      checkInAt: null,
      checkOutAt: null,
    })
  })

  it('does not add the overlapping late counter into the exclusive status total', () => {
    const cards = summaryCards({
      notCheckedIn: 2,
      working: 3,
      completed: 4,
      late: 5,
      holiday: 1,
      restDay: 1,
      unconfigured: 1,
    })
    expect(cards.find((item) => item.label === 'Total hasil')?.value).toBe(12)
    expect(cards.find((item) => item.label === 'Terlambat')?.value).toBe(5)
  })

  it('enables company focus/reconnect refresh and scopes each query to active filters and identity', () => {
    const filters = monitoringFilters(
      new URLSearchParams('date=2026-11-08&status=WORKING'),
    )
    expect(monitoringQuerySettings('hr-1', filters)).toEqual({
      queryKey: ['private', 'hr-1', 'monitoring', filters.params],
      enabled: true,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    })
    expect(monitoringQuerySettings(undefined, filters).enabled).toBe(false)
  })

  it('only reads HR authorized record paths and forwards exact filters and AbortSignal', async () => {
    const request = vi.fn().mockResolvedValue({})
    const api = { request } as unknown as ApiClient
    const signal = new AbortController().signal
    await monitorAttendance(
      api,
      { date: '2026-11-08', page: 2, status: 'WORKING' },
      signal,
    )
    await getAttendanceForHR(api, 'actual-id', signal)
    expect(request.mock.calls[0][0]).toEqual({
      path: '/hr/attendance-days',
      params: { date: '2026-11-08', page: 2, status: 'WORKING' },
      signal,
    })
    expect(request.mock.calls[1][0]).toEqual({
      path: '/hr/attendances/actual-id',
      signal,
    })
    expect(request.mock.calls.every(([request]) => !request.method)).toBe(true)
  })
})
