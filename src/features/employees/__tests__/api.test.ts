import { describe, expect, it, vi } from 'vitest'
import type { ApiClient } from '../../../shared/api/client'
import { employeesApi } from '../api'

describe('employee creation request', () => {
  it.each([false, true])('sends multipart with optional photo=%s and preserves intent context', async (withPhoto) => {
    const request = vi.fn().mockResolvedValue({})
    const api = { request } as unknown as ApiClient
    const signal = new AbortController().signal
    const photo = new File(['photo'], 'profile.png', { type: 'image/png' })
    const body = {
      fullName: 'Contoh',
      email: 'contoh@example.test',
      divisionId: 'division',
      positionId: 'position',
      role: 'HRD' as const,
      status: 'ACTIVE' as const,
      confirmHrAccess: 'true' as const,
      ...(withPhoto && { photo }),
    }

    await employeesApi(api).create(body, 'intent-key', signal)

    const sent = request.mock.calls[0][0]
    expect(sent).toMatchObject({
      path: '/hr/employees',
      method: 'POST',
      idempotencyKey: 'intent-key',
      signal,
    })
    expect(sent.data).toBeInstanceOf(FormData)
    expect(Object.fromEntries(sent.data)).toEqual({
      ...body,
      confirmHrAccess: 'true',
    })
  })
})
