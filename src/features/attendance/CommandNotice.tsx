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
      {error.problem?.code === 'MISSED_CHECK_OUT' && (
        <p>Jendela check-in shift kerja berikutnya telah dibuka. Check-out tidak dapat dilakukan; waktu selesai dan durasi tetap kosong.</p>
      )}
      {uncertain && (
        <p>
          Jangan mengambil foto atau membuat tindakan baru sampai hasil
          dipastikan.
        </p>
      )}
    </Alert>
  )
}
