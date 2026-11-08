import { describe, expect, expectTypeOf, it } from 'vitest'
import { toFormData, versionText } from '../multipart'
import type { MultipartBody } from '../types'

describe('multipart serialization', () => {
  const file = new File(['camera bytes'], 'photo.png', { type: 'image/png' })

  it('supports the generated check-in body with untouched file bytes and filename', () => {
    const body: MultipartBody<'checkIn'> = {
      photo: file,
      contextToken: 'current-context',
    }
    const data = toFormData(body)
    expect([...data.keys()]).toEqual(['photo', 'contextToken'])
    expect(data.get('photo')).toBe(file)
    expect(data.get('contextToken')).toBe('current-context')
  })

  it('omits absent optional photo parts while preserving meaningful whitespace in text', () => {
    const body: MultipartBody<'updateEmployee'> = {
      expectedVersion: '2',
      fullName: '  Nama tetap  ',
    }
    const data = toFormData(body)
    expect(data.has('photo')).toBe(false)
    expect(data.get('fullName')).toBe('  Nama tetap  ')
    expect(data.has('payload')).toBe(false)
    expect(toFormData({ ...body, photo: file }).get('photo')).toBe(file)
  })

  it('supports employee PATCH even without a photo and serializes version/removal as text', () => {
    expectTypeOf<MultipartBody<'updateEmployee'>>().not.toBeUnknown()
    expectTypeOf<{ expectedVersion: string }>().not.toExtend<
      MultipartBody<'updateEmployee'>
    >()
    expectTypeOf<{ fullName: string }>().not.toExtend<
      MultipartBody<'updateEmployee'>
    >()
    const body: MultipartBody<'updateEmployee'> = {
      expectedVersion: versionText(0),
      fullName: 'Contoh',
      removePhoto: 'false',
    }
    const data = toFormData(body)
    expect(Object.fromEntries(data)).toEqual({
      expectedVersion: '0',
      fullName: 'Contoh',
      removePhoto: 'false',
    })
    expect(toFormData({ ...body, photo: file }).get('photo')).toBe(file)
    expect(
      toFormData({
        expectedVersion: 2,
        removePhoto: true,
        empty: null,
        absent: undefined,
      }).get('removePhoto'),
    ).toBe('true')
  })

  it('rejects nonfinite numbers and unsafe versions rather than rounding them', () => {
    for (const value of [NaN, Infinity, -Infinity])
      expect(() => toFormData({ value })).toThrow(TypeError)
    for (const value of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1, NaN])
      expect(() => versionText(value)).toThrow(TypeError)
    expect(versionText(Number.MAX_SAFE_INTEGER)).toBe('9007199254740991')
  })
})
