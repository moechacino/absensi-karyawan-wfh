import type { EmployeePatch, RoleChange } from '../../shared/api/types'
import { versionText } from '../../shared/api/multipart'
import type { Employee, EmployeeDraft } from './model'

export const PROFILE_PHOTO_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const
export const PROFILE_PHOTO_MAX_BYTES = 5 * 1024 * 1024
// P19 is still a proposal; no remove-photo control is rendered in active UI.
export const PHOTO_REMOVAL_ENABLED = false

export function validatePhoto(file: File | null): string | undefined {
  if (!file) return undefined
  if (!PROFILE_PHOTO_TYPES.some((type) => type === file.type))
    return 'Gunakan gambar JPEG, PNG, atau WebP.'
  if (file.size === 0 || file.size > PROFILE_PHOTO_MAX_BYTES)
    return 'Gunakan gambar berisi data, maksimal 5 MiB.'
  return undefined
}

export function employeePatch(
  original: Employee,
  draft: EmployeeDraft,
  photo: File | null,
  removePhoto = false,
): EmployeePatch {
  if (photo && removePhoto)
    throw new Error('Unggah dan hapus foto tidak dapat digabungkan.')
  const photoError = validatePhoto(photo)
  if (photoError) throw new Error(photoError)
  const fields: {
    expectedVersion: string
    fullName?: string
    email?: string
    divisionId?: string
    positionId?: string
    status?: EmployeeDraft['status']
    photo?: File
    removePhoto?: 'true'
  } = {
    expectedVersion: versionText(original.version),
  }
  if (draft.fullName !== original.fullName) fields.fullName = draft.fullName
  if (draft.email !== original.email) fields.email = draft.email
  if (draft.divisionId !== original.division.id)
    fields.divisionId = draft.divisionId
  if (draft.positionId !== original.position.id)
    fields.positionId = draft.positionId
  if (draft.status !== original.status) fields.status = draft.status
  if (photo) fields.photo = photo
  if (removePhoto) fields.removePhoto = 'true'
  if (Object.keys(fields).length === 1)
    throw new Error('Ubah setidaknya satu data atau foto sebelum menyimpan.')
  return fields
}

export function rolePayload(
  role: Employee['role'],
  expectedVersion: number,
  confirmed: boolean,
): RoleChange {
  if (!confirmed)
    throw new Error('Konfirmasi dampak perubahan akses diperlukan.')
  return { role, expectedVersion, confirmHrAccess: role === 'HRD' }
}

export function invalidatesOwnSession(
  actorId: string,
  previous: Employee,
  next: Employee,
): boolean {
  return (
    actorId === next.id &&
    (next.status !== 'ACTIVE' ||
      previous.role !== next.role)
  )
}
