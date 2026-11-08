import { describe, expect, it, vi } from 'vitest'
import {
  createdEmployeeId,
  creationPayload,
  employeeDraft,
  employeeFilters,
  validateEmployee,
} from '../model'
import {
  accessMessage,
  copyAccess,
  credentialPair,
  shareAccess,
} from '../shareMessage'

const draft = {
  ...employeeDraft(),
  fullName: 'Contoh',
  email: 'contoh@example.test',
  divisionId: 'division',
  positionId: 'position',
}
const credentials = {
  email: draft.email,
  initialPassword: 'fictional-initial-password',
}

describe('employee payload and recovery', () => {
  it('validates required fields and sends only the creation schema fields with explicit HR confirmation', () => {
    expect(validateEmployee(employeeDraft())).toMatchObject({
      fullName: expect.any(String),
      email: expect.any(String),
      divisionId: expect.any(String),
      positionId: expect.any(String),
    })
    expect(creationPayload(draft, false)).toEqual(draft)
    expect(() => creationPayload({ ...draft, role: 'HRD' }, false)).toThrow()
    expect(creationPayload({ ...draft, role: 'HRD' }, true)).toMatchObject({
      confirmHrAccess: true,
    })
    expect(creationPayload(draft, false)).not.toHaveProperty('password')
    expect(creationPayload(draft, false)).not.toHaveProperty('employeeCode')
  })
  it('preserves URL filters/page and recognizes creation replay without recreating the employee', () => {
    expect(
      employeeFilters(
        new URLSearchParams(
          'page=2&status=INACTIVE&role=HRD&divisionId=div&q=nama',
        ),
      ),
    ).toMatchObject({
      page: 2,
      status: 'INACTIVE',
      role: 'HRD',
      divisionId: 'div',
      q: 'nama',
    })
    expect(
      employeeFilters(new URLSearchParams('page=bad&role=ADMIN')).role,
    ).toBeUndefined()
    expect(
      createdEmployeeId({
        problem: {
          code: 'INITIAL_CREDENTIALS_UNAVAILABLE',
          details: { employeeId: 'created', alreadyCreated: true },
        },
      }),
    ).toBe('created')
    expect(
      createdEmployeeId({
        problem: {
          code: 'INITIAL_CREDENTIALS_UNAVAILABLE',
          details: { employeeId: 'unknown' },
        },
      }),
    ).toBeUndefined()
  })
})

describe('explicit credential handoff', () => {
  it('composes the configured URL locally without sending credentials anywhere', () => {
    expect(accessMessage(credentials, 'https://app.example')).toContain(
      'https://app.example',
    )
    expect(credentialPair(credentials)).toBe(
      `Email: ${draft.email}\nKata sandi awal: fictional-initial-password`,
    )
  })
  it('only reports clipboard success after resolution and exposes failure/unavailability', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    expect(
      await copyAccess('explicit text', { writeText } as unknown as Clipboard),
    ).toBe('copied')
    expect(writeText).toHaveBeenCalledWith('explicit text')
    writeText.mockRejectedValue(new Error('blocked'))
    expect(
      await copyAccess('text', { writeText } as unknown as Clipboard),
    ).toBe('failed')
    expect(await copyAccess('text', {} as Clipboard)).toBe('unavailable')
  })
  it('treats cancelled native share as cancelled and unsupported share as copy fallback', async () => {
    const share = vi
      .fn()
      .mockRejectedValue(new DOMException('Cancelled', 'AbortError'))
    expect(await shareAccess('text', share)).toBe('cancelled')
    share.mockResolvedValue(undefined)
    expect(await shareAccess('text', share)).toBe('completed')
    vi.stubGlobal('navigator', {})
    expect(await shareAccess('text')).toBe('unavailable')
  })
})
