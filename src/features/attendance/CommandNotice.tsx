import type { ApiError } from '../../shared/api/problem'
import { Alert } from '../../shared/ui/Feedback'
import { Button } from '../../shared/ui/Button'
export function CommandNotice({
  status,
  error,
  retry,
}: {
  status: string
  error: ApiError | null
  retry: () => void
}) {
  if (!error) return null
  const uncertain = status === 'uncertain' || status === 'in-progress'
  return (
    <Alert
      tone={uncertain ? 'warning' : 'danger'}
      title={
        uncertain
          ? 'Hasil tindakan belum dipastikan'
          : 'Tindakan belum dapat diselesaikan'
      }
      action={
        uncertain && (
          <Button variant="secondary" onClick={retry}>
            Coba ulang tindakan yang sama
          </Button>
        )
      }
    >
      <p>{error.problem?.detail ?? error.message}</p>
      {uncertain && (
        <p>
          Jangan mengambil foto atau membuat tindakan baru sampai hasil
          dipastikan.
        </p>
      )}
      {error.requestId && (
        <p className="mt-2 break-all text-label">
          ID permintaan: {error.requestId}
        </p>
      )}
    </Alert>
  )
}
