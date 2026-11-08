import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useApi, useSession } from '../../shared/auth'
import { useCommand } from '../../shared/commands/useCommand'
import type { JsonBody, JsonResult } from '../../shared/api/types'
import { Button } from '../../shared/ui/Button'
import { Alert } from '../../shared/ui/Feedback'
import { ConfirmationDialog } from '../../shared/ui/Dialog'
import { CommandFeedback } from '../organization/CommandFeedback'
import { EmployeeFields } from './EmployeeFields'
import { InitialCredentialsPanel } from './InitialCredentialsPanel'
import { employeesApi } from './api'
import {
  creationPayload,
  createdEmployeeId,
  employeeDraft,
  validateEmployee,
} from './model'
import type {
  EmployeeDraft,
  EmployeeErrors,
  Employee,
  Credentials,
} from './model'

export default function CreateEmployeePage() {
  const { profile } = useSession()
  return <CreateEmployeeForm key={profile?.id ?? 'anonymous'} />
}

function CreateEmployeeForm() {
  const api = useApi(),
    { profile } = useSession(),
    queryClient = useQueryClient()
  const [search] = useSearchParams()
  const listSuffix = search.size ? `?${search}` : ''
  const [draft, setDraft] = useState(employeeDraft)
  const [errors, setErrors] = useState<EmployeeErrors>({})
  const [confirmHr, setConfirmHr] = useState(false)
  const [receipt, setReceipt] = useState<{
    employee: Employee
    initialCredentials: Credentials | null
  } | null>(null)
  const command = useCommand<
    JsonBody<'createEmployee'>,
    JsonResult<'createEmployee'>
  >({
    identity: profile?.id ?? null,
    execute: (input, context) =>
      employeesApi(api).create(input, context.idempotencyKey!, context.signal),
    onConfirmed: async (result) => {
      setReceipt(result)
      await queryClient.invalidateQueries({
        queryKey: ['private', profile?.id, 'employees'],
      })
    },
  })
  const busy = command.status === 'submitting'
  const locked =
    busy || command.status === 'uncertain' || command.status === 'in-progress'
  const alreadyCreated = createdEmployeeId(command.error)
  function update(patch: Partial<EmployeeDraft>) {
    setDraft((current) => ({ ...current, ...patch }))
    setErrors({})
    command.reset()
  }
  function submit(confirmed: boolean) {
    const validation = validateEmployee(draft)
    setErrors(validation)
    if (Object.keys(validation).length) return
    if (draft.role === 'HRD' && !confirmed) {
      setConfirmHr(true)
      return
    }
    setConfirmHr(false)
    void command.run(creationPayload(draft, confirmed))
  }
  if (receipt)
    return (
      <div className="space-y-6">
        <h1 className="text-heading font-medium">Akun karyawan dibuat</h1>
        <Alert
          title={`${receipt.employee.fullName} · ${receipt.employee.employeeCode}`}
          tone="success"
        >
          Akun telah dikonfirmasi server. Bagikan akses hanya kepada pemilik
          akun.
        </Alert>
        {receipt.initialCredentials ? (
          <InitialCredentialsPanel
            credentials={receipt.initialCredentials}
            onClose={() => {
              setReceipt(
                (current) =>
                  current && { ...current, initialCredentials: null },
              )
              command.reset()
            }}
          />
        ) : (
          <Alert title="Panel kredensial ditutup">
            Akun tetap sudah dibuat. Lanjutkan ke detail karyawan; jangan
            membuat akun yang sama lagi.
          </Alert>
        )}
        <Link
          className="inline-block underline underline-offset-4"
          to={`/hr/employees/${receipt.employee.id}${listSuffix}`}
        >
          Selesai dan lihat karyawan
        </Link>
      </div>
    )
  if (alreadyCreated)
    return (
      <div className="space-y-5">
        <h1 className="text-heading font-medium">Akun sudah dibuat</h1>
        <Alert title="Kredensial awal tidak tersedia" tone="warning">
          Pemilik sudah mengubah kata sandi. Jangan membuat ulang akun atau
          meminta password baru.
        </Alert>
        <Link
          className="underline underline-offset-4"
          to={`/hr/employees/${encodeURIComponent(alreadyCreated)}${listSuffix}`}
        >
          Lihat karyawan yang dibuat
        </Link>
      </div>
    )
  return (
    <div className="max-w-3xl space-y-6">
      <Link
        className="underline underline-offset-4"
        to={`/hr/employees${listSuffix}`}
      >
        Kembali ke karyawan
      </Link>
      <header>
        <h1 className="text-heading font-medium">Tambah karyawan</h1>
        <p className="mt-2 text-text-muted">
          Kode karyawan dan kata sandi awal dibuat oleh sistem setelah akun
          disimpan.
        </p>
      </header>
      <form
        className="space-y-5 rounded-panel border border-border bg-surface p-5 sm:p-6"
        onSubmit={(event) => {
          event.preventDefault()
          submit(false)
        }}
      >
        <EmployeeFields
          draft={draft}
          onChange={update}
          errors={errors}
          disabled={locked}
        />
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
        {command.status === 'conflict' && (
          <Alert title="Tinjau data sebelum mencoba lagi" tone="warning">
            Perbaiki data yang ditolak server. Tidak ada akun baru yang dibuat
            oleh tampilan ini tanpa konfirmasi server.
          </Alert>
        )}
        <Button type="submit" busy={busy} disabled={locked}>
          Simpan karyawan
        </Button>
      </form>
      <ConfirmationDialog
        open={confirmHr}
        title="Buat akun dengan akses HRD?"
        onClose={() => setConfirmHr(false)}
        onConfirm={() => submit(true)}
        confirmLabel="Konfirmasi akses HRD"
      >
        HRD dapat mengelola karyawan, organisasi, kalender, jadwal, dan melihat
        absensi. Pastikan peran ini diberikan kepada orang yang tepat. Kata
        sandi awal tetap dibuat server.
      </ConfirmationDialog>
    </div>
  )
}
