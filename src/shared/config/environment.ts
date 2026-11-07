interface PublicEnvironment {
  VITE_API_BASE_URL?: string
  VITE_APP_URL?: string
}

export interface PublicConfig {
  apiBaseUrl: string
  appUrl: string
}

function required(value: string | undefined, name: string): string {
  if (!value?.trim()) {
    throw new Error(`${name} is required. Copy .env.example to .env.local and configure it.`)
  }

  return value.trim().replace(/\/+$/, '')
}

function httpUrl(value: string, name: string): URL {
  let url: URL

  try {
    url = new URL(value)
  } catch {
    throw new Error(`${name} must be an absolute HTTP(S) URL.`)
  }

  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error(`${name} must be an HTTP(S) URL without credentials, query, or fragment.`)
  }

  return url
}

export function readPublicConfig(environment: PublicEnvironment): PublicConfig {
  const apiBaseUrl = required(environment.VITE_API_BASE_URL, 'VITE_API_BASE_URL')
  const appUrl = required(environment.VITE_APP_URL, 'VITE_APP_URL')

  if (apiBaseUrl !== '/api/v1') {
    const apiUrl = httpUrl(apiBaseUrl, 'VITE_API_BASE_URL')

    if (apiUrl.pathname !== '/api/v1') {
      throw new Error('VITE_API_BASE_URL must use the /api/v1 base path.')
    }
  }

  httpUrl(appUrl, 'VITE_APP_URL')

  return { apiBaseUrl, appUrl }
}
