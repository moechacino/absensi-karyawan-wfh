import { useState } from 'react'
import type { PropsWithChildren } from 'react'
import { Button, IconButton } from '../shared/ui/Button'
import {
  Alert,
  Badge,
  EmptyState,
  ErrorState,
  LoadingState,
} from '../shared/ui/Feedback'
import { ConfirmationDialog } from '../shared/ui/Dialog'
import { Pagination } from '../shared/ui/Pagination'
import { ResponsiveList } from '../shared/ui/ResponsiveList'
import { Tabs } from '../shared/ui/Tabs'
import { TextField, TextAreaField } from '../shared/forms/TextField'
import { PasswordField } from '../shared/forms/PasswordField'
import { SelectField } from '../shared/forms/SelectField'
import { Combobox } from '../shared/forms/Combobox'
import { DateRangeField } from '../shared/forms/DateRangeField'
import { FileField } from '../shared/forms/FileField'

function Section({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <section className="min-w-0 space-y-5 rounded-panel border border-border bg-surface p-6">
      <h2 className="text-title font-medium">{title}</h2>
      {children}
    </section>
  )
}

export default function ComponentPreview() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [page, setPage] = useState(1)
  const [tab, setTab] = useState('requests')
  const [zone, setZone] = useState('jakarta')
  const [dates, setDates] = useState({
    startDate: '2026-11-16',
    endDate: '2026-11-17',
  })
  const [file, setFile] = useState<File | null>(null)
  const options = [
    { value: 'jakarta', label: 'Asia/Jakarta · WIB' },
    { value: 'makassar', label: 'Asia/Makassar · WITA' },
    { value: 'jayapura', label: 'Asia/Jayapura · WIT' },
  ]
  const rows = [
    {
      id: 'sample-1',
      label:
        'Contoh pengajuan dengan nama dan keterangan yang sangat panjang untuk memeriksa reflow',
      status: 'Menunggu',
    },
    { id: 'sample-2', label: 'Contoh pengajuan kedua', status: 'Disetujui' },
  ]

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <header className="space-y-2">
        <p className="text-label font-medium text-action">
          Pratinjau lokal · WEB-003
        </p>
        <h1 className="text-heading font-medium">Komponen antarmuka</h1>
        <p className="text-text-muted">
          Contoh komponen dan interaksi. Data ilustratif; tidak ada pengiriman
          ke server.
        </p>
      </header>
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Section title="Tombol dan status">
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => {
                setDialogOpen(true)
                setConfirmed(false)
              }}
            >
              Tinjau konfirmasi
            </Button>
            <Button variant="secondary">Sekunder</Button>
            <Button variant="danger">Tindakan penting</Button>
            <IconButton icon="edit" label="Edit contoh" />
            <Button disabled>Tidak tersedia</Button>
            <Button busy busyLabel="Menyimpan…">
              Simpan
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge>Menunggu</Badge>
            <Badge tone="success">Disetujui</Badge>
            <Badge tone="warning">Terlambat</Badge>
            <Badge tone="danger">Gagal dikirim</Badge>
          </div>
          <Alert title="Periksa perubahan" tone="warning">
            Peringatan memiliki teks dan ikon, bukan warna saja.
          </Alert>
          {confirmed && (
            <Alert title="Konfirmasi lokal selesai" tone="success">
              Hasil ini hanya berasal dari tombol contoh, bukan API.
            </Alert>
          )}
          <SelectField
            label="Simulasi dialog"
            value={pending ? 'busy' : 'idle'}
            onChange={(value) => setPending(value === 'busy')}
            options={[
              { value: 'idle', label: 'Dapat dikonfirmasi atau ditutup' },
              {
                value: 'busy',
                label: 'Pending — kontrol tutup dan Escape diblokir',
              },
            ]}
          />
          {pending && (
            <Button variant="secondary" onClick={() => setPending(false)}>
              Akhiri simulasi pending
            </Button>
          )}
        </Section>
        <Section title="Form dan pilihan">
          <TextField
            label="Email kantor"
            type="email"
            placeholder="nama@perusahaan.example"
            hint="Label dan petunjuk tetap terlihat."
          />
          <PasswordField label="Kata sandi" autoComplete="current-password" />
          <TextField
            label="Alasan penyesuaian"
            error="Isi alasan sebelum menyimpan perubahan."
          />
          <Combobox
            label="Timezone perusahaan"
            hint="Ketik untuk mencari; gunakan panah, Enter, atau Escape."
            value={zone}
            onChange={setZone}
            options={options}
          />
          <TextAreaField
            label="Keterangan panjang"
            defaultValue="Contoh teks untuk memeriksa label, fokus, dan perubahan ukuran textarea."
          />
        </Section>
        <Section title="Tanggal dan lampiran lokal">
          <DateRangeField value={dates} onChange={setDates} />
          <FileField
            label="Lampiran (opsional)"
            hint="Memilih atau menghapus file hanya mengubah pilihan lokal."
            accept="application/pdf,image/jpeg,image/png,image/webp"
            file={file}
            onChange={setFile}
          />
        </Section>
        <Section title="Loading, kosong, dan error">
          <LoadingState />
          <EmptyState title="Belum ada data">
            Pilih filter atau kembali setelah data tersedia.
          </EmptyState>
          <ErrorState onRetry={() => setConfirmed(true)}>
            Contoh kegagalan koneksi; tombol tidak memanggil server.
          </ErrorState>
        </Section>
      </div>
      <Section title="Tab, daftar responsif, dan paginasi">
        <Tabs
          label="Kategori contoh"
          value={tab}
          onChange={setTab}
          items={[
            {
              value: 'requests',
              label: 'Pengajuan',
              content: (
                <ResponsiveList
                  label="Pengajuan contoh"
                  items={rows}
                  rowKey={(row) => row.id}
                  columns={[
                    {
                      key: 'name',
                      heading: 'Pengajuan',
                      render: (row) => (
                        <a
                          className="underline decoration-action underline-offset-4"
                          href="#preview-details"
                        >
                          {row.label}
                        </a>
                      ),
                    },
                    {
                      key: 'status',
                      heading: 'Status',
                      render: (row) => (
                        <Badge
                          tone={
                            row.status === 'Disetujui' ? 'success' : 'neutral'
                          }
                        >
                          {row.status}
                        </Badge>
                      ),
                    },
                  ]}
                  renderCard={(row) => (
                    <div className="space-y-3">
                      <p>{row.label}</p>
                      <Badge>{row.status}</Badge>
                    </div>
                  )}
                  empty={<EmptyState title="Tidak ada pengajuan" />}
                />
              ),
            },
            {
              value: 'details',
              label: 'Detail',
              content: (
                <p id="preview-details">
                  Contoh panel kedua. Tab dapat dipilih dengan Enter atau Space
                  setelah berpindah fokus memakai panah.
                </p>
              ),
            },
          ]}
        />
        <Pagination page={page} totalPages={3} onPageChange={setPage} />
      </Section>
      <ConfirmationDialog
        open={dialogOpen}
        title="Terapkan perubahan contoh?"
        description="Dialog ini hanya memperagakan fokus, Escape, dan state pending."
        busy={pending}
        onClose={() => setDialogOpen(false)}
        onConfirm={() => {
          setConfirmed(true)
          setDialogOpen(false)
        }}
      >
        {pending ? (
          <div className="space-y-3">
            <p role="status">Menunggu hasil simulasi.</p>
            <Button variant="secondary" onClick={() => setPending(false)}>
              Akhiri simulasi pending
            </Button>
          </div>
        ) : (
          'Hasil tetap berada di halaman pratinjau lokal.'
        )}
      </ConfirmationDialog>
    </main>
  )
}
