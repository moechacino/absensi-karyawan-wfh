type MultipartValue = string | number | boolean | Blob | null | undefined

/** Accepts generated multipart bodies as well as validated scalar form values. */
export function toFormData<T extends { [Key in keyof T]: MultipartValue }>(
  fields: T,
): FormData {
  const form = new FormData()
  for (const [key, value] of Object.entries(fields) as [
    string,
    MultipartValue,
  ][]) {
    if (value === null || value === undefined) continue
    if (value instanceof Blob) {
      form.append(key, value)
    } else {
      if (typeof value === 'number' && !Number.isFinite(value))
        throw new TypeError('Multipart numbers must be finite.')
      form.append(key, String(value))
    }
  }
  return form
}

/** Convert a validated numeric version without rounding or scientific notation. */
export function versionText(version: number): string {
  if (!Number.isSafeInteger(version) || version < 0)
    throw new TypeError('Expected version must be a nonnegative safe integer.')
  return String(version)
}
