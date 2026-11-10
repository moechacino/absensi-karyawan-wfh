import { useState } from 'react'
import type { SubmitEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { useApi, useSession } from '../../shared/auth'
import { useCommand } from '../../shared/commands/useCommand'
import { PasswordField } from '../../shared/forms/PasswordField'
import { Button } from '../../shared/ui/Button'
import { Alert, LoadingState } from '../../shared/ui/Feedback'
import { changePassword } from './api'
import {
  passwordServerErrors,
  validPasswordPolicy,
  validatePassword,
} from './passwordValidation'
import type { PasswordErrors, PasswordInput } from './passwordValidation'

const empty: PasswordInput = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
}

export default function PasswordPage() {
  const api = useApi()
  const { profile, clearSession, refreshProfile } = useSession()
  const navigate = useNavigate()
  const [input, setInput] = useState<PasswordInput>(empty)
  const [validation, setValidation] = useState<PasswordErrors>({})
  const [policyError, setPolicyError] = useState('')
  const [profileRefreshFailed, setProfileRefreshFailed] = useState(false)
  const policy = profile?.passwordPolicy
  const command = useCommand<PasswordInput, undefined>({
    identity: profile?.id ?? null,
    idempotent: false,
    execute: (data, { signal }) => changePassword(api, data, signal),
    onConfirmed: async () => {
      setInput(empty)
      setValidation({})
      await reloadProfile()
    },
  })
  const busy = command.status === 'submitting'
  const uncertain =
    command.status === 'uncertain' || command.status === 'in-progress'
  const errors = { ...passwordServerErrors(command.error), ...validation }

  async function reloadProfile() {
    setProfileRefreshFailed(false)
    try {
      await refreshProfile()
    } catch {
      setProfileRefreshFailed(true)
    }
  }
  function update(field: keyof PasswordInput, value: string) {
    if (busy || uncertain) return
    command.reset()
    setValidation({})
    setInput((current) => ({ ...current, [field]: value }))
  }
  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || uncertain || !validPasswordPolicy(policy)) return
    const next = validatePassword(input, policy)
    setValidation(next)
    if (!Object.keys(next).length)
      void command.run(input).catch(() => undefined)
  }
  function signInToCheck() {
    setInput(empty)
    clearSession()
    navigate('/login?message=password-uncertain', { replace: true })
  }

  if (!profile) return <LoadingState label="Memuat kebijakan akun…" />
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-2">
        <Link
          to="/app/profile"
          className="text-small underline underline-offset-4"
        >
          Kembali ke profil
        </Link>
        <h1 className="text-heading font-medium">Ubah kata sandi</h1>
        <p className="text-text-muted">
          Ubah kata sandi akun Anda. Sesi saat ini tetap aktif setelah berhasil.
        </p>
      </div>
      {command.status === 'confirmed' && (
        <Alert title="Kata sandi berhasil diperbarui" tone="success">
          Anda tetap masuk. Gunakan kata sandi baru saat masuk berikutnya.
        </Alert>
      )}
      {profileRefreshFailed && (
        <Alert title="Profil belum diperbarui" tone="warning">
          <p>Kata sandi sudah tersimpan, tetapi profil terbaru belum dapat dimuat.</p>
          <Button className="mt-3" variant="secondary" onClick={() => void reloadProfile()}>
            Muat ulang profil
          </Button>
        </Alert>
      )}
      {!validPasswordPolicy(policy) ? (
        <Alert title="Kebijakan kata sandi belum tersedia" tone="warning">
          <p>Form belum dapat dikirim hingga kebijakan perusahaan dimuat.</p>
          {policyError && <p>{policyError}</p>}
          <Button
            className="mt-3"
            variant="secondary"
            onClick={() => {
              void refreshProfile().catch(() =>
                setPolicyError('Kebijakan belum dapat dimuat. Coba lagi.'),
              )
            }}
          >
            Muat ulang kebijakan
          </Button>
        </Alert>
      ) : (
        <>
          <Alert title="Kebijakan perusahaan">
            Gunakan {policy.minLength}–{policy.maxLength} karakter. Kata sandi
            baru harus berbeda dari kata sandi saat ini. Spasi tetap dihitung.
          </Alert>
          {uncertain && (
            <Alert title="Hasil perubahan belum diketahui" tone="warning">
              <p>
                Koneksi terputus setelah permintaan dikirim. Jangan kirim ulang
                secara otomatis. Masuk dengan kata sandi baru untuk memeriksa
                hasil.
              </p>
              <Button
                className="mt-3"
                variant="secondary"
                onClick={signInToCheck}
              >
                Masuk untuk memeriksa
              </Button>
            </Alert>
          )}
          {command.error && !uncertain && (
            <Alert title="Kata sandi belum dapat diubah" tone="danger">
              <p>
                Periksa pesan pada kolom atau coba lagi setelah koneksi pulih.
              </p>
            </Alert>
          )}
          <form
            onSubmit={submit}
            className="space-y-5 rounded-panel border border-border bg-surface p-6"
          >
            <PasswordField
              label="Kata sandi saat ini"
              autoComplete="current-password"
              value={input.currentPassword}
              onChange={(event) =>
                update('currentPassword', event.target.value)
              }
              error={errors.currentPassword}
              required
              disabled={busy || uncertain}
            />
            <PasswordField
              label="Kata sandi baru"
              autoComplete="new-password"
              value={input.newPassword}
              onChange={(event) => update('newPassword', event.target.value)}
              error={errors.newPassword}
              required
              disabled={busy || uncertain}
            />
            <PasswordField
              label="Konfirmasi kata sandi baru"
              autoComplete="new-password"
              value={input.confirmPassword}
              onChange={(event) =>
                update('confirmPassword', event.target.value)
              }
              error={errors.confirmPassword}
              required
              disabled={busy || uncertain}
            />
            <Button
              type="submit"
              busy={busy}
              busyLabel="Memperbarui kata sandi…"
              disabled={uncertain}
            >
              Simpan kata sandi
            </Button>
          </form>
        </>
      )}
    </div>
  )
}
