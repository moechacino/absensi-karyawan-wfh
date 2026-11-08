const allowed = [
  /^\/app(?:\/(?:attendance(?:\/[a-f\d-]{36})?|check-in|schedule|holidays|profile|password))?$/i,
  /^\/hr\/(?:attendance(?:\/[a-f\d-]{36})?|employees(?:\/(?:new|[a-f\d-]{36}(?:\/edit)?))?|divisions|positions|schedule|holidays)$/i,
]

export function safeReturnPath(value: string | null | undefined): string {
  if (
    !value ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    /[\\\r\n]/.test(value)
  )
    return '/app'
  try {
    const url = new URL(value, 'https://internal.invalid')
    if (
      url.origin !== 'https://internal.invalid' ||
      url.hash ||
      !allowed.some((pattern) => pattern.test(url.pathname))
    )
      return '/app'
    return `${url.pathname}${url.search}`
  } catch {
    return '/app'
  }
}
