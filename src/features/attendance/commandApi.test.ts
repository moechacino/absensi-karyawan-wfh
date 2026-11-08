import { describe, expect, it, vi } from 'vitest'
import type { ApiClient } from '../../shared/api/client'
import { checkIn, checkOut } from './commandApi'
describe('attendance commands', () => {
  it('sends one combined photo/context request with caller-owned intent key', async () => {
    const request = vi.fn().mockResolvedValue({ id: 'actual' }),
      api = { request } as unknown as ApiClient
    const photo = new File(['bytes'], 'capture.jpg', { type: 'image/jpeg' }),
      signal = new AbortController().signal
    await checkIn(api, { photo }, { idempotencyKey: 'stable-key', signal })
    const sent = request.mock.calls[0][0]
    expect(sent.path).toBe('/me/attendances/check-in')
    expect(sent.data.get('photo')).toBe(photo)
    expect([...sent.data.keys()]).toEqual(['photo'])
    expect(sent.idempotencyKey).toBe('stable-key')
    expect(sent.signal).toBe(signal)
  })
  it('checks out the actual record/version and returns only server confirmation', async () => {
    const record = { id: 'actual', checkOutAt: '2026-11-08T10:00:00Z' },
      request = vi.fn().mockResolvedValue(record),
      api = { request } as unknown as ApiClient,
      signal = new AbortController().signal
    expect(
      await checkOut(
        api,
        { id: 'actual', expectedVersion: 3 },
        { idempotencyKey: 'key', signal },
      ),
    ).toBe(record)
    expect(request).toHaveBeenCalledWith({
      path: '/me/attendances/actual/check-out',
      method: 'POST',
      data: { expectedVersion: 3 },
      idempotencyKey: 'key',
      signal,
    })
  })
})
