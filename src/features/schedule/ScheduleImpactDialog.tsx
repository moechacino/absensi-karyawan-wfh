import { useState } from 'react'
import type { components } from '../../shared/api/schema'
import { Dialog } from '../../shared/ui/Dialog'
import { Alert } from '../../shared/ui/Feedback'
import type { ApiError } from '../../shared/api/problem'
import { Button } from '../../shared/ui/Button'
import { ImpactSummary } from '../../shared/impacts/ImpactSummary'
import { ScheduleCard } from '../company/ScheduleCard'
import { activationLabel, weekdays } from './model'
import type { SchedulePreview } from './model'

export function ScheduleImpactDialog({
  preview,
  current,
  open,
  busy,
  allowed,
  onClose,
  onConfirm,
  commandError,
  uncertain,
  onRetry,
}: {
  preview: SchedulePreview
  current: components['schemas']['ScheduleVersion'] | null
  open: boolean
  busy: boolean
  allowed: boolean
  onClose: () => void
  onConfirm: () => void
  commandError: ApiError | null
  uncertain: boolean
  onRetry: () => void
}) {
  const [acknowledged, setAcknowledged] = useState(false)
  return (
    <Dialog
      open={open}
      title="Tinjau perubahan jadwal global"
      busy={busy}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" disabled={busy} onClick={onClose}>
            Kembali
          </Button>
          <Button
            busy={busy}
            disabled={!allowed || !acknowledged}
            onClick={onConfirm}
          >
            Simpan jadwal
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {commandError && (
          <Alert
            title={
              uncertain
                ? 'Hasil penyimpanan belum pasti'
                : 'Jadwal belum disimpan'
            }
            tone="warning"
          >
            {commandError.problem?.detail ?? commandError.message}
            {uncertain && (
              <Button className="mt-3" onClick={onRetry}>
                Coba ulang penyimpanan yang sama
              </Button>
            )}
          </Alert>
        )}
        <ScheduleCard title="Jadwal aktif sebelumnya" schedule={current} />
        <section className="space-y-2 rounded-card border border-border p-4">
          <h3 className="font-medium">Konfigurasi baru</h3>
          <p>
            {preview.schedule.startTime}–{preview.schedule.endTime}
            {preview.schedule.endDayOffset ? ' (+1 hari)' : ''} ·{' '}
            {preview.schedule.timeZone}
          </p>
          <p>
            {preview.schedule.workingDays
              .map((day) => weekdays[day - 1])
              .join(', ')}
          </p>
          <p>Berlaku mulai: {preview.schedule.effectiveFrom}</p>
          <p>Tanggal pembanding server: {preview.comparisonDate}</p>
          <p className="text-small">{activationLabel(preview)}</p>
        </section>
        <ImpactSummary impact={preview.impact} />
        <label className="flex min-h-touch items-start gap-3">
          <input
            type="checkbox"
            checked={acknowledged}
            disabled={busy || !allowed}
            onChange={(event) => setAcknowledged(event.target.checked)}
            className="mt-1 size-5 accent-action"
          />
          <span>
            Saya memahami perubahan ini berlaku untuk seluruh karyawan. Catatan
            absensi yang tersimpan tetap memakai snapshot jadwal sebelumnya.
          </span>
        </label>
      </div>
    </Dialog>
  )
}
