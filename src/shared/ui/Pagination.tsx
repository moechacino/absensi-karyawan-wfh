import { Icon } from '../icons/Icon'
import { Button } from './Button'

export function Pagination({
  page,
  totalPages,
  onPageChange,
  busy,
  label = 'Paginasi',
}: {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  busy?: boolean
  label?: string
}) {
  return (
    <nav
      aria-label={label}
      className="flex flex-wrap items-center justify-between gap-3"
    >
      <Button
        variant="secondary"
        aria-label="Halaman sebelumnya"
        disabled={busy || page <= 1 || totalPages === 0}
        onClick={() => onPageChange(page - 1)}
      >
        <Icon name="left" />
        <span className="hidden sm:inline">Sebelumnya</span>
      </Button>
      <p aria-live="polite" className="text-small text-text-muted">
        {totalPages === 0
          ? 'Tidak ada halaman'
          : `Halaman ${page} dari ${totalPages}`}
      </p>
      <Button
        variant="secondary"
        aria-label="Halaman berikutnya"
        disabled={busy || page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        <span className="hidden sm:inline">Berikutnya</span>
        <Icon name="right" />
      </Button>
    </nav>
  )
}
