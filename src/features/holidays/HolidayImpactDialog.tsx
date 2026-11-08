import type { components } from '../../shared/api/schema'
import type { ApiError } from '../../shared/api/problem'
import { ConfirmationDialog } from '../../shared/ui/Dialog'
import { Alert } from '../../shared/ui/Feedback'
import { Button } from '../../shared/ui/Button'
import type { HolidayChanges } from './batchState'

export function HolidayImpactDialog({
  impact,
  changes,
  open,
  busy,
  allowed,
  commandError,
  uncertain,
  onClose,
  onConfirm,
  onRetry,
}: {
  impact: components['schemas']['ChangeImpact']
  changes: HolidayChanges
  open: boolean
  busy: boolean
  allowed: boolean
  commandError: ApiError | null
  uncertain: boolean
  onClose: () => void
  onConfirm: () => void
  onRetry: () => void
}) {
  return (
    <ConfirmationDialog
      open={open}
      title={`Tinjau perubahan hari libur ${changes.year}`}
      description="Hanya tanggal yang ditandai yang akan diperbarui. Kehadiran yang sudah tercatat tetap tersimpan."
      busy={busy}
      confirmDisabled={!allowed || uncertain}
      confirmLabel="Simpan kalender"
      busyLabel="Menyimpan…"
      onClose={onClose}
      onConfirm={onConfirm}
    >
      <div className="space-y-4">
        {commandError && (
          <Alert
            title={
              uncertain
                ? 'Hasil penyimpanan belum pasti'
                : 'Kalender belum disimpan'
            }
            tone={uncertain ? 'warning' : 'danger'}
          >
            {commandError.problem?.detail ?? commandError.message}
            {uncertain && (
              <Button variant="secondary" className="mt-3" onClick={onRetry}>
                Coba ulang penyimpanan yang sama
              </Button>
            )}
          </Alert>
        )}
        <section className="space-y-3 rounded-card border border-border p-4">
          <Alert
            title={
              impact.canApply
                ? 'Perubahan dapat disimpan'
                : 'Periksa masalah kalender'
            }
            tone={impact.canApply ? 'success' : 'warning'}
          >
            Pratinjau memeriksa perubahan saat ini. Penyimpanan akan memeriksa
            ulang versi kalender dan tanggal pada server.
          </Alert>
          {impact.issues.length > 0 && (
            <ul aria-label="Masalah konfigurasi" className="space-y-2">
              {impact.issues.map((issue, index) => (
                <li
                  key={`${issue.code}-${index}`}
                  className="rounded-control bg-warning-soft p-3 text-small"
                >
                  {issue.message}
                  {issue.field && (
                    <span className="ml-1 text-text-muted">
                      ({issue.field})
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="space-y-2 rounded-card border border-border p-4">
          <h3 className="font-medium">
            Tanggal yang ditambahkan atau diubah ({changes.upsert.length})
          </h3>
          {changes.upsert.length ? (
            <ul className="space-y-2">
              {changes.upsert.map((item) => (
                <li
                  key={item.date}
                  className="flex flex-wrap justify-between gap-2"
                >
                  <span>
                    {item.name} · {item.category}
                  </span>
                  <time dateTime={item.date}>{item.date}</time>
                </li>
              ))}
            </ul>
          ) : (
            <p>Tidak ada tanggal yang ditambahkan atau diubah.</p>
          )}
        </section>
        <section className="space-y-2 rounded-card border border-border p-4">
          <h3 className="font-medium">
            Tanggal yang dihapus ({changes.remove.length})
          </h3>
          {changes.remove.length ? (
            <ul className="space-y-2">
              {changes.remove.map((date) => (
                <li key={date}>
                  <time dateTime={date}>{date}</time>
                </li>
              ))}
            </ul>
          ) : (
            <p>Tidak ada tanggal yang dihapus.</p>
          )}
        </section>
      </div>
    </ConfirmationDialog>
  )
}
