import type { Credentials } from './model'

export function accessMessage(
  credentials: Credentials,
  appUrl: string,
): string {
  return `Akses Absensi Karyawan WFH\n${appUrl}\nEmail: ${credentials.email}\nKata sandi awal: ${credentials.initialPassword}\nSilakan masuk dan ganti kata sandi melalui profil Anda.`
}

export function credentialPair(credentials: Credentials): string {
  return `Email: ${credentials.email}\nKata sandi awal: ${credentials.initialPassword}`
}

export async function copyAccess(
  text: string,
  clipboard = navigator.clipboard,
): Promise<'copied' | 'unavailable' | 'failed'> {
  if (!clipboard?.writeText) return 'unavailable'
  try {
    await clipboard.writeText(text)
    return 'copied'
  } catch {
    return 'failed'
  }
}

export async function shareAccess(
  text: string,
  share = navigator.share?.bind(navigator),
): Promise<'completed' | 'cancelled' | 'unavailable' | 'failed'> {
  if (!share) return 'unavailable'
  try {
    await share({ title: 'Akses Absensi Karyawan WFH', text })
    return 'completed'
  } catch (error) {
    return error instanceof DOMException && error.name === 'AbortError'
      ? 'cancelled'
      : 'failed'
  }
}
