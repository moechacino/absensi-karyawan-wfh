import { TextField } from '../../shared/forms/TextField'
import { SelectField } from '../../shared/forms/SelectField'
import { Button } from '../../shared/ui/Button'
import type { Holiday } from './batchState'
import { holidayDateError } from './batchState'

const categoryLabels = {
  COMPANY: 'Perusahaan',
  PUBLIC: 'Nasional',
  OTHER: 'Lainnya',
} as const
export function HolidayDateEditor({
  value,
  year,
  companyDate,
  isExisting,
  isRemoved,
  locked,
  onSave,
  onRemove,
  onRestore,
  onClose,
}: {
  value: Holiday
  year: number
  companyDate: string
  isExisting: boolean
  isRemoved: boolean
  locked: boolean
  onSave: (value: Holiday) => void
  onRemove: (date: string) => void
  onRestore: (date: string) => void
  onClose: () => void
}) {
  const dateError = holidayDateError(value.date, year, companyDate)
  const nameError = value.name.trim()
    ? undefined
    : 'Nama hari libur wajib diisi.'
  const invalid = Boolean(dateError || nameError)
  return (
    <div className="space-y-4">
      {isRemoved && (
        <p
          role="status"
          className="rounded-control bg-warning-soft p-3 text-small"
        >
          Tanggal ini akan dihapus setelah peninjauan dan penyimpanan server.
        </p>
      )}
      <TextField
        label="Tanggal"
        type="date"
        value={value.date}
        min={companyDate}
        max={`${year}-12-31`}
        error={dateError}
        disabled
        readOnly
      />
      <TextField
        label="Nama hari libur"
        value={value.name}
        maxLength={160}
        onChange={(event) => onSave({ ...value, name: event.target.value })}
        error={nameError}
        hint="Nama mengikuti kalender tahunan perusahaan."
        disabled={locked || isRemoved || Boolean(dateError)}
      />
      <SelectField
        label="Kategori"
        value={value.category}
        disabled={locked || isRemoved || Boolean(dateError)}
        onChange={(category) =>
          onSave({ ...value, category: category as Holiday['category'] })
        }
        options={Object.entries(categoryLabels).map(([category, label]) => ({
          value: category,
          label,
        }))}
      />
      <div className="flex flex-wrap gap-3">
        {isRemoved ? (
          <Button
            variant="secondary"
            disabled={locked}
            onClick={() => onRestore(value.date)}
          >
            Batalkan penghapusan
          </Button>
        ) : (
          <Button
            variant="primary"
            disabled={locked || invalid}
            onClick={() => onSave(value)}
          >
            Simpan tanggal dalam batch
          </Button>
        )}
        {isExisting && !isRemoved && (
          <Button
            variant="danger"
            disabled={locked || Boolean(dateError)}
            onClick={() => onRemove(value.date)}
          >
            Hapus tanggal
          </Button>
        )}
        <Button variant="secondary" disabled={locked} onClick={onClose}>
          Tutup
        </Button>
      </div>
    </div>
  )
}
