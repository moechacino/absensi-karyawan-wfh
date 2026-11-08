/** Convert a typed form object into browser FormData. Empty optional values are omitted. */
export function toFormData(fields: object): FormData {
  const form = new FormData()
  for (const [name, value] of Object.entries(fields)) {
    if (value === null || value === undefined) continue
    if (value instanceof Blob) {
      form.append(name, value)
    } else if (typeof value === 'string' || typeof value === 'boolean') {
      form.append(name, String(value))
    } else if (typeof value === 'number' && Number.isFinite(value)) {
      form.append(name, String(value))
    } else {
      throw new TypeError(`Unsupported multipart value for ${name}.`)
    }
  }
  return form
}

/** Employee versions are sent as decimal text in multipart requests. */
export function versionText(version: number): string {
  if (!Number.isSafeInteger(version) || version < 0) {
    throw new TypeError('Expected version must be a nonnegative safe integer.')
  }
  return String(version)
}
