import type { Permission } from '../shared/api/types'
import {
  Link,
  Navigate,
  Outlet,
  useLocation,
  useRouteError,
} from 'react-router'
import { useSession } from '../shared/auth'
import { ErrorState, LoadingState } from '../shared/ui/Feedback'
import { Button } from '../shared/ui/Button'
import { hasAccess } from './routes'
import { safeReturnPath } from '../shared/navigation/safeReturn'

export function ProtectedRoute({
  permission,
}: {
  permission?: Permission
}) {
  const session = useSession()
  const location = useLocation()
  if (session.status === 'loading')
    return <LoadingState label="Memulihkan sesi…" />
  if (session.status === 'error')
    return (
      <div className="mx-auto max-w-lg space-y-4 p-6">
        <ErrorState title="Sesi belum dapat dipastikan" onRetry={session.retry}>
          Periksa koneksi lalu coba lagi. Konten pribadi belum ditampilkan.
        </ErrorState>
        <Button variant="secondary" onClick={() => void session.logout()}>
          Keluar
        </Button>
      </div>
    )
  if (session.status !== 'authenticated' || !session.profile)
    return (
      <Navigate
        to={`/login?returnTo=${encodeURIComponent(safeReturnPath(location.pathname + location.search))}`}
        replace
      />
    )
  if (!hasAccess(session.profile.permissions, permission))
    return <ForbiddenPage />
  return <Outlet />
}
export function ForbiddenPage() {
  return (
    <div className="space-y-4 p-6">
      <h1 className="text-heading">Akses tidak tersedia</h1>
      <p>Akun Anda tidak memiliki izin untuk halaman ini.</p>
      <Link className="text-action underline" to="/app">
        Kembali ke beranda
      </Link>
    </div>
  )
}
export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-lg space-y-4 p-6">
      <h1 className="text-heading">Halaman tidak ditemukan</h1>
      <p>Alamat ini tidak tersedia.</p>
      <Link className="text-action underline" to="/app">
        Ke beranda
      </Link>
    </div>
  )
}
export function RouteErrorPage() {
  useRouteError()
  return (
    <div className="mx-auto max-w-lg p-6">
      <ErrorState
        title="Halaman belum dapat dibuka"
        onRetry={() => window.location.reload()}
      >
        Muat ulang untuk mencoba kembali.
      </ErrorState>
      <Link className="mt-4 block text-action underline" to="/app">
        Ke beranda
      </Link>
    </div>
  )
}
