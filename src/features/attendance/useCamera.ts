import { registerAccountCleanup } from '../../shared/query/cleanup'
import { useEffect, useRef, useState } from 'react'

export function cameraMessage(error: unknown): string {
  const name =
    error && typeof error === 'object' && 'name' in error ? error.name : ''
  if (name === 'NotAllowedError' || name === 'SecurityError')
    return 'Izin kamera ditolak. Izinkan kamera melalui pengaturan browser lalu coba lagi.'
  if (name === 'NotFoundError')
    return 'Kamera tidak ditemukan pada perangkat ini.'
  if (name === 'NotReadableError')
    return 'Kamera sedang digunakan atau belum dapat diakses.'
  return 'Kamera belum dapat dibuka. Periksa perangkat lalu coba lagi.'
}
export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const generation = useRef(0)
  const starting = useRef(false)
  const [state, setState] = useState<'idle' | 'opening' | 'ready' | 'error'>(
    'idle',
  )
  const [error, setError] = useState<string | null>(null)
  function release() {
    stream.current?.getTracks().forEach((track) => track.stop())
    stream.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }
  function stop() {
    generation.current++
    starting.current = false
    release()
    setState('idle')
  }
  useEffect(() => {
    const dispose = () => {
      generation.current++
      release()
    }
    const unregister = registerAccountCleanup(dispose)
    return () => {
      unregister()
      dispose()
    }
  }, [])
  async function start() {
    if (starting.current) return
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError(
        'Kamera memerlukan HTTPS atau localhost pada browser yang mendukungnya.',
      )
      setState('error')
      return
    }
    const current = ++generation.current
    starting.current = true
    release()
    setState('opening')
    setError(null)
    try {
      const next = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })
      if (generation.current !== current) {
        next.getTracks().forEach((track) => track.stop())
        return
      }
      stream.current = next
      if (!videoRef.current) {
        release()
        return
      }
      videoRef.current.srcObject = next
      await videoRef.current.play()
      if (generation.current === current) setState('ready')
    } catch (failure) {
      if (generation.current === current) {
        release()
        setError(cameraMessage(failure))
        setState('error')
      }
    } finally {
      if (generation.current === current) starting.current = false
    }
  }
  async function capture(): Promise<Blob> {
    const video = videoRef.current
    if (!video || state !== 'ready' || !video.videoWidth || !video.videoHeight)
      throw new Error('Pratinjau kamera belum siap.')
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Perangkat belum mendukung pengambilan foto.')
    context.drawImage(video, 0, 0)
    const photo = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(new Error('Foto belum dapat diambil.')),
        'image/jpeg',
        0.85,
      ),
    )
    // Accepted planning limit; server independently validates bytes and policy.
    if (
      photo.type !== 'image/jpeg' ||
      photo.size === 0 ||
      photo.size > 5 * 1024 * 1024
    )
      throw new Error(
        'Foto harus JPEG dan maksimal 5 MiB. Silakan ambil ulang.',
      )
    stop()
    return photo
  }
  return { videoRef, state, error, start, stop, capture }
}
