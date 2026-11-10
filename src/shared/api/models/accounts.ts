import type { FileMetadata, MasterSummary, Page, Permission, RecordStatus, Role } from './common'

export interface Division extends MasterSummary {
  description: string | null
  status: RecordStatus
  version: number
}

export interface Position extends MasterSummary {
  division: MasterSummary
  status: RecordStatus
  version: number
}

export interface DivisionCreate {
  code: string
  name: string
  description?: string | null
  status: RecordStatus
}

export type DivisionPatch = Partial<DivisionCreate> & { expectedVersion: number }

export interface PositionCreate {
  code: string
  name: string
  divisionId: string
  status: RecordStatus
}

export type PositionPatch = Partial<PositionCreate> & { expectedVersion: number }

export interface EmployeeSummary {
  id: string
  fullName: string
  division: MasterSummary
  position: MasterSummary
  photo: FileMetadata | null
}

export interface Employee extends EmployeeSummary {
  email: string
  role: Role
  status: RecordStatus
  version: number
  createdAt: string
  updatedAt: string
  readonly hasPasswordChanged: boolean
}

export interface EmployeeCreate {
  fullName: string
  email: string
  divisionId: string
  positionId: string
  role: Role
  status: RecordStatus
  confirmHrAccess?: 'true' | 'false'
  photo?: Blob
}

export interface EmployeePatch {
  expectedVersion: string
  fullName?: string
  email?: string
  divisionId?: string
  positionId?: string
  status?: RecordStatus
  photo?: Blob
  removePhoto?: 'true' | 'false'
}

export interface RoleChange {
  role: Role
  confirmHrAccess: boolean
  expectedVersion: number
}

export interface InitialCredentials {
  email: string
  readonly initialPassword: string
}

export interface EmployeeCreated {
  employee: Employee
  initialCredentials: InitialCredentials
}

export interface InitialCredentialsRead {
  employeeId: string
  initialCredentials: InitialCredentials
}

export interface PasswordPolicy {
  minLength: number
  maxLength: number
  requiresDifferentPassword: true
}

export interface MeProfile extends Employee {
  permissions: Permission[]
  passwordPolicy: PasswordPolicy
}

export interface LoginInput {
  email: string
  password: string
}

export interface LoginResult {
  readonly accessToken: string
  tokenType: 'Bearer'
  expiresIn: number
  expiresAt: string
  serverNow: string
  employee: MeProfile
}

export interface PasswordInput {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export type EmployeePage = Page<Employee>
export type DivisionPage = Page<Division>
export type PositionPage = Page<Position>
