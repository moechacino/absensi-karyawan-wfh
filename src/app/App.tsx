import { lazy, Suspense } from 'react'
import brandMark from '../assets/brand/absensi-mark.svg'
import wordmark from '../assets/brand/absensi-wordmark.svg'

const ComponentPreview = import.meta.env.DEV
  ? lazy(() => import('./ComponentPreview'))
  : null

export default function App() {
  if (ComponentPreview && window.location.pathname === '/dev/components') {
    return (
      <Suspense
        fallback={
          <p className="p-6" role="status">
            Memuat pratinjau…
          </p>
        }
      >
        <ComponentPreview />
      </Suspense>
    )
  }
  return (
    <main className="mx-auto min-h-svh max-w-5xl px-6 py-12">
      <div className="mb-12 flex items-center gap-3">
        <img src={brandMark} alt="" width="36" height="36" />
        <img src={wordmark} alt="absensi" width="85" height="18" />
      </div>
      <h1 className="text-heading font-medium">Absensi Karyawan WFH</h1>
      <p className="mt-3 text-text-muted">
        Kelola kehadiran dan pengajuan time off.
      </p>
    </main>
  )
}
