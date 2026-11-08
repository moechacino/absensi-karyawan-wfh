import { useState } from 'react'
import { publicConfig } from '../../shared/config'
import { PasswordField } from '../../shared/forms/PasswordField'
import { Button } from '../../shared/ui/Button'
import { Alert } from '../../shared/ui/Feedback'
import {
  accessMessage,
  copyAccess,
  credentialPair,
  shareAccess,
} from './shareMessage'
import type { Credentials } from './model'

export function InitialCredentialsPanel({
  credentials,
  onClose,
}: {
  credentials: Credentials
  onClose: () => void
}) {
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  async function copy(message: boolean) {
    setBusy(true)
    const result = await copyAccess(
      message
        ? accessMessage(credentials, publicConfig.appUrl)
        : credentialPair(credentials),
    )
    setNotice(
      result === 'copied'
        ? 'Teks akses telah disalin.'
        : result === 'unavailable'
          ? 'Clipboard tidak tersedia. Pilih dan salin teks secara manual.'
          : 'Teks belum dapat disalin. Coba lagi atau salin secara manual.',
    )
    setBusy(false)
  }
  async function share() {
    setBusy(true)
    const result = await shareAccess(
      accessMessage(credentials, publicConfig.appUrl),
    )
    setNotice(
      result === 'completed'
        ? 'Menu berbagi perangkat selesai. Pengiriman mengikuti aplikasi yang Anda pilih.'
        : result === 'cancelled'
          ? 'Berbagi dibatalkan. Tidak ada pengiriman yang dikonfirmasi.'
          : result === 'unavailable'
            ? 'Berbagi perangkat tidak tersedia. Gunakan Salin pesan akses.'
            : 'Menu berbagi belum dapat dibuka. Gunakan Salin pesan akses.',
    )
    setBusy(false)
  }
  return (
    <section
      aria-label="Kredensial awal"
      className="space-y-4 rounded-card border border-border bg-surface p-5"
    >
      <h2 className="text-title font-medium">Akses awal karyawan</h2>
      <p className="text-small text-text-muted">
        Tutup panel setelah selesai. Kredensial tidak disimpan ke cache atau
        penyimpanan browser; akses awal tersedia sampai pemilik mengganti kata
        sandi.
      </p>
      <p className="select-text break-all">Email: {credentials.email}</p>
      <PasswordField
        label="Kata sandi awal"
        value={credentials.initialPassword}
        readOnly
        autoComplete="off"
      />
      <div className="flex flex-wrap gap-3">
        <Button disabled={busy} onClick={() => void copy(false)}>
          Salin email &amp; kata sandi
        </Button>
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() => void copy(true)}
        >
          Salin pesan akses
        </Button>
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() => void share()}
        >
          Bagikan akses
        </Button>
        <Button variant="ghost" onClick={onClose}>
          Tutup kredensial
        </Button>
      </div>
      {notice && <Alert title={notice} />}
    </section>
  )
}
