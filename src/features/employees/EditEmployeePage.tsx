import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi, useSession } from '../../shared/auth'
import { useCommand } from '../../shared/commands/useCommand'
import { invalidateGroup } from '../../shared/query/invalidation'
import { isApiError } from '../../shared/api/problem'
import type { ApiError } from '../../shared/api/problem'
import { employeeEditApi } from './editApi'
import { employeesApi } from './api'
import { employeeDraft, validateEmployee } from './model'
import type { Employee, EmployeeDraft, EmployeeErrors } from './model'
import { employeePatch, validatePhoto } from './editModel'
import { EmployeeFields } from './EmployeeFields'
import { EmployeePhotoField } from './EmployeePhotoField'
import { CommandFeedback } from '../organization/CommandFeedback'
import { Alert, LoadingState } from '../../shared/ui/Feedback'
import { QueryError } from '../../shared/ui/QueryFeedback'
import { Button } from '../../shared/ui/Button'

export default function EditEmployeePage() {
  const { employeeId = '' } = useParams()
  const { profile } = useSession()
  const api = useApi()
  const query = useQuery({
    queryKey: ['private', profile?.id, 'employees', 'detail', employeeId],
    queryFn: ({ signal }) => employeesApi(api).detail(employeeId, signal),
    enabled: Boolean(profile && employeeId),
  })
  if (query.isPending) return <LoadingState />
  if (query.isError)
    return <QueryError error={query.error} retry={() => void query.refetch()} />
  return (
    <EmployeeEditor key={`${profile?.id}:${employeeId}`} initial={query.data} />
  )
}

function EmployeeEditor({ initial }: { initial: Employee }) {
  const api = useApi(),
    session = useSession(),
    cache = useQueryClient()
  const [base, setBase] = useState(initial)
  const [draft, setDraft] = useState<EmployeeDraft>(() =>
    employeeDraft(initial),
  )
  const [photo, setPhoto] = useState<File | null>(null)
  const [errors, setErrors] = useState<EmployeeErrors>({})
  const [notice, setNotice] = useState('')
  const [reviewedVersion, setReviewedVersion] = useState<number | null>(
    initial.version,
  )
  const latestQuery = useQuery({
    queryKey: [
      'private',
      session.profile?.id,
      'employees',
      'detail',
      initial.id,
      'conflict-review',
    ],
    queryFn: ({ signal }) => employeesApi(api).detail(initial.id, signal),
    enabled: false,
  })
  const dirty =
    Boolean(photo) ||
    draft.fullName !== base.fullName ||
    draft.email !== base.email ||
    draft.divisionId !== base.division.id ||
    draft.positionId !== base.position.id ||
    draft.status !== base.status
  const command = useCommand({
    identity: session.profile?.id ?? null,
    execute: (
      body: ReturnType<typeof employeePatch>,
      { signal, idempotencyKey },
    ) =>
      employeeEditApi(api).profile(base.id, body, idempotencyKey ?? '', signal),
    onConfirmed: async (result) => {
      setBase(result)
      setDraft(employeeDraft(result))
      setPhoto(null)
      setErrors({})
      setNotice(
        'Perubahan profil dan foto tersimpan. Peran dikelola lewat tindakan terpisah.',
      )
      cache.setQueryData(
        ['private', session.profile?.id, 'employees', 'detail', result.id],
        result,
      )
      if (session.profile)
        await invalidateGroup(cache, session.profile.id, 'employees')
      if (session.profile?.id === result.id) {
        if (result.status !== 'ACTIVE') session.clearSession()
        else await session.refreshProfile()
      }
    },
  })
  async function reviewLatest() {
    const latest = await latestQuery.refetch()
    if (!latest.data) return
    setBase(latest.data)
    setReviewedVersion(latest.data.version)
    command.reset()
    setNotice(
      `Versi ${latest.data.version} dimuat. Isian lokal dipertahankan; bandingkan data server sebelum menyimpan ulang.`,
    )
  }
  function change(patch: Partial<EmployeeDraft>) {
    setDraft((current) => ({ ...current, ...patch }))
    if ('divisionId' in patch && patch.divisionId !== draft.divisionId) {
      setDraft((current) => ({ ...current, ...patch, positionId: '' }))
      setErrors((current) => ({
        ...current,
        positionId: 'Pilih kembali posisi aktif dari divisi baru.',
      }))
    }
    setNotice('')
    if (
      command.status !== 'submitting' &&
      command.status !== 'uncertain' &&
      command.status !== 'in-progress'
    )
      command.reset()
  }
  function save() {
    const nextErrors = validateEmployee(draft)
    if (draft.role !== base.role) nextErrors.role = 'Peran disimpan terpisah.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length || !dirty) return
    if (reviewedVersion !== base.version) {
      setNotice('Tinjau versi server terbaru sebelum menyimpan.')
      return
    }
    const body = employeePatch(base, draft, photo)
    void command.run(body)
  }
  const locked = ['submitting', 'uncertain', 'in-progress'].includes(
    command.status,
  )
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        className="text-action underline"
        to={`/hr/employees/${encodeURIComponent(base.id)}`}
      >
        Kembali ke detail karyawan
      </Link>
      <header>
        <p className="font-mono text-small text-text-muted">
          {base.employeeCode} · Versi {base.version}
        </p>
        <h1 className="mt-2 text-heading font-medium">Edit profil karyawan</h1>
        <p className="mt-2 text-small text-text-muted">
          Perubahan profil/foto dan perubahan peran disimpan sebagai tindakan
          terpisah.
        </p>
      </header>
      {notice && (
        <Alert title="Tinjau perubahan" tone="warning">
          {notice}
        </Alert>
      )}
      {command.error && (
        <CommandFeedback
          status={command.status}
          error={command.error}
          onRetry={() => void command.retry()}
        />
      )}
      {command.status === 'conflict' &&
        command.error?.problem?.code === 'VERSION_CONFLICT' && (
          <Button
            variant="secondary"
            busy={latestQuery.isFetching}
            onClick={() => void reviewLatest()}
          >
            Muat versi terbaru sambil mempertahankan isian
          </Button>
        )}
      {command.refreshError && (
        <Alert
          title="Profil tersimpan; penyegaran belum selesai"
          tone="warning"
        >
          Perubahan dikonfirmasi server. Perbarui halaman atau daftar sebelum
          tindakan lain.
        </Alert>
      )}
      <EmployeeFields
        draft={draft}
        onChange={change}
        errors={errors}
        disabled={locked}
        existing={base}
        includeRole={false}
      />
      {draft.role !== base.role && (
        <Alert title="Peran memakai tindakan terpisah">
          Simpan profil ini tanpa peran, lalu kembali ke detail untuk mengubah
          akses.
        </Alert>
      )}
      <EmployeePhotoField
        employee={base}
        file={photo}
        onChange={(file) => {
          setPhoto(file)
          setNotice('')
          if (command.status === 'conflict') command.reset()
        }}
        disabled={locked}
        error={validatePhoto(photo)}
      />
      {isApiError(command.error) && command.error.status === 422 && (
        <FieldErrors error={command.error} />
      )}
      <div className="flex flex-wrap justify-end gap-3">
        <Link
          className="inline-flex min-h-13 items-center rounded-control border border-control-border px-5"
          to={`/hr/employees/${encodeURIComponent(base.id)}`}
        >
          Batal
        </Link>
        <Button
          busy={command.status === 'submitting'}
          disabled={!dirty || locked || reviewedVersion !== base.version}
          onClick={save}
        >
          Simpan profil
        </Button>
      </div>
    </div>
  )
}
function FieldErrors({ error }: { error: ApiError }) {
  const errors = error.problem?.errors ?? []
  return errors.length ? (
    <Alert title="Periksa kolom yang ditandai" tone="danger">
      <ul className="list-disc pl-5">
        {errors.map((item, index) => (
          <li key={`${item.field}-${index}`}>
            {item.field}: {item.message}
          </li>
        ))}
      </ul>
    </Alert>
  ) : null
}
