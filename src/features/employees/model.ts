import type { components } from '../../shared/api/schema'
import type { JsonBody } from '../../shared/api/types'

export type Employee = components['schemas']['Employee']
export type Credentials = components['schemas']['InitialCredentials']
export type EmployeeDraft = {
  fullName: string
  email: string
  divisionId: string
  positionId: string
  role: 'EMPLOYEE' | 'HRD'
  status: 'ACTIVE' | 'INACTIVE'
}
export type EmployeeErrors = Partial<Record<keyof EmployeeDraft, string>>

export function employeeFilters(search: URLSearchParams) {
  const page = Number(search.get('page'))
  const status = search.get('status'),
    role = search.get('role')
  return {
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
    pageSize: 20,
    q: search.get('q')?.slice(0, 160) || undefined,
    status: status === 'ACTIVE' || status === 'INACTIVE' ? status : undefined,
    role: role === 'EMPLOYEE' || role === 'HRD' ? role : undefined,
    divisionId: search.get('divisionId') || undefined,
  }
}

export function employeeDraft(employee?: Employee): EmployeeDraft {
  return {
    fullName: employee?.fullName ?? '',
    email: employee?.email ?? '',
    divisionId: employee?.division.id ?? '',
    positionId: employee?.position.id ?? '',
    role: employee?.role ?? 'EMPLOYEE',
    status: employee?.status ?? 'ACTIVE',
  }
}

export function validateEmployee(draft: EmployeeDraft): EmployeeErrors {
  const errors: EmployeeErrors = {}
  if (!draft.fullName.trim() || draft.fullName.length > 160)
    errors.fullName = 'Isi nama lengkap, maksimal 160 karakter.'
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email) ||
    draft.email.length > 254
  )
    errors.email = 'Isi email kantor yang valid.'
  if (!draft.divisionId) errors.divisionId = 'Pilih divisi aktif.'
  if (!draft.positionId)
    errors.positionId = 'Pilih posisi aktif dari divisi tersebut.'
  return errors
}

export function creationPayload(
  draft: EmployeeDraft,
  confirmedHr: boolean,
): JsonBody<'createEmployee'> {
  if (draft.role === 'HRD' && !confirmedHr)
    throw new Error('Konfirmasi akses HRD diperlukan.')
  return { ...draft, ...(draft.role === 'HRD' && { confirmHrAccess: true }) }
}

export function createdEmployeeId(
  error: {
    problem?: { code: string; details?: Record<string, unknown> }
  } | null,
): string | undefined {
  const details = error?.problem?.details
  return error?.problem?.code === 'INITIAL_CREDENTIALS_UNAVAILABLE' &&
    details?.alreadyCreated === true &&
    typeof details.employeeId === 'string'
    ? details.employeeId
    : undefined
}
