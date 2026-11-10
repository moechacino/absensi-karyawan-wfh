import { useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi, useSession } from '../../shared/auth'
import { isApiError } from '../../shared/api/problem'
import { Button } from '../../shared/ui/Button'
import {
  Alert,
  Badge,
  ErrorState,
  LoadingState,
} from '../../shared/ui/Feedback'
import { PrivateImage } from '../files/PrivateImage'
import { employeesApi } from './api'
import type { Credentials, Employee } from './model'
import { InitialCredentialsPanel } from './InitialCredentialsPanel'
import { RoleChangeDialog } from './RoleChangeDialog'

export default function EmployeeDetailPage() {
  const { employeeId = '' } = useParams()
  const { profile } = useSession()
  return <EmployeeRecord key={`${profile?.id}:${employeeId}`} id={employeeId} />
}

function EmployeeRecord({ id }: { id: string }) {
  const [roleOpen, setRoleOpen] = useState(false)
  const api = useApi(),
    { profile } = useSession()
  const [search] = useSearchParams()
  const query = useQuery({
    queryKey: ['private', profile?.id, 'employees', 'detail', id],
    queryFn: ({ signal }) => employeesApi(api).detail(id, signal),
    enabled: Boolean(profile && id),
  })
  if (query.isPending) return <LoadingState />
  if (query.isError)
    return (
      <ErrorState
        title={
          isApiError(query.error) && query.error.status === 404
            ? 'Karyawan tidak ditemukan'
            : 'Data karyawan belum dimuat'
        }
        onRetry={() => void query.refetch()}
      />
    )
  const employee = query.data
  return (
    <div className="space-y-6">
      <Link
        className="underline underline-offset-4"
        to={`/hr/employees${search.size ? `?${search}` : ''}`}
      >
        Kembali ke daftar karyawan
      </Link>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-heading font-medium">{employee.fullName}</h1>
          <p className="mt-2 font-mono text-small text-text-muted">
            ID akun · {employee.id}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            className="inline-flex min-h-13 items-center rounded-control bg-action px-5 py-3 text-on-action"
            to={`/hr/employees/${encodeURIComponent(employee.id)}/edit${search.size ? `?${search}` : ''}`}
          >
            Edit karyawan
          </Link>
          <Button variant="secondary" onClick={() => setRoleOpen(true)}>
            Ubah peran
          </Button>
        </div>
      </header>
      <section className="flex flex-col gap-6 rounded-panel border border-border bg-surface p-5 sm:flex-row sm:p-6">
        <PrivateImage
          file={employee.photo ?? null}
          alt={employee.fullName}
          className="size-28 rounded-card object-cover"
        />
        <dl className="grid min-w-0 flex-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-label text-text-muted">Email kantor</dt>
            <dd className="break-all">{employee.email}</dd>
          </div>
          <div>
            <dt className="text-label text-text-muted">Divisi</dt>
            <dd>
              {employee.division.name} · {employee.division.code}
            </dd>
          </div>
          <div>
            <dt className="text-label text-text-muted">Posisi</dt>
            <dd>
              {employee.position.name} · {employee.position.code}
            </dd>
          </div>
          <div>
            <dt className="text-label text-text-muted">Peran</dt>
            <dd>{employee.role === 'HRD' ? 'HRD' : 'Karyawan'}</dd>
          </div>
          <div>
            <dt className="text-label text-text-muted">Status</dt>
            <dd>
              <Badge
                tone={employee.status === 'ACTIVE' ? 'success' : 'neutral'}
              >
                {employee.status === 'ACTIVE' ? 'Aktif' : 'Nonaktif'}
              </Badge>
            </dd>
          </div>
        </dl>
      </section>
      <CredentialAccess
        key={`${employee.id}:${employee.hasPasswordChanged}`}
        employee={employee}
      />
      {roleOpen && (
        <RoleChangeLauncher
          employee={employee}
          identity={profile?.id}
          onClose={() => setRoleOpen(false)}
        />
      )}
    </div>
  )
}

function RoleChangeLauncher({
  employee,
  identity,
  onClose,
}: {
  employee: Employee
  identity?: string
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  return (
    <RoleChangeDialog
      key={employee.id}
      employee={employee}
      open
      onClose={onClose}
      onSaved={(updated) =>
        queryClient.setQueryData(
          ['private', identity, 'employees', 'detail', updated.id],
          updated,
        )
      }
    />
  )
}

export function CredentialAccess({ employee }: { employee: Employee }) {
  const api = useApi()
  const [credentials, setCredentials] = useState<Credentials | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const request = useRef<AbortController | null>(null)
  const generation = useRef(0)
  useEffect(
    () => () => {
      generation.current += 1
      request.current?.abort()
    },
    [],
  )
  function close() {
    generation.current += 1
    request.current?.abort()
    setCredentials(null)
    setBusy(false)
  }
  async function read() {
    if (busy) return
    const current = ++generation.current
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    setBusy(true)
    setError('')
    setCredentials(null)
    try {
      const result = await employeesApi(api).initialCredentials(
        employee.id,
        controller.signal,
      )
      if (current === generation.current)
        setCredentials(result.initialCredentials)
    } catch (failure) {
      if (current !== generation.current) return
      setError(
        isApiError(failure) &&
          failure.problem?.code === 'INITIAL_CREDENTIALS_UNAVAILABLE'
          ? 'Kredensial awal sudah tidak tersedia karena pemilik mengganti kata sandi.'
          : 'Kredensial belum dapat dimuat. Coba lagi jika Anda masih berwenang.',
      )
    } finally {
      if (current === generation.current) setBusy(false)
    }
  }
  if (employee.hasPasswordChanged)
    return (
      <Alert title="Kata sandi pribadi sudah digunakan">
        Kata sandi pribadi tidak dapat dilihat HRD. Kredensial awal tidak
        tersedia lagi.
      </Alert>
    )
  return (
    <section className="space-y-4">
      <h2 className="text-title font-medium">Akses awal</h2>
      <p className="text-small text-text-muted">
        Ambil kredensial hanya saat akan menyerahkan akses kepada pemilik akun.
        Server memeriksa ulang ketersediaannya.
      </p>
      {!credentials && (
        <Button busy={busy} onClick={() => void read()}>
          Lihat kredensial awal
        </Button>
      )}
      {busy && (
        <Button variant="ghost" onClick={close}>
          Batalkan pembacaan
        </Button>
      )}
      {error && <Alert title={error} tone="warning" />}
      {credentials && (
        <InitialCredentialsPanel credentials={credentials} onClose={close} />
      )}
    </section>
  )
}
