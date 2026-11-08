import { useEffect, useRef, useState } from 'react'
import type { SubmitEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useSession } from '../../shared/auth'
import { isApiError, retryAfterMs } from '../../shared/api/problem'
import { safeReturnPath } from '../../shared/navigation/safeReturn'
import { TextField } from '../../shared/forms/TextField'
import { PasswordField } from '../../shared/forms/PasswordField'
import { Button } from '../../shared/ui/Button'
import { Alert, LoadingState } from '../../shared/ui/Feedback'
import mark from '../../assets/brand/absensi-mark.svg'

export default function LoginPage() {
  const session = useSession()
  const navigate = useNavigate()
  const [search] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const mounted = useRef(true)
  const submitting = useRef(false)
  const destination = safeReturnPath(search.get('returnTo'))

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  useEffect(() => {
    if (session.status === 'authenticated')
      navigate(destination, { replace: true })
  }, [session.status, destination, navigate])
  useEffect(() => {
    if (!cooldown) return
    const timer = setInterval(
      () => setCooldown((value) => Math.max(0, value - 1)),
      1000,
    )
    return () => clearInterval(timer)
  }, [cooldown])

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current || cooldown) return
    submitting.current = true
    setBusy(true)
    setMessage('')
    try {
      await session.login({ email, password })
      if (mounted.current) setPassword('')
    } catch (error) {
      if (!mounted.current) return
      if (isApiError(error) && error.status === 429) {
        setCooldown(
          Math.max(
            1,
            Math.ceil((retryAfterMs(error.retryAfter) ?? 1000) / 1000),
          ),
        )
        setMessage('Terlalu banyak percobaan. Tunggu sebelum mencoba lagi.')
      } else if (isApiError(error) && error.status === 401) {
        setMessage('Email atau kata sandi tidak sesuai, atau akun tidak aktif.')
      } else {
        setMessage(
          isApiError(error) ? error.message : 'Belum dapat masuk. Coba lagi.',
        )
      }
    } finally {
      submitting.current = false
      if (mounted.current) setBusy(false)
    }
  }

  if (session.status === 'loading')
    return <LoadingState label="Memulihkan sesi…" />
  return (
    <main className="flex min-h-svh items-center justify-center bg-canvas px-4 py-10">
      <section className="w-full max-w-md space-y-6 rounded-panel border border-border bg-surface p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <img src={mark} alt="" width="36" height="36" />
          <span className="font-medium">absensi</span>
        </div>
        <div className="space-y-2">
          <p className="text-label font-medium text-action">
            KERJA DARI MANA SAJA
          </p>
          <h1 className="text-heading font-medium">Selamat datang</h1>
          <p className="text-text-muted">Masuk dengan akun perusahaan Anda.</p>
        </div>
        {search.get('message') === 'password-changed' && (
          <Alert title="Kata sandi diperbarui" tone="success">
            Masuk kembali dengan kata sandi baru.
          </Alert>
        )}
        {search.get('message') === 'password-uncertain' && (
          <Alert title="Periksa hasil perubahan" tone="warning">
            Hasil perubahan belum diketahui. Coba masuk dengan kata sandi baru
            terlebih dahulu.
          </Alert>
        )}
        {session.reason === 'expired' && (
          <Alert title="Sesi berakhir" tone="warning">
            Masuk kembali untuk melanjutkan.
          </Alert>
        )}
        {(message || session.error) && (
          <Alert title="Belum dapat masuk" tone="danger">
            {message || session.error?.message}
          </Alert>
        )}
        {session.status === 'error' && (
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={session.retry}>
              Coba pulihkan sesi
            </Button>
            <Button variant="ghost" onClick={session.clearSession}>
              Hapus sesi lokal
            </Button>
          </div>
        )}
        <form
          className="space-y-5"
          onSubmit={(event) => {
            void submit(event)
          }}
        >
          <TextField
            label="Email kantor"
            type="email"
            name="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={busy}
          />
          <PasswordField
            label="Kata sandi"
            name="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={busy}
          />
          <Button
            type="submit"
            className="w-full"
            busy={busy}
            busyLabel="Memeriksa akun…"
            disabled={cooldown > 0 || session.status === 'error'}
          >
            {cooldown ? `Coba lagi dalam ${cooldown} detik` : 'Masuk'}
          </Button>
        </form>
        <p className="text-small text-text-muted">
          Hubungi HR perusahaan jika Anda memerlukan bantuan akun.
        </p>
      </section>
    </main>
  )
}
