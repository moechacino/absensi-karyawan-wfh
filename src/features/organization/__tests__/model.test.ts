import { describe, expect, it } from 'vitest'
import {
  changeDivision,
  draftFor,
  masterCreate,
  masterFilters,
  retainedLabel,
  validateMaster,
} from '../model'
import { organizationApi, latestMaster } from '../api'
import type { ApiClient } from '../../../shared/api/client'
import { vi } from 'vitest'

const draft = {
  code: 'ENG',
  name: 'Engineering',
  description: '',
  divisionId: 'division-id',
  status: 'ACTIVE' as const,
}

describe('organization filters and drafts', () => {
  it('normalizes URL pages/status and retains supported search/division filters', () => {
    expect(
      masterFilters(
        new URLSearchParams('page=-1&status=anything&q=nama&divisionId=id'),
      ),
    ).toEqual({
      page: 1,
      pageSize: 20,
      q: 'nama',
      divisionId: 'id',
      status: undefined,
    })
    expect(
      masterFilters(new URLSearchParams('page=3&status=INACTIVE')).page,
    ).toBe(3)
  })
  it('validates master fields and derives schema-specific payloads without inventing position descriptions', () => {
    expect(
      validateMaster('divisions', {
        ...draft,
        code: ' ',
        name: '',
        description: 'x'.repeat(1001),
      }),
    ).toEqual({
      code: expect.any(String),
      name: expect.any(String),
      description: expect.any(String),
    })
    expect(
      validateMaster('positions', { ...draft, divisionId: '' }),
    ).toHaveProperty('divisionId')
    expect(masterCreate('divisions', draft)).toEqual({
      code: 'ENG',
      name: 'Engineering',
      description: null,
      status: 'ACTIVE',
    })
    expect(masterCreate('positions', draft)).toEqual({
      code: 'ENG',
      name: 'Engineering',
      divisionId: 'division-id',
      status: 'ACTIVE',
    })
  })
  it('retains existing labels and clears an incompatible position on division change', () => {
    expect(
      retainedLabel({ id: 'old', name: 'Historical', code: 'OLD' }),
    ).toContain('referensi saat ini')
    expect(changeDivision('new')).toEqual({ divisionId: 'new', positionId: '' })
    expect(
      draftFor({
        id: 'old',
        code: 'OLD',
        name: 'Historical',
        description: null,
        version: 4,
        status: 'INACTIVE',
      }),
    ).toMatchObject({ status: 'INACTIVE', description: '' })
  })
})

describe('organization service boundary', () => {
  it('passes idempotency on creates and expectedVersion on updates without delete operations', async () => {
    const request = vi.fn().mockResolvedValue({})
    const services = organizationApi({ request } as unknown as ApiClient)
    await services.createDivision(masterCreate('divisions', draft), 'same-key')
    await services.updatePosition('position-id', {
      ...masterCreate('positions', draft),
      expectedVersion: 7,
    })
    expect(request).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ method: 'POST', idempotencyKey: 'same-key' }),
    )
    expect(request).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        method: 'PATCH',
        data: expect.objectContaining({ expectedVersion: 7 }),
      }),
    )
    expect(services).not.toHaveProperty('delete')
  })
  it('searches every returned page when resolving a conflicted row for review', async () => {
    const row = { id: 'target', code: 'ENG', name: 'Latest', version: 8 }
    const request = vi
      .fn()
      .mockResolvedValueOnce({
        items: [],
        pagination: { page: 1, totalPages: 2 },
      })
      .mockResolvedValueOnce({
        items: [row],
        pagination: { page: 2, totalPages: 2 },
      })
    expect(
      await latestMaster(
        { request } as unknown as ApiClient,
        'divisions',
        'target',
        'ENG',
      ),
    ).toBe(row)
    expect(request.mock.calls[1][0].params.page).toBe(2)
  })
})
