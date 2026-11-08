import { useEffect } from 'react'
import { invalidateGroup } from '../../shared/query/invalidation'
import { useQueryClient } from '@tanstack/react-query'
import { useApi, useSession } from '../../shared/auth'
import type { components } from '../../shared/api/schema'
import { useCommand } from '../../shared/commands/useCommand'
import { ConfirmationDialog } from '../../shared/ui/Dialog'
import { CommandNotice } from './CommandNotice'
import { checkOut } from './commandApi'
import { formatDate, formatTimestamp } from '../../shared/dates/format'

export function CheckoutDialog({
  attendance,
  open,
  onClose,
  onConfirmed,
}: {
  attendance: components['schemas']['Attendance']
  open: boolean
  onClose: () => void
  onConfirmed: () => void
}) {
  const api = useApi(),
    { profile } = useSession(),
    queries = useQueryClient()
  const command = useCommand({
    identity: profile?.id ?? null,
    execute: (input: { id: string; expectedVersion: number }, context) =>
      checkOut(api, input, context),
    onConfirmed: async () => {
      if (profile) await invalidateGroup(queries, profile.id, 'attendance')
      onConfirmed()
    },
  })
  useEffect(() => {
    if (command.status === 'conflict' && profile)
      void invalidateGroup(queries, profile.id, 'attendance')
  }, [command.status, profile, queries])
  const locked = ['submitting', 'uncertain', 'in-progress'].includes(
    command.status,
  )
  return (
    <ConfirmationDialog
      open={open}
      title="Konfirmasi check-out"
      description="Waktu selesai dicatat oleh server setelah konfirmasi."
      busy={command.status === 'submitting'}
      confirmLabel="Check-out sekarang"
      confirmDisabled={locked}
      onClose={() => {
        if (!locked) {
          command.reset()
          onClose()
        }
      }}
      onConfirm={() => {
        if (!locked)
          void command.run({
            id: attendance.id,
            expectedVersion: attendance.version,
          })
      }}
    >
      <p>Hari kerja {formatDate(attendance.workDate)}</p>
      <p>
        Check-in:{' '}
        {formatTimestamp(attendance.checkInAt, attendance.schedule.timeZone)}
      </p>
      <CommandNotice
        status={command.status}
        error={command.error}
        retry={() => void command.retry()}
      />
      {command.status === 'conflict' && (
        <p>
          Data kehadiran telah berubah. Tutup, muat ulang data, lalu periksa
          sebelum mencoba kembali.
        </p>
      )}
    </ConfirmationDialog>
  )
}
