import { describe, expect, it, vi } from 'vitest'
import type { ApiClient } from '../../shared/api/client'
import { checkOut } from './commandApi'
import { overnightAttendance } from '../home/__tests__/fixtures'

describe('explicit shift checkout', () => {
  it('posts only the selected attendance version and preserves returned late checkout metadata', async () => {
    const result = { ...overnightAttendance, state: 'COMPLETED', checkOutAt: '2026-11-09T21:05:00Z', checkOutPunctuality: 'LATE', earlyCheckOutSeconds: 0 }
    const request = vi.fn().mockResolvedValue(result)
    const api = { request } as unknown as ApiClient
    const signal = new AbortController().signal
    expect(await checkOut(api, { id: overnightAttendance.id, expectedVersion: 1 }, { idempotencyKey: 'same-attempt', signal })).toBe(result)
    expect(request).toHaveBeenCalledWith({
      path: '/me/attendances/overnight-attendance/check-out', method: 'POST',
      data: { expectedVersion: 1 }, idempotencyKey: 'same-attempt', signal,
    })
  })
})
