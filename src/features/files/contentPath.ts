import type { components } from '../../shared/api/schema'

export type FileMetadata = components['schemas']['FileMetadata']
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const imageTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])

export function validFileMetadata(file: FileMetadata): boolean {
  return (
    uuid.test(file.id) &&
    file.contentPath === `/api/v1/files/${file.id}` &&
    imageTypes.has(file.mimeType) &&
    Number.isSafeInteger(file.sizeBytes) &&
    file.sizeBytes > 0
  )
}

export function verifiedImageBlob(blob: Blob, file: FileMetadata): boolean {
  return (
    imageTypes.has(blob.type) &&
    blob.type === file.mimeType &&
    blob.size === file.sizeBytes
  )
}

export function safeDownloadName(value: string): string {
  const basename = value.split(/[\\/]/).pop() ?? ''
  const safe = Array.from(basename)
    .filter(
      (char) =>
        char.charCodeAt(0) >= 32 &&
        char.charCodeAt(0) !== 127 &&
        !':*?"<>|'.includes(char),
    )
    .join('')
  return safe.trim() || 'gambar'
}

export function fileSizeLabel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const unit = bytes < 1024 * 1024 ? 'KB' : 'MB'
  const divisor = unit === 'KB' ? 1024 : 1024 * 1024
  return `${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(bytes / divisor)} ${unit}`
}
