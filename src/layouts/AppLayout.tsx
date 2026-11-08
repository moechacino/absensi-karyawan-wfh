import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router'
import { useSession } from '../shared/auth'
import {
  employeeNavigation,
  hrNavigation,
  visibleNavigation,
} from '../app/routes'
import { Navigation } from './Navigation'
import { Button } from '../shared/ui/Button'
import { Dialog } from '../shared/ui/Dialog'
import { Alert } from '../shared/ui/Feedback'
import { Icon } from '../shared/icons/Icon'
import mark from '../assets/brand/absensi-mark.svg'
import wordmark from '../assets/brand/absensi-wordmark.svg'

export function AppLayout({ hr = false }: { hr?: boolean }) {
  const session = useSession()
  const location = useLocation()
  const main = useRef<HTMLElement>(null)
  const [more, setMore] = useState(false)
  const permissions = session.profile?.permissions ?? []
  const items = visibleNavigation(
    hr ? hrNavigation : employeeNavigation,
    permissions,
  )
  const hrItems = visibleNavigation(hrNavigation, permissions)
  useEffect(() => {
    main.current?.focus({ preventScroll: true })
    document.title = `${hr ? 'HR' : 'Karyawan'} · Absensi WFH`
  }, [location.pathname, hr])
  return (
    <div className="min-h-dvh bg-canvas">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-control bg-surface p-3 focus:not-sr-only focus:absolute"
      >
        Lewati ke konten
      </a>
      <header className="border-b border-border bg-surface px-4 sm:px-6">
        <div className="mx-auto flex min-h-20 max-w-7xl flex-wrap items-center justify-between gap-3 py-3">
          <Link
            to={hr ? '/hr' : '/app'}
            aria-label="Beranda Absensi"
            className="flex items-center gap-3"
          >
            <img src={mark} alt="" width="36" height="36" />
            <img src={wordmark} alt="absensi" width="85" height="18" />
          </Link>
          <div className="flex min-w-0 flex-wrap items-center gap-2 text-small">
            <span className="max-w-44 truncate text-text-muted">
              {session.profile?.fullName}
            </span>
            {hrItems.length > 0 && (
              <Link
                className="rounded-control border border-border px-3 py-2 text-action"
                to={hr ? '/app' : hrItems[0].path}
              >
                {hr ? 'Karyawan' : 'Ruang HR'}
              </Link>
            )}
            <Button variant="ghost" onClick={() => void session.logout()}>
              <Icon name="logout" />
              <span className="sr-only sm:not-sr-only">Keluar</span>
            </Button>
          </div>
        </div>
      </header>
      <div
        className={`mx-auto max-w-7xl ${hr ? 'lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]' : ''}`}
      >
        {hr && (
          <aside className="hidden min-h-[calc(100dvh_-_5rem)] border-r border-border bg-surface p-4 lg:block">
            <p className="mb-5 px-3 text-label uppercase tracking-widest text-text-muted">
              Ruang HR
            </p>
            <nav aria-label="Navigasi HR">
              <Navigation items={items} />
            </nav>
          </aside>
        )}
        <main
          ref={main}
          id="main-content"
          tabIndex={-1}
          className={`min-w-0 space-y-6 px-4 py-6 pb-32 outline-none sm:px-6 ${hr ? '' : 'mx-auto max-w-3xl'}`}
        >
          {!session.profile?.hasPasswordChanged && (
            <Alert title="Amankan akun Anda" tone="warning">
              Anda masih menggunakan kata sandi awal.{' '}
              <Link to="/app/password" className="font-medium underline">
                Ganti kata sandi
              </Link>{' '}
              untuk keamanan akun.
            </Alert>
          )}
          <Outlet />
        </main>
      </div>
      <nav
        aria-label={hr ? 'Navigasi HR seluler' : 'Navigasi karyawan'}
        className={`fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface px-2 pb-[env(safe-area-inset-bottom)] ${hr ? 'lg:hidden' : ''}`}
      >
        <div className="mx-auto flex max-w-3xl">
          <Navigation items={hr ? items.slice(0, 2) : items} compact />
          {hr && (
            <Button
              variant="ghost"
              className="flex-1 flex-col text-label"
              onClick={() => setMore(true)}
            >
              <Icon name="grid" />
              Lainnya
            </Button>
          )}
        </div>
      </nav>
      <Dialog open={more} title="Navigasi HR" onClose={() => setMore(false)}>
        <nav aria-label="Semua menu HR">
          <Navigation items={items} onNavigate={() => setMore(false)} />
        </nav>
        <Link
          className="mt-3 block p-3 text-action underline"
          to="/app"
          onClick={() => setMore(false)}
        >
          Ke beranda karyawan
        </Link>
      </Dialog>
    </div>
  )
}
