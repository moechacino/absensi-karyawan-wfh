import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import EmployeeHomePage from '../EmployeeHomePage'
import { closedHome, overnightAttendance } from './fixtures'

let response = closedHome

vi.mock('../../../shared/auth', () => ({ useSession: () => ({ profile: { fullName: 'Contoh' } }) }))
vi.mock('../api', () => ({
  useHome: () => ({ data: response, isPending: false, isError: false, refetch: vi.fn() }),
}))

describe('home timestamps', () => {
  it('displays the Jayapura response in the device timezone and keeps closed check-in unavailable', () => {
    response = closedHome
    const resolved = new Intl.DateTimeFormat().resolvedOptions()
    vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({ ...resolved, timeZone: 'Asia/Jakarta' })
    render(<MemoryRouter><EmployeeHomePage /></MemoryRouter>)
    expect(screen.getByText('Waktu Anda · Asia/Jakarta')).toBeInTheDocument()
    expect(screen.getByText('06.00–15.00')).toBeInTheDocument()
    expect(screen.getByText(/Dibuka 10 Nov 2026, 05.45/)).toBeInTheDocument()
    expect(screen.getByText('Jendela check-in telah ditutup.')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Check-in sekarang' })).not.toBeInTheDocument()
    expect(screen.queryByText(/Asia\/Jayapura/)).not.toBeInTheDocument()
  })
})


describe('overnight checkout', () => {
  it('keeps checkout available at 04:05, showing the server cutoff in device time', () => {
    const resolved = new Intl.DateTimeFormat().resolvedOptions()
    vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({ ...resolved, timeZone: 'Asia/Jakarta' })
    response = {
      ...closedHome, serverNow: '2026-11-09T21:05:00Z', companyDate: '2026-11-10', checkInWindow: null,
      day: { ...closedHome.day, workDate: '2026-11-09', status: 'WORKING', schedule: overnightAttendance.schedule, attendance: overnightAttendance, canCheckOut: true, blockReason: null },
    }
    const { rerender } = render(<MemoryRouter><EmployeeHomePage /></MemoryRouter>)
    expect(screen.getByText('9 Nov 2026, 20.00–10 Nov 2026, 04.00')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Check-out' })).toHaveAttribute('href', '/app/attendance/overnight-attendance?checkout=1')
    expect(screen.getByText(/Check-out sebelum 10 Nov 2026, 19.45/)).toBeInTheDocument()
    expect(screen.getByText(/Hari kerja: 9 November 2026/)).toBeInTheDocument()
    response = { ...response, serverNow: '2026-11-10T12:45:00Z', day: { ...response.day, status: 'MISSED_CHECK_OUT', canCheckOut: false, canCheckIn: true, attendance: { ...overnightAttendance, state: 'MISSED_CHECK_OUT' } } }
    rerender(<MemoryRouter><EmployeeHomePage /></MemoryRouter>)
    expect(screen.queryByRole('link', { name: 'Check-out' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Check-in sekarang' })).toBeInTheDocument()
  })
})
