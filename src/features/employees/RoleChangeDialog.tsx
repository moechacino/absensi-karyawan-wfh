import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useApi, useSession } from '../../shared/auth'
import { useCommand } from '../../shared/commands/useCommand'
import { SelectField } from '../../shared/forms/SelectField'
import { Button } from '../../shared/ui/Button'
import { Dialog } from '../../shared/ui/Dialog'
import { Alert } from '../../shared/ui/Feedback'
import { CommandFeedback } from '../organization/CommandFeedback'
import { employeesApi } from './api'
import { employeeEditApi } from './editApi'
import { invalidateGroup } from '../../shared/query/invalidation'
import { invalidatesOwnSession, rolePayload } from './editModel'
import type { Employee } from './model'
import type { JsonBody } from '../../shared/api/types'

export function RoleChangeDialog({
  employee,
  open,
  onClose,
  onSaved,
}: {
  employee: Employee
  open: boolean
  onClose: () => void
  onSaved: (employee: Employee) => void
}) {
  const api = useApi(),
    session = useSession(),
    cache = useQueryClient()
  const [base, setBase] = useState(employee)
  const [role, setRole] = useState(employee.role)
  const [confirmed, setConfirmed] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [reviewNotice, setReviewNotice] = useState('')
  const command = useCommand<JsonBody<'changeEmployeeRole'>, Employee>({
    identity: session.profile?.id ?? null,
    idempotent: false,
    execute: (body, { signal }) =>
      employeeEditApi(api).role(employee.id, body, signal),
    onConfirmed: async (result) => {
      onSaved(result)
      if (
        session.profile &&
        invalidatesOwnSession(session.profile.id, base, result)
      ) {
        session.clearSession()
        return
      }
      if (session.profile) {
        await invalidateGroup(cache, session.profile.id, 'employees')
        await invalidateGroup(cache, session.profile.id, 'permissions')
      }
      onClose()
    },
  })
  const busy = command.status === 'submitting'
  const locked =
    busy || command.status === 'uncertain' || command.status === 'in-progress'
  const conflict = command.status === 'conflict'
  async function review() {
    setReviewing(true)
    try {
      const latest = await employeesApi(api).detail(employee.id)
      setBase(latest)
      setConfirmed(false)
      command.reset()
      setReviewNotice(
        `Versi ${latest.version}: peran server ${latest.role}. Pilihan Anda tetap ${role}; tinjau dan konfirmasi lagi.`,
      )
    } catch {
      setReviewNotice(
        'Versi terbaru belum dapat dimuat. Perubahan belum dikirim ulang.',
      )
    } finally {
      setReviewing(false)
    }
  }
  return (
    <Dialog open={open} title="Ubah akses akun" onClose={onClose} busy={locked}>
      <div className="space-y-4">
        <p>
          Perubahan peran disimpan terpisah dari profil dan foto. Kata sandi
          tidak berubah.
        </p>
        <SelectField
          label="Peran baru"
          value={role}
          disabled={locked}
          options={[
            { value: 'EMPLOYEE', label: 'Karyawan' },
            { value: 'HRD', label: 'HRD' },
          ]}
          onChange={(value) => {
            setRole(value as Employee['role'])
            setConfirmed(false)
            if (!conflict) command.reset()
          }}
        />
        <Alert title="Tinjau dampak akses" tone="warning">
          {role === 'HRD'
            ? 'Akun mendapat kewenangan mengelola karyawan, organisasi, kalender dan jadwal serta melihat absensi.'
            : 'Akun kehilangan kewenangan HRD. Jika ini akun Anda, sesi saat ini akan diakhiri setelah server mengonfirmasi.'}{' '}
          Sesi ini akan berakhir setelah server mengonfirmasi perubahan. Sesi
          lain dapat tetap aktif sampai tokennya kedaluwarsa.
        </Alert>
        <label className="flex min-h-touch items-center gap-3">
          <input
            className="size-5 accent-action"
            type="checkbox"
            disabled={locked}
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
          />
          Saya memahami dan menyetujui perubahan akses ini.
        </label>
        <CommandFeedback
          status={command.status}
          error={command.error}
          onRetry={() => void command.retry()}
        />

        {conflict && (
          <Button
            busy={reviewing}
            variant="secondary"
            onClick={() => void review()}
          >
            Tinjau versi terbaru untuk peran
          </Button>
        )}
        {reviewNotice && (
          <Alert title="Tinjauan akses server">{reviewNotice}</Alert>
        )}
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="secondary" disabled={locked} onClick={onClose}>
            Batalkan
          </Button>
          <Button
            busy={busy}
            disabled={locked || conflict || !confirmed || role === base.role}
            onClick={() =>
              void command.run(rolePayload(role, base.version, confirmed))
            }
          >
            Simpan peran terpisah
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
