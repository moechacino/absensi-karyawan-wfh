import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { historyFilters, isRecordId, updateFilter } from './historyFilters'
import { AttendanceDayCard } from './AttendanceDayCard'
describe('attendance history projections', () => {
  it('uses company month/date defaults and validates real date ranges', () => {
    expect(historyFilters(new URLSearchParams(), '2027-01-01')).toMatchObject({
      from: '2027-01-01',
      to: '2027-01-01',
      valid: true,
    })
    expect(
      historyFilters(
        new URLSearchParams('from=2026-02-30&to=2026-03-01'),
        '2026-03-01',
      ).valid,
    ).toBe(false)
    expect(
      historyFilters(new URLSearchParams('from=2026-11-09&to=2026-11-08'))
        .valid,
    ).toBe(false)
  })
  it('resets pagination on filter edits while preserving dates/context', () => {
    const initial = new URLSearchParams('from=2026-11-01&to=2026-11-08&page=4')
    expect(updateFilter(initial, 'to', '2026-11-07').get('page')).toBe('1')
    expect(updateFilter(initial, 'page', '2', false).get('from')).toBe(
      '2026-11-01',
    )
    expect(initial.get('page')).toBe('4')
  })
  it('renders exempt/missing record days without a detail link or fake record ID', () => {
    render(
      <MemoryRouter>
        <AttendanceDayCard
          day={{
            workDate: '2026-11-08',
            status: 'HOLIDAY',
            schedule: null,
            attendance: null,
            canCheckIn: false,
            canCheckOut: false,
            blockReason: 'COMPANY_HOLIDAY',
          }}
          detailPath="/app/attendance"
          returnTo="/app/attendance"
        />
      </MemoryRouter>,
    )
    expect(screen.getByText('Hari libur')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(isRecordId(undefined)).toBe(false)
    expect(isRecordId('fake-id')).toBe(false)
  })
})
