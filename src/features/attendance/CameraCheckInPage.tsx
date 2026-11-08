import { useRef, useState } from 'react'
import { Link } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useApi, useSession } from '../../shared/auth'
import { invalidateGroup } from '../../shared/query/invalidation'
import { useCommand } from '../../shared/commands/useCommand'
import type { MultipartBody } from '../../shared/api/types'
import { useHome } from '../home/api'
import { homeView } from '../home/viewModel'
import { useCamera } from './useCamera'
import { checkIn } from './commandApi'
import { CommandNotice } from './CommandNotice'
import { Button } from '../../shared/ui/Button'
import { Alert, LoadingState } from '../../shared/ui/Feedback'
import { QueryError } from '../../shared/ui/QueryFeedback'
import { formatTimestamp } from '../../shared/dates/format'

export default function CameraCheckInPage() {
  const api = useApi(),
    { profile } = useSession(),
    home = useHome(),
    camera = useCamera(),
    queries = useQueryClient()
  const {
    videoRef,
    state: cameraState,
    error: cameraError,
    start: startCamera,
    stop: stopCamera,
    capture: capturePhoto,
  } = camera
  const capturing = useRef(false),
    [taking, setTaking] = useState(false),
    [captureError, setCaptureError] = useState<string | null>(null)
  const command = useCommand({
    identity: profile?.id ?? null,
    execute: (input: MultipartBody<'checkIn'>, context) =>
      checkIn(api, input, context),
    onConfirmed: async () => {
      if (profile) await invalidateGroup(queries, profile.id, 'attendance')
    },
  })
  const locked =
    taking ||
    ['submitting', 'uncertain', 'in-progress'].includes(command.status)
  async function resolveOutcome() {
    const fresh = await home.refetch()
    if (fresh.isError || !fresh.data) return
    if (fresh.data.day.attendance) {
      setCaptureError(
        'Kehadiran sudah tercatat. Periksa catatan terbaru di beranda.',
      )
      return
    }
    if (command.status === 'conflict' && homeView(fresh.data).checkIn) {
      command.reset()
      setCaptureError(
        'Server memastikan belum ada catatan. Ambil foto baru dengan konteks terbaru.',
      )
    }
  }
  async function capture() {
    if (capturing.current || locked) return
    capturing.current = true
    setTaking(true)
    setCaptureError(null)
    try {
      const fresh = await home.refetch()
      if (
        !fresh.data ||
        fresh.isError ||
        !homeView(fresh.data).checkIn ||
        !fresh.data.checkInContextToken
      ) {
        setCaptureError(
          'Kelayakan check-in telah berubah. Periksa status terbaru di beranda.',
        )
        stopCamera()
        return
      }
      command.reset()
      const photo = await capturePhoto()
      await command.run({ photo, contextToken: fresh.data.checkInContextToken })
    } catch (error) {
      setCaptureError(
        error instanceof Error ? error.message : 'Foto belum dapat diambil.',
      )
    } finally {
      capturing.current = false
      setTaking(false)
    }
  }
  if (home.isPending) return <LoadingState />
  if (home.isError)
    return <QueryError error={home.error} retry={() => void home.refetch()} />
  if (command.status === 'confirmed' && command.result)
    return (
      <div className="space-y-5">
        <h1 className="text-heading">Check-in berhasil</h1>
        <Alert title="Kehadiran telah tercatat" tone="success">
          {formatTimestamp(
            command.result.checkInAt,
            command.result.schedule.timeZone,
          )}{' '}
          ·{' '}
          {command.result.punctuality === 'LATE' ? 'Terlambat' : 'Tepat waktu'}
        </Alert>
        <Link
          className="text-action underline"
          to={`/app/attendance/${command.result.id}`}
        >
          Lihat kehadiran
        </Link>
      </div>
    )
  return (
    <div className="space-y-5">
      <Link to="/app" className="text-action underline">
        Kembali ke beranda
      </Link>
      <h1 className="text-heading font-medium">Check-in dengan kamera</h1>
      <p className="text-text-muted">
        Foto langsung dikirim setelah diambil. Gunakan kamera perangkat Anda.
      </p>
      {!homeView(home.data).checkIn && (
        <Alert title="Check-in belum tersedia">
          {homeView(home.data).reason}
        </Alert>
      )}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        aria-label="Pratinjau kamera"
        className="aspect-[4/3] w-full rounded-panel bg-ink object-cover"
      />
      {cameraError && (
        <Alert title="Kamera belum siap" tone="danger">
          {cameraError}
        </Alert>
      )}
      {captureError && (
        <Alert title="Foto belum dikirim" tone="danger">
          {captureError}
        </Alert>
      )}
      <CommandNotice
        status={command.status}
        error={command.error}
        retry={() => void command.retry()}
      />
      {command.status === 'conflict' && (
        <Alert title="Konteks check-in berubah" tone="warning">
          Kembali ke beranda untuk memeriksa catatan dan kelayakan terbaru.
          Ambil ulang hanya setelah hasil sebelumnya dipastikan.
        </Alert>
      )}
      <div className="flex flex-wrap gap-3">
        {cameraState === 'ready' ? (
          <Button
            busy={taking || command.status === 'submitting'}
            disabled={locked || !homeView(home.data).checkIn}
            onClick={() => void capture()}
          >
            Ambil foto dan check-in
          </Button>
        ) : (
          <Button
            busy={cameraState === 'opening'}
            disabled={locked || !homeView(home.data).checkIn}
            onClick={() => void startCamera()}
          >
            Buka kamera
          </Button>
        )}
        {locked && command.status !== 'submitting' && (
          <Button variant="secondary" onClick={() => void resolveOutcome()}>
            Periksa hasil di server
          </Button>
        )}
      </div>
      {home.data.day.attendance && (
        <Link
          className="block text-action underline"
          to={`/app/attendance/${home.data.day.attendance.id}`}
        >
          Lihat kehadiran yang tercatat
        </Link>
      )}
    </div>
  )
}
