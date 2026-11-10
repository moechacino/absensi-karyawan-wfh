import { FileField } from '../../shared/forms/FileField'
import { PrivateImage } from '../files/PrivateImage'
import { useLocalPreview } from '../files/useLocalPreview'
import type { Employee } from './model'
import { PROFILE_PHOTO_TYPES } from './editModel'

export function EmployeePhotoField({
  employee,
  file,
  onChange,
  disabled,
  error,
}: {
  employee?: Employee
  file: File | null
  onChange: (file: File | null) => void
  disabled?: boolean
  error?: string
}) {
  const preview = useLocalPreview(file)
  return (
    <section className="space-y-4 rounded-card border border-border p-4">
      <h2 className="text-title font-medium">Foto profil</h2>
      <div className="flex flex-wrap gap-5">
        {employee && (
          <div className="space-y-2">
            <p className="text-label text-text-muted">Foto tersimpan</p>
            <PrivateImage
              file={employee.photo}
              alt={employee.fullName}
              className="size-24 rounded-card object-cover"
            />
          </div>
        )}
        {file && (
          <div className="space-y-2">
            <p className="text-label text-text-muted">
              Pilihan lokal, belum disimpan
            </p>
            {preview ? (
              <img
                src={preview}
                alt="Pratinjau foto profil"
                className="size-24 rounded-card object-cover"
              />
            ) : (
              <p className="text-small text-text-muted">
                Pratinjau belum tersedia.
              </p>
            )}
          </div>
        )}
      </div>
      <FileField
        label={employee ? 'Foto pengganti (opsional)' : 'Foto profil (opsional)'}
        file={file}
        onChange={onChange}
        disabled={disabled}
        accept={PROFILE_PHOTO_TYPES.join(',')}
        error={error}
        hint="JPEG, PNG, atau WebP; maksimum 5 MiB. Foto dikirim bersama data karyawan saat disimpan. Menghapus pilihan lokal tidak menghapus foto tersimpan."
      />
    </section>
  )
}
