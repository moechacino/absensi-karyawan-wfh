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
  employee: Employee
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
        <div className="space-y-2">
          <p className="text-label text-text-muted">Foto tersimpan</p>
          <PrivateImage
            file={employee.photo}
            alt={employee.fullName}
            className="size-24 rounded-card object-cover"
          />
        </div>
        {file && (
          <div className="space-y-2">
            <p className="text-label text-text-muted">
              Pilihan lokal, belum disimpan
            </p>
            {preview ? (
              <img
                src={preview}
                alt="Pratinjau foto pengganti"
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
        label="Foto pengganti (opsional)"
        file={file}
        onChange={onChange}
        disabled={disabled}
        accept={PROFILE_PHOTO_TYPES.join(',')}
        error={error}
        hint="Memilih atau menghapus pilihan lokal tidak mengubah foto tersimpan. JPEG, PNG, atau WebP; maksimum 5 MiB sesuai kontrak perencanaan."
      />
    </section>
  )
}
