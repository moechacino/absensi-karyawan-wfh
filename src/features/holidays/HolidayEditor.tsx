import type { Holiday, HolidayChange, HolidayChanged } from '../../shared/api/types'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useApi, useSession } from '../../shared/auth'
import { usePreview } from '../../shared/preview/usePreview'
import { useCommand } from '../../shared/commands/useCommand'
import { invalidateGroup } from '../../shared/query/invalidation'
import { getHolidayCalendar } from '../company/api'
import { holidayChanges, validateHolidayBatch } from './batchState'
import type { HolidayBatch, HolidayCalendar } from './batchState'
import { previewHolidayChange, changeHolidayCalendar } from './api'
import { HolidayMonth } from './HolidayMonth'
import { HolidayDateEditor } from './HolidayDateEditor'
import { HolidayImpactDialog } from './HolidayImpactDialog'
import { QueryError } from '../../shared/ui/QueryFeedback'
import { Alert } from '../../shared/ui/Feedback'
import { Dialog } from '../../shared/ui/Dialog'
import { Button } from '../../shared/ui/Button'

export function HolidayEditor({
  api,
  calendar,
  companyDate,
  onDirtyChange,
  onBlockedChange,
}: {
  api: ReturnType<typeof useApi>
  calendar: HolidayCalendar
  companyDate: string
  onDirtyChange: (dirty: boolean) => void
  onBlockedChange: (blocked: boolean) => void
}) {
  const client = useQueryClient()
  const { profile } = useSession()
  const [baseCalendar, setBaseCalendar] = useState(calendar)
  const [batch, setBatch] = useState<HolidayBatch>(() => ({
    year: calendar.year,
    expectedVersion: calendar.version,
    upsert: [],
    remove: [],
  }))
  const [activeDate, setActiveDate] = useState<string | null>(null)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [refreshError, setRefreshError] = useState<unknown>(null)
  const [savedCalendar, setSavedCalendar] = useState<HolidayCalendar | null>(
    null,
  )
  const conflictRefresh = useRef(false)
  const changes = useMemo(
    () => holidayChanges(batch, baseCalendar),
    [batch, baseCalendar],
  )
  const errors = useMemo(
    () => validateHolidayBatch(batch, baseCalendar, companyDate),
    [batch, baseCalendar, companyDate],
  )
  const signature = JSON.stringify(changes)
  const preview = usePreview({
    identity: profile?.id ?? null,
    execute: (input: HolidayChange, signal) =>
      previewHolidayChange(api, input, signal),
  })
  const invalidatePreview = preview.invalidate
  const currentPreview = preview.result
  const command = useCommand<
    HolidayChange,
    HolidayChanged
  >({
    identity: profile?.id ?? null,
    execute: (input, context) =>
      changeHolidayCalendar(
        api,
        input,
        context.idempotencyKey ?? '',
        context.signal,
      ),
    onConfirmed: async (result) => {
      client.setQueryData(
        ['private', profile?.id, 'holidays', result.calendar.year],
        result.calendar,
      )
      await invalidateGroup(client, profile!.id, 'configuration')
      setBaseCalendar(result.calendar)
      setBatch({
        year: result.calendar.year,
        expectedVersion: result.calendar.version,
        upsert: [],
        remove: [],
      })
      setActiveDate(null)
      setReviewOpen(false)
      setRefreshError(null)
      setSavedCalendar(result.calendar)
    },
  })
  const resetCommand = command.reset
  const status = command.status
  const commandBlocked = ['submitting', 'uncertain', 'in-progress'].includes(
    status,
  )

  useEffect(() => {
    if (status !== 'conflict' || conflictRefresh.current) return
    conflictRefresh.current = true
    void (async () => {
      const result = await client.fetchQuery({
        queryKey: ['private', profile?.id, 'holidays', batch.year],
        queryFn: ({ signal }) => getHolidayCalendar(api, batch.year, signal),
        staleTime: 0,
      })
      setBaseCalendar(result)
      setBatch((current) => ({ ...current, expectedVersion: result.version }))
      setRefreshError(null)
      invalidatePreview()
      resetCommand()
      conflictRefresh.current = false
    })().catch((failure: unknown) => {
      setRefreshError(failure)
      conflictRefresh.current = false
    })
  }, [
    status,
    client,
    profile?.id,
    batch.year,
    api,
    invalidatePreview,
    resetCommand,
  ])

  useEffect(() => {
    if (status === 'confirmed') resetCommand()
  }, [status, resetCommand])

  useEffect(() => {
    onDirtyChange(
      batch.upsert.length > 0 || batch.remove.length > 0 || commandBlocked,
    )
    onBlockedChange(commandBlocked)
  }, [batch, commandBlocked, onDirtyChange, onBlockedChange])
  const priorSignature = useRef(signature)
  useEffect(() => {
    if (priorSignature.current !== signature) {
      priorSignature.current = signature
      invalidatePreview()
      setReviewOpen(false)
    }
  }, [signature, invalidatePreview])

  const date = activeDate
  const selectedHoliday = date
    ? (batch.upsert.find((item) => item.date === date) ??
      baseCalendar.items.find((item) => item.date === date) ?? {
        date,
        name: '',
        category: 'COMPANY' as const,
      })
    : null
  const isRemoved = Boolean(date && batch.remove.includes(date))
  const effectiveHolidays = new Map(
    baseCalendar.items.map((item) => [item.date, item]),
  )
  for (const removed of batch.remove) effectiveHolidays.delete(removed)
  for (const item of batch.upsert) effectiveHolidays.set(item.date, item)
  const canPreview =
    !Object.keys(errors).length &&
    (changes.upsert.length > 0 || changes.remove.length > 0) &&
    !commandBlocked
  const previewIsCurrent = Boolean(currentPreview && preview.isCurrent(changes))
  const allowed = Boolean(
    previewIsCurrent &&
      currentPreview?.canApply &&
      !commandBlocked &&
      status !== 'conflict',
  )

  function saveInput(value: Holiday) {
    setSavedCalendar(null)
    setBatch((current) => ({
      ...current,
      upsert: [
        ...current.upsert.filter((item) => item.date !== value.date),
        value,
      ],
      remove: current.remove.filter((item) => item !== value.date),
    }))
  }
  function removeDate(value: string) {
    setSavedCalendar(null)
    setBatch((current) => ({
      ...current,
      upsert: current.upsert.filter((item) => item.date !== value),
      remove: baseCalendar.items.some((item) => item.date === value)
        ? [...new Set([...current.remove, value])]
        : current.remove.filter((item) => item !== value),
    }))
    setActiveDate(null)
  }
  function restoreDate(value: string) {
    setBatch((current) => ({
      ...current,
      upsert: current.upsert.filter((item) => item.date !== value),
      remove: current.remove.filter((item) => item !== value),
    }))
  }
  async function requestPreview() {
    if (!canPreview) return
    const result = await preview.run(changes)
    if (result) setReviewOpen(true)
  }
  function apply() {
    if (!allowed) return
    const input: HolidayChange = {
      ...changes,
    }
    void command.run(input)
  }

  return (
    <div className="space-y-5">
      <p className="text-small text-text-muted">
        Pilih tanggal pada kalender, isi nama hari libur, lalu simpan tanggal.
        Setelah semua tanggal siap, pilih Tinjau perubahan kalender dan Simpan kalender
        untuk menyimpannya ke server. Tanggal yang sudah berlalu tidak dapat diubah.
      </p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-small text-text-muted">
            {effectiveHolidays.size} tanggal hari libur pada {calendar.year}
          </p>
          {(batch.upsert.length > 0 || batch.remove.length > 0) && (
            <p role="status" className="mt-1 text-small text-warning">
              Batch belum disimpan: {changes.upsert.length} ditambah/diubah ·{' '}
              {changes.remove.length} dihapus
            </p>
          )}
        </div>
        <Button
          disabled={!canPreview}
          busy={preview.status === 'loading'}
          onClick={() => void requestPreview()}
        >
          Tinjau perubahan kalender
        </Button>
      </div>
      {savedCalendar && (
        <Alert title="Kalender berhasil diperbarui" tone="success">
          Perubahan tahun {savedCalendar.year} telah dikonfirmasi oleh server.
        </Alert>
      )}
      {Object.keys(errors).length > 0 && (errors.batch || errors.version) && (
        <Alert title="Batch belum siap ditinjau" tone="warning">
          {errors.batch ?? errors.version}
        </Alert>
      )}
      {preview.status === 'error' && (
        <QueryError error={preview.error} retry={() => void requestPreview()} />
      )}
      {refreshError !== null && (
        <QueryError
          error={refreshError}
          retry={() =>
            void client.refetchQueries({
              queryKey: ['private', profile?.id, 'holidays', batch.year],
            })
          }
        />
      )}
      {status === 'conflict' && !refreshError && (
        <Alert title="Kalender perusahaan berubah" tone="warning">
          Perubahan lokal tetap tersimpan. Periksa versi terbaru dan lakukan
          peninjauan ulang.
        </Alert>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {Array.from({ length: 12 }, (_, month) => (
          <HolidayMonth
            key={month}
            year={calendar.year}
            month={month}
            companyDate={companyDate}
            holidays={[...effectiveHolidays.values()]}
            removed={batch.remove}
            locked={commandBlocked}
            onSelect={setActiveDate}
          />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3 text-small text-text-muted">
        <span
          className="inline-block size-4 rounded-sm bg-forest"
          aria-hidden="true"
        />
        Hari libur tersimpan atau ditambahkan
        <span
          className="ml-3 inline-block size-4 rounded-sm border border-action"
          aria-hidden="true"
        />
        Hari ini menurut zona waktu perusahaan
        {batch.remove.length > 0 && (
          <span className="ml-3 text-danger">
            Tanggal dicoret akan dihapus setelah disimpan.
          </span>
        )}
      </div>
      {date && selectedHoliday && (
        <Dialog
          open={Boolean(date && selectedHoliday)}
          title={
            isRemoved
              ? 'Hari libur akan dihapus'
              : selectedHoliday.name
                ? 'Edit hari libur'
                : 'Tandai hari libur'
          }
          onClose={() => setActiveDate(null)}
          busy={commandBlocked}
        >
          <HolidayDateEditor
            value={selectedHoliday}
            year={calendar.year}
            companyDate={companyDate}
            isExisting={
              baseCalendar.items.some((item) => item.date === date) ||
              batch.upsert.some((item) => item.date === date)
            }
            isRemoved={isRemoved}
            locked={commandBlocked}
            onSave={saveInput}
            onRemove={removeDate}
            onRestore={restoreDate}
            onClose={() => setActiveDate(null)}
          />
        </Dialog>
      )}
      {currentPreview && (
        <HolidayImpactDialog
          impact={currentPreview}
          changes={changes}
          open={reviewOpen}
          busy={status === 'submitting'}
          allowed={allowed}
          commandError={command.error}
          uncertain={status === 'uncertain' || status === 'in-progress'}
          onClose={() => {
            if (!commandBlocked) setReviewOpen(false)
          }}
          onConfirm={apply}
          onRetry={() => {
            void command.retry()
          }}
        />
      )}
    </div>
  )
}
