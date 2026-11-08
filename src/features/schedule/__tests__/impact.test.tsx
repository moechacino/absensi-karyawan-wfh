import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { SchedulePreview } from '../model'
import { ScheduleImpactDialog } from '../ScheduleImpactDialog'
import { createApiError } from '../../../shared/api/problem'

const preview: SchedulePreview = {
  schedule: {
    expectedVersion: 2,
    workingDays: [1],
    startTime: '09:00',
    endTime: '17:00',
    endDayOffset: 0,
    timeZone: 'Asia/Jakarta',
    effectiveFrom: '2026-11-16',
  },
  activationMode: 'ON_SAVE',
  effectiveAt: null,
  comparisonDate: '2026-11-08',
  impact: {
    canApply: true,
    issues: [],
    impactToken: 'token',
    expiresAt: '2026-11-08T12:00:00Z',
  },
}

function mockDialog() {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.open = true
    },
  })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.open = false
    },
  })
}

describe('schedule impact review', () => {
  it('requires explicit global confirmation and does not claim success on click', () => {
    mockDialog()
    const confirm = vi.fn()
    render(
      <ScheduleImpactDialog
        preview={preview}
        current={null}
        open
        busy={false}
        allowed
        onClose={vi.fn()}
        onConfirm={confirm}
        commandError={null}
        uncertain={false}
        onRetry={vi.fn()}
      />,
    )
    const save = screen.getByRole('button', { name: 'Simpan jadwal' })
    expect(save).toBeDisabled()
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(save)
    expect(confirm).toHaveBeenCalledOnce()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(
      screen.getByText(/waktu pastinya belum ditentukan/),
    ).toBeInTheDocument()
  })

  it('keeps uncertain retry controls inside the open dialog and shows configuration issues', () => {
    mockDialog()
    const retry = vi.fn()
    render(
      <ScheduleImpactDialog
        preview={{
          ...preview,
          impact: {
            ...preview.impact,
            issues: [
              {
                code: 'INVALID_LOCAL_TIME',
                field: 'startTime',
                message: 'Waktu lokal ambigu.',
              },
            ],
          },
        }}
        current={null}
        open
        busy={false}
        allowed={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        commandError={createApiError('timeout')}
        uncertain
        onRetry={retry}
      />,
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'Coba ulang penyimpanan yang sama' }),
    )
    expect(retry).toHaveBeenCalledOnce()
    expect(screen.getByText(/Waktu lokal ambigu/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Simpan jadwal' })).toBeDisabled()
  })
})
