import { describe, expect, it, vi } from 'vitest'
import type { Employee } from '../model'
import { employeeDraft } from '../model'
import {
  employeePatch,
  invalidatesOwnSession,
  PHOTO_REMOVAL_ENABLED,
  rolePayload,
  validatePhoto,
} from '../editModel'
import { employeeEditApi } from '../editApi'
import type { ApiClient } from '../../../shared/api/client'

const employee = {
  id: 'employee-id',
  employeeCode: 'EMP-001',
  fullName: 'Contoh Pegawai',
  email: 'pegawai@example.test',
  division: { id: 'division-a', name: 'Produk', code: 'PRO' },
  position: { id: 'position-a', name: 'Desainer', code: 'DES' },
  role: 'EMPLOYEE',
  status: 'ACTIVE',
  version: 8,
  hasPasswordChanged: false,
  photo: null,
  createdAt: '2026-11-01T00:00:00Z',
  updatedAt: '2026-11-01T00:00:00Z',
  permissions: [],
} as unknown as Employee
const jpeg = () =>
  new File(['image bytes'], 'photo.jpg', { type: 'image/jpeg' })

describe('employee profile and role command boundaries', () => {
  it('serializes changed profile fields plus decimal version in multipart', () => {
    const draft = {
      ...employeeDraft(employee),
      fullName: 'Nama Baru',
      status: 'INACTIVE' as const,
    }
    const body = employeePatch(employee, draft, null)
    expect(body).toEqual({
      expectedVersion: '8',
      fullName: 'Nama Baru',
      status: 'INACTIVE',
    })
    expect('role' in body).toBe(false)
    const form = new FormData()
    for (const [key, value] of Object.entries(body))
      form.append(key, value as string)
    expect(Object.fromEntries(form)).toEqual({
      expectedVersion: '8',
      fullName: 'Nama Baru',
      status: 'INACTIVE',
    })
  })

  it('replaces a photo while omission keeps it; removal stays gated on proposal P19', () => {
    const file = jpeg()
    expect(employeePatch(employee, employeeDraft(employee), file)).toEqual({
      expectedVersion: '8',
      photo: file,
    })
    expect(
      employeePatch(
        employee,
        { ...employeeDraft(employee), email: 'new@example.test' },
        null,
      ),
    ).toEqual({ expectedVersion: '8', email: 'new@example.test' })
    expect(PHOTO_REMOVAL_ENABLED).toBe(false)
    expect(
      validatePhoto(new File(['x'], 'bad.gif', { type: 'image/gif' })),
    ).toContain('JPEG')
    expect(
      validatePhoto(new File(['x'], 'empty.jpg', { type: 'image/jpeg' })),
    ).toBeUndefined()
  })

  it('rejects empty/unchanged edits and conflicting upload/removal', () => {
    expect(() =>
      employeePatch(employee, employeeDraft(employee), null),
    ).toThrow('Ubah setidaknya')
    expect(() =>
      employeePatch(
        employee,
        employeeDraft(employee),
        new File(['x'], 'x.gif', { type: 'image/gif' }),
      ),
    ).toThrow('JPEG')
    expect(() =>
      employeePatch(employee, employeeDraft(employee), jpeg(), true),
    ).toThrow('tidak dapat digabungkan')
  })

  it('requires role confirmation, uses a separate versioned body, and clears only revoked own access', () => {
    expect(() => rolePayload('HRD', 8, false)).toThrow('Konfirmasi')
    expect(rolePayload('HRD', 8, true)).toEqual({
      role: 'HRD',
      expectedVersion: 8,
      confirmHrAccess: true,
    })
    expect(rolePayload('EMPLOYEE', 8, true)).toEqual({
      role: 'EMPLOYEE',
      expectedVersion: 8,
      confirmHrAccess: false,
    })
    expect(
      invalidatesOwnSession(
        employee.id,
        { ...employee, role: 'HRD' },
        { ...employee, role: 'EMPLOYEE' },
      ),
    ).toBe(true)
    expect(
      invalidatesOwnSession(employee.id, employee, {
        ...employee,
        status: 'INACTIVE',
      }),
    ).toBe(true)
    expect(
      invalidatesOwnSession('other', employee, {
        ...employee,
        status: 'INACTIVE',
      }),
    ).toBe(false)
  })

  it('keeps PATCH multipart and role PUT as separate generated operations', async () => {
    const request = vi.fn().mockResolvedValue(employee)
    const api = { request } as unknown as ApiClient
    await employeeEditApi(api).profile(
      employee.id,
      { expectedVersion: '8', photo: jpeg() },
      'same-intent-key',
    )
    await employeeEditApi(api).role(employee.id, {
      role: 'HRD',
      confirmHrAccess: true,
      expectedVersion: 8,
    })
    expect(request.mock.calls[0][0]).toMatchObject({
      method: 'PATCH',
      path: '/hr/employees/employee-id',
      idempotencyKey: 'same-intent-key',
    })
    expect(request.mock.calls[0][0].data.get('photo')).toBeInstanceOf(File)
    expect(request.mock.calls[1][0]).toEqual({
      path: '/hr/employees/employee-id/role',
      method: 'PUT',
      data: { role: 'HRD', confirmHrAccess: true, expectedVersion: 8 },
      signal: undefined,
    })
  })
})
