import { lazy, Suspense } from 'react'
import { RouterProvider } from 'react-router'
import { SessionProvider } from '../shared/auth'
import { router } from './router'

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
    <SessionProvider>
      <RouterProvider router={router} />
    </SessionProvider>
  )
}
