import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router'
import type { components } from '../../shared/api/schema'
import { isApiError } from '../../shared/api/problem'
import { useApi, useSession } from '../../shared/auth'
import { useCommand } from '../../shared/commands/useCommand'
import { usePreview } from '../../shared/preview/usePreview'
import { invalidateGroup } from '../../shared/query/invalidation'
import { Button } from '../../shared/ui/Button'
import { Alert } from '../../shared/ui/Feedback'
import { QueryError } from '../../shared/ui/QueryFeedback'
import { TextField } from '../../shared/forms/TextField'
import { SelectField } from '../../shared/forms/SelectField'
import { Combobox } from '../../shared/forms/Combobox'
import { isDateOnly } from '../../shared/dates/format'
import { changeWorkSchedule, previewWorkSchedule, searchTimeZones } from './api'
import {
  canApplySchedule,
  initialSchedule,
  offsetLabel,
  validateSchedule,
  weekdays,
} from './model'
import type { ScheduleInput } from './model'
import { ScheduleImpactDialog } from './ScheduleImpactDialog'

export function ScheduleEditor({
  model,
  refresh,
}: {
  model: components['schemas']['WorkSchedule']
  refresh: () => Promise<number | undefined>
}) {
  const api = useApi(),
    { profile } = useSession(),
    client = useQueryClient()
  const [draft, setDraft] = useState(() => initialSchedule(model))
  const [attempted, setAttempted] = useState(false),
    [zoneQuery, setZoneQuery] = useState(''),
    [reviewOpen, setReviewOpen] = useState(false)
  const preview = usePreview({
    identity: profile?.id ?? null,
    execute: (input: ScheduleInput, signal) =>
      previewWorkSchedule(api, input, signal),
    getExpiresAt: (result) => result.impact.expiresAt ?? undefined,
  })
  const command = useCommand({
    identity: profile?.id ?? null,
    execute: async (input: components['schemas']['ScheduleWrite'], context) => {
      try {
        return await changeWorkSchedule(
          api,
          input,
          context.idempotencyKey!,
          context.signal,
        )
      } catch (error) {
        if (
          isApiError(error) &&
          ['PREVIEW_STALE', 'VERSION_CONFLICT', 'REVIEW_STALE'].includes(
            error.problem?.code ?? '',
          )
        ) {
          preview.invalidate()
          setReviewOpen(false)
          void refresh()
        }
        throw error
      }
    },
    onConfirmed: async (result) => {
      setReviewOpen(false)
      preview.invalidate()
      setDraft((value) => ({
        ...value,
        expectedVersion: result.schedule.version,
      }))
      if (profile) await invalidateGroup(client, profile.id, 'configuration')
    },
  })
  const timeZones = useQuery({
    queryKey: [
      'private',
      profile?.id,
      'time-zones',
      { q: zoneQuery, atDate: draft.effectiveFrom },
    ],
    queryFn: ({ signal }) =>
      searchTimeZones(api, zoneQuery, draft.effectiveFrom, signal),
    enabled: isDateOnly(draft.effectiveFrom),
  })
  const errors = validateSchedule(draft),
    locked = ['submitting', 'uncertain', 'in-progress'].includes(command.status)
  function change(patch: Partial<ScheduleInput>) {
    if (locked) return
    setDraft((value) => ({ ...value, ...patch }))
    preview.invalidate()
    command.reset()
    setReviewOpen(false)
  }
  async function review() {
    setAttempted(true)
    if (Object.keys(errors).length) return
    command.reset()
    const result = await preview.run(draft)
    if (result) setReviewOpen(true)
  }
  async function refreshVersion() {
    const version = await refresh()
    if (version !== undefined) change({ expectedVersion: version })
  }
  function save() {
    if (!preview.isCurrent(draft) || !canApplySchedule(draft, preview.result))
      return
    void command.run({
      ...draft,
      impactToken: preview.result!.impact.impactToken!,
    })
  }
  return (
    <div className="space-y-6">
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <form
          className="space-y-5 rounded-panel border border-border bg-surface p-5 sm:p-7"
          onSubmit={(event) => {
            event.preventDefault()
            void review()
          }}
        >
          <fieldset disabled={locked} className="space-y-5">
            <fieldset>
              <legend className="mb-3 text-label font-medium">
                Hari kerja
              </legend>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                {weekdays.map((label, index) => (
                  <Button
                    key={label}
                    aria-pressed={draft.workingDays.includes(index + 1)}
                    variant={
                      draft.workingDays.includes(index + 1)
                        ? 'primary'
                        : 'secondary'
                    }
                    className="px-2"
                    onClick={() =>
                      change({
                        workingDays: (draft.workingDays.includes(index + 1)
                          ? draft.workingDays.filter((day) => day !== index + 1)
                          : [...draft.workingDays, index + 1]
                        ).sort((a, b) => a - b),
                      })
                    }
                  >
                    {label.slice(0, 3)}
                  </Button>
                ))}
              </div>
              {attempted && errors.workingDays && (
                <p role="alert" className="mt-2 text-small text-danger">
                  {errors.workingDays}
                </p>
              )}
            </fieldset>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Jam mulai"
                type="time"
                value={draft.startTime}
                onChange={(event) => change({ startTime: event.target.value })}
                error={attempted ? errors.startTime : undefined}
                required
              />
              <TextField
                label="Jam selesai"
                type="time"
                value={draft.endTime}
                onChange={(event) => change({ endTime: event.target.value })}
                error={attempted ? errors.endTime : undefined}
                required
              />
            </div>
            <SelectField
              label="Selesai pada"
              disabled={locked}
              value={String(draft.endDayOffset)}
              onChange={(value) =>
                change({ endDayOffset: Number(value) as 0 | 1 })
              }
              options={[
                { value: '0', label: 'Hari yang sama' },
                { value: '1', label: 'Hari berikutnya' },
              ]}
            />
            <TextField
              label="Berlaku mulai"
              type="date"
              value={draft.effectiveFrom}
              onChange={(event) =>
                change({ effectiveFrom: event.target.value })
              }
              hint="Tanggal lampau dan aktivasi diperiksa server dalam zona waktu terpilih."
              error={attempted ? errors.effectiveFrom : undefined}
              required
            />
            <Combobox
              label="Zona waktu"
              value={draft.timeZone}
              selectedLabel={draft.timeZone}
              onChange={(value) => change({ timeZone: value })}
              onSearch={setZoneQuery}
              options={(timeZones.data?.items ?? []).map((zone) => ({
                value: zone.id,
                label: `${zone.label} · ${offsetLabel(zone.offsetMinutes)}`,
              }))}
              disabled={locked || !isDateOnly(draft.effectiveFrom)}
              loading={timeZones.isFetching}
              error={attempted ? errors.timeZone : undefined}
              hint="Pilih tanggal berlaku untuk melihat offset zona pada tanggal tersebut. Identifier IANA tetap menjadi acuan."
            />
            {timeZones.isError && (
              <QueryError
                error={timeZones.error}
                retry={() => void timeZones.refetch()}
              />
            )}
          </fieldset>
          <div className="flex flex-wrap gap-3">
            <Button
              type="submit"
              busy={preview.status === 'loading'}
              disabled={locked}
            >
              Tinjau perubahan
            </Button>
            <Link
              to="/hr/schedule"
              className="rounded-control border border-control-border px-4 py-3"
            >
              Kembali
            </Link>
          </div>
        </form>
        <Alert title="Perubahan global" tone="success">
          Semua karyawan memakai pengaturan ini. Jam kerja mengikuti zona waktu
          terpilih; riwayat absensi tetap tersimpan.
        </Alert>
      </div>
      {model.version !== draft.expectedVersion && (
        <Alert title="Versi server berubah" tone="warning">
          Form Anda tetap tersimpan.{' '}
          <Button
            variant="ghost"
            onClick={() => void refreshVersion()}
            disabled={locked}
          >
            Muat versi terbaru untuk ditinjau ulang
          </Button>
        </Alert>
      )}
      {preview.error && <QueryError error={preview.error} />}
      {command.error && (
        <Alert
          title={
            command.status === 'uncertain' || command.status === 'in-progress'
              ? 'Hasil penyimpanan belum pasti'
              : 'Perubahan belum disimpan'
          }
          tone="warning"
        >
          {command.error.problem?.detail ?? command.error.message}
          {command.error.requestId && (
            <p className="text-small">
              ID permintaan: {command.error.requestId}
            </p>
          )}
          {['uncertain', 'in-progress'].includes(command.status) ? (
            <div className="mt-3 flex flex-wrap gap-3">
              <Button onClick={() => void command.retry()}>
                Coba ulang penyimpanan yang sama
              </Button>
              <Link to="/hr/schedule" className="text-action underline">
                Periksa jadwal di server
              </Link>
            </div>
          ) : (
            <Button variant="ghost" onClick={() => void refreshVersion()}>
              Segarkan versi dan tinjau ulang
            </Button>
          )}
        </Alert>
      )}
      {command.status === 'confirmed' && (
        <Alert title="Jadwal tersimpan" tone="success">
          Perubahan telah dikonfirmasi server.{' '}
          <Link to="/hr/schedule" className="underline">
            Lihat jadwal
          </Link>
        </Alert>
      )}
      {preview.result && (
        <ScheduleImpactDialog
          key={preview.result.impact.impactToken ?? 'issues'}
          preview={preview.result}
          current={model.current}
          open={reviewOpen}
          busy={command.status === 'submitting'}
          commandError={command.error}
          uncertain={['uncertain', 'in-progress'].includes(command.status)}
          onRetry={() => void command.retry()}
          allowed={
            !['uncertain', 'in-progress', 'conflict'].includes(
              command.status,
            ) &&
            preview.isCurrent(draft) &&
            canApplySchedule(draft, preview.result)
          }
          onClose={() => setReviewOpen(false)}
          onConfirm={save}
        />
      )}
    </div>
  )
}
