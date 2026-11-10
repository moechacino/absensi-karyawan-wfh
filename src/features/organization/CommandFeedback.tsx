import { Alert } from '../../shared/ui/Feedback'
import { Button } from '../../shared/ui/Button'
import type { ApiError } from '../../shared/api/problem'

export function CommandFeedback({
  status,
  error,
  onRetry,
}: {
  status: string
  error: ApiError | null
  onRetry: () => void
}) {
  if (!error) return null
  const uncertain = status === 'uncertain' || status === 'in-progress'
  return (
    <Alert
      tone={uncertain ? 'warning' : 'danger'}
      title={
        uncertain
          ? 'Hasil penyimpanan belum dipastikan'
          : 'Perubahan belum disimpan'
      }
      action={
        uncertain && (
          <Button variant="secondary" onClick={onRetry}>
            Periksa dengan mencoba intent yang sama
          </Button>
        )
      }
    >
      <p>{error.problem?.detail ?? error.problem?.title ?? error.message}</p>
      {uncertain && (
        <p>
          Data dikunci agar percobaan ulang menggunakan isi dan kunci yang sama.
          Jangan membuat pengajuan baru.
        </p>
      )}
    </Alert>
  )
}
