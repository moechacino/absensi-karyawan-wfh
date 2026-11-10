export type Role = 'EMPLOYEE' | 'HRD'
export type RecordStatus = 'ACTIVE' | 'INACTIVE'
export type Permission =
  | 'SELF_SERVICE'
  | 'HR_EMPLOYEES_MANAGE'
  | 'HR_ORGANIZATION_MANAGE'
  | 'HR_SCHEDULE_MANAGE'
  | 'HR_HOLIDAYS_MANAGE'
  | 'HR_ATTENDANCE_READ'

export interface Pagination {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export interface Page<T> {
  items: T[]
  pagination: Pagination
}

export interface FieldError {
  field: string
  code: string
  message: string
}

export interface Problem {
  type: string
  title: string
  status: number
  detail?: string
  code: string
  requestId: string
  errors?: FieldError[]
  details?: Record<string, unknown>
}

export interface MasterSummary {
  id: string
  code: string
  name: string
}

export interface Actor {
  id: string
  fullName: string
}

export interface FileMetadata {
  id: string
  fileName: string
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp'
  sizeBytes: number
  purpose: 'CHECK_IN_PHOTO' | 'EMPLOYEE_PROFILE_PHOTO'
  contentPath: string
}

export interface ChangeImpact {
  canApply: boolean
  issues: { code: string; field: string | null; message: string }[]
}
