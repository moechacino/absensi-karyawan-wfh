import type { Holiday } from './batchState'
import { calendarMonth, holidayMonthLabel } from './batchState'
import { formatDate } from '../../shared/dates/format'

const weekdays = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
export function HolidayMonth({
  year,
  month,
  companyDate,
  holidays,
  removed,
  locked,
  onSelect,
}: {
  year: number
  month: number
  companyDate: string
  holidays: readonly Holiday[]
  removed: readonly string[]
  locked: boolean
  onSelect: (date: string) => void
}) {
  const { leading, days } = calendarMonth(year, month)
  const byDate = new Map(holidays.map((holiday) => [holiday.date, holiday]))
  return (
    <section
      aria-label={holidayMonthLabel(year, month)}
      className="space-y-3 rounded-card border border-border bg-surface p-4"
    >
      <h2 className="text-title font-medium capitalize">
        {holidayMonthLabel(year, month)}
      </h2>
      <div className="grid grid-cols-7 gap-1 text-center text-label text-text-muted">
        {weekdays.map((day) => (
          <span key={day} aria-label={day}>
            {day}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: leading }, (_, index) => (
          <span aria-hidden="true" key={`blank-${index}`} />
        ))}
        {days.map((day) => {
          const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const holiday = byDate.get(date)
          const isRemoved = removed.includes(date)
          const past = date < companyDate
          const label = holiday
            ? `${isRemoved ? 'Akan dihapus: ' : ''}${holiday.name}, ${formatDate(date)}`
            : `Tandai ${formatDate(date)} sebagai hari libur`
          return (
            <button
              key={date}
              type="button"
              aria-label={label}
              aria-pressed={Boolean(holiday && !isRemoved)}
              title={holiday?.name}
              disabled={locked || past}
              onClick={() => onSelect(date)}
              className={`min-h-10 min-w-0 rounded-control text-small focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest disabled:cursor-not-allowed disabled:text-text-muted ${isRemoved ? 'bg-danger-soft text-danger line-through' : holiday ? 'bg-forest font-medium text-white' : date === companyDate ? 'border border-action' : 'hover:bg-canvas'}`}
            >
              {day}
            </button>
          )
        })}
      </div>
    </section>
  )
}
