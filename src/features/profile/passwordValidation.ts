import type { PasswordInput, PasswordPolicy } from '../../shared/api/types'
import type { ApiError } from '../../shared/api/problem'

export type { PasswordInput, PasswordPolicy } from '../../shared/api/types'

export type PasswordErrors = Partial<Record<keyof PasswordInput, string>>

export function validPasswordPolicy(value: unknown): value is PasswordPolicy {
  if (!value || typeof value !== 'object') return false
  const policy = value as Record<string, unknown>
  return (
    Number.isSafeInteger(policy.minLength) &&
    Number.isSafeInteger(policy.maxLength) &&
    (policy.minLength as number) > 0 &&
    (policy.maxLength as number) >= (policy.minLength as number) &&
    policy.requiresDifferentPassword === true
  )
}

/** Code-point length and exact comparisons; never trim or normalize passwords. */
export function validatePassword(
  input: PasswordInput,
  policy: PasswordPolicy,
): PasswordErrors {
  const errors: PasswordErrors = {}
  if (!input.currentPassword)
    errors.currentPassword = 'Isi kata sandi saat ini.'
  const length = Array.from(input.newPassword).length
  if (length < policy.minLength || length > policy.maxLength)
    errors.newPassword = `Gunakan ${policy.minLength}–${policy.maxLength} karakter.`
  if (
    policy.requiresDifferentPassword &&
    input.newPassword === input.currentPassword
  )
    errors.newPassword =
      'Kata sandi baru harus berbeda dari kata sandi saat ini.'
  if (input.confirmPassword !== input.newPassword)
    errors.confirmPassword = 'Konfirmasi tidak sama dengan kata sandi baru.'
  return errors
}

export function passwordServerErrors(error: ApiError | null): PasswordErrors {
  const errors: PasswordErrors = {}
  for (const item of error?.problem?.errors ?? []) {
    if (
      item.field === 'currentPassword' ||
      item.field === 'newPassword' ||
      item.field === 'confirmPassword'
    )
      errors[item.field] = item.message
  }
  const code = error?.problem?.code
  if (code === 'CURRENT_PASSWORD_INCORRECT')
    errors.currentPassword ??= 'Kata sandi saat ini tidak sesuai.'
  if (code === 'PASSWORD_MISMATCH')
    errors.confirmPassword ??= 'Konfirmasi tidak sama dengan kata sandi baru.'
  if (code === 'PASSWORD_REUSED')
    errors.newPassword ??= 'Gunakan kata sandi yang berbeda.'
  if (code === 'PASSWORD_POLICY')
    errors.newPassword ??=
      'Kata sandi baru tidak memenuhi kebijakan perusahaan.'
  return errors
}
