import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router'
import { useApi, useSession } from '../../shared/auth'
import { useHome } from '../home/api'
import { getHolidayCalendar } from '../company/api'
import { QueryError } from '../../shared/ui/QueryFeedback'
import { TextField } from '../../shared/forms/TextField'
import { HolidayEditor } from './HolidayEditor'
import { ConfirmationDialog } from '../../shared/ui/Dialog'
import { LoadingState, EmptyState, Alert } from '../../shared/ui/Feedback'

function validYear(value: number) {
  return Number.isInteger(value) && value >= 1970 && value <= 9999
}

export default function HrHolidayCalendarPage() {
  const api = useApi()
  const { profile } = useSession()
  const home = useHome()
  const [params, setParams] = useSearchParams()
  const today = home.data?.companyDate
  const defaultYear = today ? Number(today.slice(0, 4)) : undefined
  const yearParam = params.get('year')
  const year = yearParam === null ? defaultYear : Number(yearParam)
  const [yearDraft, setYearDraft] = useState('')
  const [dirty, setDirty] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [pendingYear, setPendingYear] = useState<number | null>(null)

  const yearInput =
    pendingYear !== null
      ? String(pendingYear)
      : yearDraft || (year === undefined ? '' : String(year))
  const valid = year !== undefined && validYear(year)
  const calendar = useQuery({
    queryKey: ['private', profile?.id, 'holidays', year],
    queryFn: ({ signal }) => getHolidayCalendar(api, year!, signal),
    enabled: valid && Boolean(profile),
  })
  function selectYear(value: number) {
    setYearDraft('')
    setParams((old) => {
      const next = new URLSearchParams(old)
      next.set('year', String(value))
      return next
    })
    setPendingYear(null)
  }
  function changeYearText(raw: string) {
    setYearDraft(raw)
    if (!raw.trim()) return
    const next = Number(raw)
    if (!validYear(next) || next === year) return
    if (blocked) {
      setYearDraft('')
      return
    }
    if (next === year) {
      setYearDraft('')
      return
    }
    if (dirty) setPendingYear(next)
    else selectYear(next)
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-heading font-medium">Hari libur perusahaan</h1>
          <p className="mt-2 text-text-muted">
            Tandai tanggal libur tanpa mengubah catatan kehadiran.
          </p>
        </div>
        {valid && (
          <p className="rounded-control bg-surface px-3 py-2 text-small text-text-muted">
            {calendar.data?.items.length ?? 0} tanggal libur pada {year}
          </p>
        )}
      </header>
      {!today && home.isPending ? (
        <LoadingState label="Memuat tanggal perusahaan…" />
      ) : !today && home.isError ? (
        <QueryError error={home.error} retry={() => void home.refetch()} />
      ) : (
        <>
          <div className="max-w-xs">
            <TextField
              label="Tahun kalender"
              type="number"
              min={1970}
              max={9999}
              value={yearInput}
              onChange={(event) => changeYearText(event.target.value)}
              error={
                yearInput && !validYear(Number(yearInput))
                  ? 'Masukkan tahun 1970–9999.'
                  : undefined
              }
              hint="Hari ini mengikuti tanggal perusahaan."
            />
          </div>
          {blocked && (
            <Alert title="Perubahan belum selesai" tone="warning">
              Selesaikan atau ulangi penyimpanan kalender sebelum berpindah
              tahun.
            </Alert>
          )}
          {!valid ? (
            <p role="status">Pilih tahun kalender yang valid.</p>
          ) : calendar.isPending ? (
            <LoadingState />
          ) : calendar.isError ? (
            <QueryError
              error={calendar.error}
              retry={() => void calendar.refetch()}
            />
          ) : !calendar.data ? (
            <EmptyState title="Kalender belum tersedia">
              Coba muat kembali kalender perusahaan.
            </EmptyState>
          ) : (
            <HolidayEditor
              key={`${profile?.id}-${year}`}
              api={api}
              calendar={calendar.data}
              companyDate={today!}
              onDirtyChange={setDirty}
              onBlockedChange={setBlocked}
            />
          )}
        </>
      )}
      <ConfirmationDialog
        open={pendingYear !== null}
        title="Buang perubahan tahun ini?"
        description={`Batch ${year} belum disimpan. Berpindah tahun akan membuang perubahan lokal tersebut.`}
        onClose={() => {
          setPendingYear(null)
          setYearDraft('')
        }}
        confirmLabel="Buang dan pindah tahun"
        danger
        onConfirm={() => {
          if (pendingYear !== null && !blocked) selectYear(pendingYear)
        }}
        confirmDisabled={blocked}
      >
        <p>
          Kalender server belum berubah sampai Anda meninjau dan menyimpan
          batch.
        </p>
      </ConfirmationDialog>
    </div>
  )
}
