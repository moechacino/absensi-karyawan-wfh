/** Date-only values are calendar labels; noon UTC avoids device-zone shifts. */
export function isDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T12:00:00Z`)
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  )
}
export function formatDate(value: string): string {
  if (!isDateOnly(value)) return 'Tanggal tidak valid'
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T12:00:00Z`))
}
export function formatTime(
  value: string | null,
  timeZone: string,
  seconds = false,
): string {
  if (!value) return '—'
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return '—'
  try {
    return new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      ...(seconds && { second: '2-digit' }),
      hourCycle: 'h23',
      timeZone,
    }).format(date)
  } catch {
    return 'Zona waktu tidak valid'
  }
}
export function formatTimestamp(
  value: string | null,
  timeZone: string,
): string {
  if (!value) return '—'
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return '—'
  try {
    return new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone,
    }).format(date)
  } catch {
    return 'Zona waktu tidak valid'
  }
}
export function formatDuration(seconds: number | null): string {
  if (seconds === null) return 'Sedang berlangsung'
  if (seconds < 60) return `${seconds} detik`
  const hours = Math.floor(seconds / 3600),
    minutes = Math.floor((seconds % 3600) / 60)
  return hours ? `${hours} jam ${minutes} menit` : `${minutes} menit`
}
export function companyDate(serverNow: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone,
  }).formatToParts(new Date(serverNow))
  const get = (type: string) => parts.find((part) => part.type === type)?.value
  return `${get('year')}-${get('month')}-${get('day')}`
}
