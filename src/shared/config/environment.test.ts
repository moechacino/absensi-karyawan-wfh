import { describe, expect, it } from 'vitest'
import { readPublicConfig } from './environment'

const validEnvironment = {
  VITE_API_BASE_URL: '/api/v1',
  VITE_APP_URL: 'http://localhost:5173',
}

describe('readPublicConfig', () => {
  it('supports a same-origin API base and configured public app URL', () => {
    expect(readPublicConfig(validEnvironment)).toEqual({
      apiBaseUrl: '/api/v1',
      appUrl: 'http://localhost:5173',
    })
  })

  it('supports an explicit HTTP(S) API origin and normalizes trailing slashes', () => {
    expect(
      readPublicConfig({
        VITE_API_BASE_URL: ' https://api.example.test/api/v1/ ',
        VITE_APP_URL: 'https://app.example.test/',
      }),
    ).toEqual({
      apiBaseUrl: 'https://api.example.test/api/v1',
      appUrl: 'https://app.example.test',
    })
  })

  it.each(['VITE_API_BASE_URL', 'VITE_APP_URL'] as const)(
    'explains how to configure missing %s',
    (field) => {
      expect(() => readPublicConfig({ ...validEnvironment, [field]: ' ' })).toThrow(
        `${field} is required. Copy .env.example to .env.local and configure it.`,
      )
    },
  )

  it.each(['/api', '/api/v1?token=secret', '//api.example.test/api/v1', 'not a URL'])(
    'rejects an unsupported or malformed API base: %s',
    (apiBaseUrl) => {
      expect(() =>
        readPublicConfig({ ...validEnvironment, VITE_API_BASE_URL: apiBaseUrl }),
      ).toThrow('VITE_API_BASE_URL')
    },
  )

  it('rejects an absolute API URL with the wrong contract base path', () => {
    expect(() =>
      readPublicConfig({
        ...validEnvironment,
        VITE_API_BASE_URL: 'https://api.example.test/v2',
      }),
    ).toThrow('VITE_API_BASE_URL must use the /api/v1 base path.')
  })

  it.each([
    'javascript:alert(1)',
    'https://user:secret@api.example.test/api/v1',
    'https://api.example.test/api/v1?token=secret',
    'https://api.example.test/api/v1#fragment',
  ])('rejects unsafe API URL configuration without echoing it: %s', (apiBaseUrl) => {
    expect(() =>
      readPublicConfig({ ...validEnvironment, VITE_API_BASE_URL: apiBaseUrl }),
    ).toThrow('VITE_API_BASE_URL must be an HTTP(S) URL without credentials, query, or fragment.')
  })

  it.each(['/relative', 'file:///tmp/app', 'https://user:secret@app.example.test', 'https://app.example.test?token=secret'])(
    'rejects an invalid public app URL: %s',
    (appUrl) => {
      expect(() => readPublicConfig({ ...validEnvironment, VITE_APP_URL: appUrl })).toThrow(
        'VITE_APP_URL',
      )
    },
  )
})
