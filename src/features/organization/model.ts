import type {
  Division,
  DivisionCreate,
  MasterSummary,
  Pagination,
  Position,
  PositionCreate,
} from '../../shared/api/types'

export type { Division, Position, MasterSummary } from '../../shared/api/types'
export type MasterKind = 'divisions' | 'positions'
export type Master = Division | Position
export type MasterPageResult = {
  items: Master[]
  pagination: Pagination
}
export type MasterFilters = {
  q?: string
  status?: 'ACTIVE' | 'INACTIVE'
  divisionId?: string
  page: number
  pageSize: number
}
export type MasterDraft = {
  code: string
  name: string
  description: string
  divisionId: string
  status: 'ACTIVE' | 'INACTIVE'
}
export type MasterErrors = Partial<Record<keyof MasterDraft, string>>

export function masterFilters(search: URLSearchParams): MasterFilters {
  const page = Number(search.get('page'))
  const status = search.get('status')
  return {
    q: search.get('q')?.slice(0, 160) || undefined,
    status: status === 'ACTIVE' || status === 'INACTIVE' ? status : undefined,
    divisionId: search.get('divisionId') || undefined,
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
    pageSize: 20,
  }
}

export function draftFor(master?: Master): MasterDraft {
  return {
    code: master?.code ?? '',
    name: master?.name ?? '',
    description:
      master && 'description' in master ? (master.description ?? '') : '',
    divisionId: master && 'division' in master ? master.division.id : '',
    status: master?.status ?? 'ACTIVE',
  }
}

export function validateMaster(
  kind: MasterKind,
  draft: MasterDraft,
): MasterErrors {
  const errors: MasterErrors = {}
  if (!draft.code.trim() || draft.code.length > 40)
    errors.code = 'Isi kode, maksimal 40 karakter.'
  if (!draft.name.trim() || draft.name.length > 160)
    errors.name = 'Isi nama, maksimal 160 karakter.'
  if (kind === 'divisions' && draft.description.length > 1000)
    errors.description = 'Maksimal 1.000 karakter.'
  if (kind === 'positions' && !draft.divisionId)
    errors.divisionId = 'Pilih divisi aktif.'
  return errors
}

export function masterCreate(
  kind: 'divisions',
  draft: MasterDraft,
): DivisionCreate
export function masterCreate(
  kind: 'positions',
  draft: MasterDraft,
): PositionCreate
export function masterCreate(
  kind: MasterKind,
  draft: MasterDraft,
): DivisionCreate | PositionCreate
export function masterCreate(kind: MasterKind, draft: MasterDraft) {
  const common = { code: draft.code, name: draft.name, status: draft.status }
  return kind === 'divisions'
    ? { ...common, description: draft.description || null }
    : { ...common, divisionId: draft.divisionId }
}

export function retainedLabel(
  master: MasterSummary | undefined,
): string | undefined {
  return master
    ? `${master.name} · ${master.code} (referensi saat ini)`
    : undefined
}

export function changeDivision(divisionId: string) {
  return { divisionId, positionId: '' }
}
