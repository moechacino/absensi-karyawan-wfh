import { TextField } from './TextField'

export interface DateRange {
  startDate: string
  endDate: string
}

export function DateRangeField({
  value,
  onChange,
  label = 'Rentang tanggal',
  disabled,
  min,
  max,
  startError,
  endError,
  required,
}: {
  value: DateRange
  onChange: (value: DateRange) => void
  label?: string
  disabled?: boolean
  min?: string
  max?: string
  startError?: string
  endError?: string
  required?: boolean
}) {
  return (
    <fieldset disabled={disabled} className="min-w-0 space-y-3">
      <legend className="mb-2 text-label font-medium">{label}</legend>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Tanggal mulai"
          type="date"
          value={value.startDate}
          onChange={(event) =>
            onChange({ ...value, startDate: event.target.value })
          }
          min={min}
          max={max}
          error={startError}
          required={required}
        />
        <TextField
          label="Tanggal selesai"
          type="date"
          value={value.endDate}
          onChange={(event) =>
            onChange({ ...value, endDate: event.target.value })
          }
          min={min}
          max={max}
          error={endError}
          required={required}
        />
      </div>
    </fieldset>
  )
}
