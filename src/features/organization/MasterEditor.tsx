import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useApi, useSession } from '../../shared/auth'
import { useCommand } from '../../shared/commands/useCommand'
import { TextField, TextAreaField } from '../../shared/forms/TextField'
import { SelectField } from '../../shared/forms/SelectField'
import { Button } from '../../shared/ui/Button'
import { Dialog } from '../../shared/ui/Dialog'
import { Alert } from '../../shared/ui/Feedback'
import { CommandFeedback } from './CommandFeedback'
import { organizationApi, latestMaster } from './api'
import { draftFor, masterCreate, validateMaster } from './model'
import type { Master, MasterDraft, MasterErrors, MasterKind } from './model'
import { OrganizationFields } from './OrganizationFields'

type SaveInput = { draft: MasterDraft; version?: number }

export function MasterEditor({
  kind,
  original,
  onClose,
}: {
  kind: MasterKind
  original?: Master
  onClose: () => void
}) {
  const api = useApi()
  const { profile } = useSession()
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState(() => draftFor(original))
  const [version, setVersion] = useState(original?.version)
  const [errors, setErrors] = useState<MasterErrors>({})
  const [reviewMessage, setReviewMessage] = useState('')
  const [reviewing, setReviewing] = useState(false)
  const services = organizationApi(api)
  const command = useCommand<SaveInput, Master>({
    identity: profile?.id ?? null,
    idempotent: !original,
    execute: ({ draft: snapshot, version: expectedVersion }, context) => {
      if (!original)
        return kind === 'divisions'
          ? services.createDivision(
              masterCreate('divisions', snapshot),
              context.idempotencyKey!,
              context.signal,
            )
          : services.createPosition(
              masterCreate('positions', snapshot),
              context.idempotencyKey!,
              context.signal,
            )
      return kind === 'divisions'
        ? services.updateDivision(
            original.id,
            {
              ...masterCreate('divisions', snapshot),
              expectedVersion: expectedVersion!,
            },
            context.signal,
          )
        : services.updatePosition(
            original.id,
            {
              ...masterCreate('positions', snapshot),
              expectedVersion: expectedVersion!,
            },
            context.signal,
          )
    },
    onConfirmed: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['private', profile?.id, 'organization'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['private', profile?.id, 'employees'],
        }),
      ])
      onClose()
    },
  })
  const busy = command.status === 'submitting'
  const locked =
    busy || command.status === 'uncertain' || command.status === 'in-progress'
  const conflict = command.status === 'conflict'
  function update(patch: Partial<MasterDraft>) {
    setDraft((current) => ({ ...current, ...patch }))
    setErrors({})
    if (!conflict) command.reset()
  }
  async function reviewLatest() {
    if (!original) return
    setReviewing(true)
    try {
      const latest = await latestMaster(api, kind, original.id, original.code)
      if (!latest) {
        setReviewMessage(
          'Data tidak ditemukan. Tutup editor dan muat ulang daftar.',
        )
        return
      }
      setVersion(latest.version)
      setReviewMessage(
        `Versi server ${latest.version}: ${latest.code} · ${latest.name} · ${latest.status === 'ACTIVE' ? 'Aktif' : 'Nonaktif'}. Draft Anda tetap dipertahankan; periksa sebelum menyimpan ulang.`,
      )
      command.reset()
    } catch {
      setReviewMessage(
        'Versi terbaru belum dapat dimuat. Coba lagi sebelum menyimpan.',
      )
    } finally {
      setReviewing(false)
    }
  }
  return (
    <Dialog
      open
      title={`${original ? 'Edit' : 'Tambah'} ${kind === 'divisions' ? 'divisi' : 'posisi'}`}
      onClose={onClose}
      busy={locked}
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          const validation = validateMaster(kind, draft)
          setErrors(validation)
          if (!Object.keys(validation).length && !conflict)
            void command.run({ draft, version })
        }}
      >
        <TextField
          label="Kode"
          value={draft.code}
          maxLength={40}
          required
          disabled={locked}
          error={errors.code}
          onChange={(event) => update({ code: event.target.value })}
        />
        <TextField
          label="Nama"
          value={draft.name}
          maxLength={160}
          required
          disabled={locked}
          error={errors.name}
          onChange={(event) => update({ name: event.target.value })}
        />
        {kind === 'divisions' ? (
          <TextAreaField
            label="Deskripsi (opsional)"
            value={draft.description}
            maxLength={1000}
            disabled={locked}
            error={errors.description}
            onChange={(event) => update({ description: event.target.value })}
          />
        ) : (
          <OrganizationFields
            divisionOnly
            divisionId={draft.divisionId}
            onChange={update}
            existingDivision={
              original && 'division' in original ? original.division : undefined
            }
            disabled={locked}
            errors={errors}
          />
        )}
        <SelectField
          label="Status"
          value={draft.status}
          disabled={locked}
          options={[
            { value: 'ACTIVE', label: 'Aktif' },
            { value: 'INACTIVE', label: 'Nonaktif' },
          ]}
          onChange={(status) =>
            update({ status: status as MasterDraft['status'] })
          }
        />
        {draft.status === 'INACTIVE' && (
          <Alert title="Referensi tetap dipertahankan" tone="warning">
            Penonaktifan tidak menghapus data karyawan atau riwayat. Penetapan
            baru memerlukan divisi dan posisi aktif yang sesuai.
          </Alert>
        )}
        <CommandFeedback
          status={command.status}
          error={command.error}
          onRetry={() => void command.retry()}
        />
        {command.error?.problem?.errors && (
          <ul role="alert" className="text-small text-danger">
            {command.error.problem.errors.map((error) => (
              <li key={error.field}>
                {error.field}: {error.message}
              </li>
            ))}
          </ul>
        )}
        {conflict && original && (
          <Button
            busy={reviewing}
            variant="secondary"
            onClick={() => void reviewLatest()}
          >
            Tinjau versi server terbaru
          </Button>
        )}
        {reviewMessage && (
          <Alert title="Tinjauan data server">{reviewMessage}</Alert>
        )}
        <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-4">
          <Button variant="secondary" disabled={locked} onClick={onClose}>
            Batalkan
          </Button>
          <Button type="submit" busy={busy} disabled={locked || conflict}>
            Simpan {kind === 'divisions' ? 'divisi' : 'posisi'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
