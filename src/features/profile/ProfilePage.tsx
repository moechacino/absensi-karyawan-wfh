import { useState } from 'react'
import { Link } from 'react-router'
import { useSession } from '../../shared/auth'
import { Alert, ErrorState, LoadingState } from '../../shared/ui/Feedback'
import { Button } from '../../shared/ui/Button'
import { PrivateImage } from '../files/PrivateImage'
import { PrivateFileViewer } from '../files/PrivateFileViewer'

export default function ProfilePage() {
  const { profile, status, retry, error } = useSession()
  const [viewerOpen, setViewerOpen] = useState(false)
  if (status === 'loading') return <LoadingState label="Memuat profil…" />
  if (!profile)
    return (
      <ErrorState onRetry={retry}>
        {error?.message ?? 'Profil belum tersedia.'}
      </ErrorState>
    )
  const rows = [
    ['Nama lengkap', profile.fullName],
    ['ID akun', profile.id],
    ['Email kantor', profile.email],
    ['Divisi', profile.division.name],
    ['Jabatan', profile.position.name],
    ['Peran akun', profile.role === 'HRD' ? 'HRD' : 'Karyawan'],
    ['Status', profile.status === 'ACTIVE' ? 'Aktif' : 'Tidak aktif'],
  ]
  return (
    <div className="space-y-6">
      <div>
        <p className="text-label font-medium text-action">AKUN SAYA</p>
        <h1 className="text-heading font-medium">Profil saya</h1>
      </div>
      {!profile.hasPasswordChanged && (
        <Alert title="Ganti kata sandi awal" tone="warning">
          Anda tetap dapat bekerja seperti biasa.{' '}
          <Link
            to="/app/password"
            className="font-medium underline underline-offset-4"
          >
            Ubah kata sandi
          </Link>{' '}
          untuk menjaga akses akun.
        </Alert>
      )}
      <section className="space-y-6 rounded-panel border border-border bg-surface p-6">
        <div className="flex flex-wrap items-center gap-4">
          <PrivateImage
            file={profile.photo}
            alt={profile.fullName}
            className="size-20 rounded-full object-cover"
          />
          <div>
            <h2 className="text-title font-medium">{profile.fullName}</h2>
            <p className="text-text-muted">ID akun {profile.id.slice(0, 8)}</p>
            {profile.photo && (
              <Button variant="ghost" onClick={() => setViewerOpen(true)}>
                Lihat foto
              </Button>
            )}
          </div>
        </div>
        <dl className="grid gap-5 sm:grid-cols-2">
          {rows.map(([label, value]) => (
            <div key={label} className="min-w-0 space-y-1">
              <dt className="text-label text-text-muted">{label}</dt>
              <dd className="[overflow-wrap:anywhere]">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="text-small text-text-muted">
          Hubungi HR untuk memperbarui identitas atau foto profil.
        </p>
        <Link
          to="/app/password"
          className="inline-flex min-h-touch items-center rounded-control border border-control-border px-4 py-3 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
        >
          Ubah kata sandi
        </Link>
      </section>
      <PrivateFileViewer
        file={profile.photo}
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
      />
    </div>
  )
}
