import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CheckoutSummary } from './CheckoutSummary'
import { overnightAttendance } from '../home/__tests__/fixtures'

describe('checkout results', () => {
  it.each([
    ['EARLY', 'Lebih awal (EARLY)', 361],
    ['ON_TIME', 'Tepat waktu (ON_TIME)', 0],
    ['LATE', 'Terlambat (LATE)', 0],
  ] as const)('shows server checkout classification %s independently of on-time check-in', (punctuality, label, earlySeconds) => {
    render(<CheckoutSummary attendance={{ ...overnightAttendance, state: 'COMPLETED', checkOutAt: '2026-11-09T21:05:00Z', checkOutPunctuality: punctuality, earlyCheckOutSeconds: earlySeconds }} />)
    expect(screen.getByText(`Status check-out: ${label}.`)).toBeInTheDocument()
    if (punctuality === 'EARLY')
      expect(screen.getByText('Pulang lebih awal: 6 menit (361 detik).')).toBeInTheDocument()
    else expect(screen.queryByText(/Pulang lebih awal/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Check-out sebelum/)).not.toBeInTheDocument()
  })

  it('does not invent a checkout classification or departure duration for missed records', () => {
    render(<CheckoutSummary attendance={{ ...overnightAttendance, state: 'MISSED_CHECK_OUT' }} />)
    expect(screen.queryByText(/Status check-out|Pulang lebih awal|Check-out sebelum/)).not.toBeInTheDocument()
  })
})
