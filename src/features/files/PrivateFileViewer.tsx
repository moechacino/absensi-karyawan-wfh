import { useEffect, useState } from 'react'
import { retryAfterMs } from '../../shared/api/problem'
import type { ApiError } from '../../shared/api/problem'
import { Dialog } from '../../shared/ui/Dialog'
import { Button } from '../../shared/ui/Button'
import { Alert, EmptyState, LoadingState } from '../../shared/ui/Feedback'
import { usePrivateFile } from './usePrivateFile'
import { fileSizeLabel, safeDownloadName } from './contentPath'
import type { FileMetadata } from './contentPath'

function RetryRead({
  error,
  onRetry,
}: {
  error: ApiError
  onRetry: () => void
}) {
  const [remaining, setRemaining] = useState(() =>
    Math.ceil((retryAfterMs(error.retryAfter) ?? 0) / 1000),
  )
  useEffect(() => {
    if (!remaining) return
    const timer = setInterval(
      () => setRemaining((value) => Math.max(0, value - 1)),
      1000,
    )
    return () => clearInterval(timer)
  }, [remaining])
  return (
    <Button
      className="mt-3"
      variant="secondary"
      onClick={onRetry}
      disabled={remaining > 0}
    >
      {remaining ? `Muat ulang dalam ${remaining} detik` : 'Muat ulang gambar'}
    </Button>
  )
}

function ViewerContent({
  file,
  onClose,
}: {
  file: FileMetadata
  onClose: () => void
}) {
  const { url, error, loading, retry } = usePrivateFile(file)
  const [zoom, setZoom] = useState(1)
  const [failed, setFailed] = useState(false)
  const unavailable = error?.status === 404
  return (
    <div className="space-y-4">
      <p className="text-small text-text-muted [overflow-wrap:anywhere]">
        {file.fileName} · {fileSizeLabel(file.sizeBytes)}
      </p>
      {loading && <LoadingState label="Memuat gambar privat…" />}
      {error && (
        <Alert
          title={
            unavailable ? 'Gambar tidak tersedia' : 'Gambar belum dapat dimuat'
          }
          tone="danger"
        >
          {unavailable
            ? 'Gambar tidak tersedia atau tidak dapat diakses.'
            : error.status === 503
              ? 'Penyimpanan sementara tidak tersedia. Coba muat ulang sesuai petunjuk server.'
              : 'Periksa koneksi dan coba muat ulang.'}
          {error.requestId && <p>ID permintaan: {error.requestId}</p>}
          <RetryRead error={error} onRetry={retry} />
        </Alert>
      )}
      {url && (
        <>
          {!failed ? (
            <div className="max-h-[60dvh] overflow-auto rounded-card bg-canvas p-2">
              <img
                src={url}
                alt={file.fileName}
                className={
                  zoom === 1
                    ? 'mx-auto h-auto max-w-full object-contain'
                    : 'mx-auto h-auto w-[200%] max-w-none object-contain'
                }
                onError={() => setFailed(true)}
              />
            </div>
          ) : (
            <Alert title="Pratinjau tidak dapat ditampilkan" tone="warning">
              Unduh gambar untuk membukanya di perangkat Anda.
            </Alert>
          )}
          <div className="flex flex-wrap gap-3">
            {!failed && (
              <Button
                variant="secondary"
                onClick={() => setZoom((value) => (value === 1 ? 2 : 1))}
              >
                {zoom === 1 ? 'Perbesar gambar' : 'Ukuran normal'}
              </Button>
            )}
            <a
              className="inline-flex min-h-touch items-center rounded-control bg-action px-4 py-3 font-medium text-on-action focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
              href={url}
              download={safeDownloadName(file.fileName)}
            >
              Unduh gambar
            </a>
            <Button variant="ghost" onClick={onClose}>
              Selesai
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

export function PrivateFileViewer({
  file,
  open,
  onClose,
}: {
  file: FileMetadata | null | undefined
  open: boolean
  onClose: () => void
}) {
  return (
    <Dialog open={open} title="Pratinjau gambar" onClose={onClose}>
      {open &&
        (file ? (
          <ViewerContent key={file.id} file={file} onClose={onClose} />
        ) : (
          <EmptyState title="Belum ada gambar">
            Tidak ada gambar yang dapat ditampilkan.
          </EmptyState>
        ))}
    </Dialog>
  )
}
