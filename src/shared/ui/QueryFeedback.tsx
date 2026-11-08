import { ErrorState } from './Feedback'
import { isApiError } from '../api/problem'

export function QueryError({
  error,
  retry,
}: {
  error: unknown
  retry?: () => void
}) {
  return (
    <ErrorState onRetry={retry}>
      {isApiError(error)
        ? error.message
        : 'Data belum dapat dimuat. Coba kembali.'}
      {isApiError(error) && error.requestId && (
        <p className="mt-2 break-all text-label">
          ID permintaan: {error.requestId}
        </p>
      )}
    </ErrorState>
  )
}
