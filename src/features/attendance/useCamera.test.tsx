import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { cameraMessage, useCamera } from './useCamera'

function media() {
  const stop = vi.fn(),
    getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => [{ stop }] })
  vi.stubGlobal('isSecureContext', true)
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } })
  const video = document.createElement('video')
  vi.spyOn(video, 'play').mockResolvedValue()
  Object.defineProperties(video, {
    videoWidth: { value: 1280 },
    videoHeight: { value: 720 },
  })
  return { stop, getUserMedia, video }
}
describe('camera lifecycle', () => {
  it('requires secure context and maps permission/device errors clearly', async () => {
    vi.stubGlobal('isSecureContext', false)
    const hook = renderHook(() => useCamera())
    await act(() => hook.result.current.start())
    expect(hook.result.current.error).toContain('HTTPS')
    expect(cameraMessage({ name: 'NotAllowedError' })).toContain(
      'Izin kamera ditolak',
    )
    expect(cameraMessage({ name: 'NotFoundError' })).toContain(
      'tidak ditemukan',
    )
    expect(cameraMessage({ name: 'NotReadableError' })).toContain(
      'sedang digunakan',
    )
  })
  it('stops tracks on explicit close and unmount', async () => {
    const mock = media(),
      hook = renderHook(() => useCamera())
    hook.result.current.videoRef.current = mock.video
    await act(() => hook.result.current.start())
    expect(hook.result.current.state).toBe('ready')
    act(() => hook.result.current.stop())
    expect(mock.stop).toHaveBeenCalledOnce()
    await act(() => hook.result.current.start())
    hook.unmount()
    expect(mock.stop).toHaveBeenCalledTimes(2)
  })
  it('stops a stream whose permission arrives after unmount', async () => {
    const mock = media()
    let resolve!: (value: unknown) => void
    mock.getUserMedia.mockReturnValue(
      new Promise((done) => {
        resolve = done
      }),
    )
    const hook = renderHook(() => useCamera())
    hook.result.current.videoRef.current = mock.video
    let pending!: Promise<void>
    act(() => {
      pending = hook.result.current.start()
    })
    hook.unmount()
    await act(async () => {
      resolve({ getTracks: () => [{ stop: mock.stop }] })
      await pending
    })
    expect(mock.stop).toHaveBeenCalledOnce()
  })
  it('captures a fresh JPEG and stops the camera before returning its bytes', async () => {
    const mock = media(),
      drawImage = vi.fn(),
      photo = new Blob(['captured bytes'], { type: 'image/jpeg' })
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage,
    } as unknown as CanvasRenderingContext2D)
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(
      (callback) => callback(photo),
    )
    const hook = renderHook(() => useCamera())
    hook.result.current.videoRef.current = mock.video
    await act(() => hook.result.current.start())
    let result!: Blob
    await act(async () => {
      result = await hook.result.current.capture()
    })
    expect(result).toBe(photo)
    expect(drawImage).toHaveBeenCalledWith(mock.video, 0, 0)
    expect(mock.stop).toHaveBeenCalledOnce()
    expect(hook.result.current.state).toBe('idle')
  })
  it('does not fabricate a photo when the video/canvas is not ready', async () => {
    const mock = media(),
      hook = renderHook(() => useCamera())
    hook.result.current.videoRef.current = mock.video
    await expect(hook.result.current.capture()).rejects.toThrow('belum siap')
    await act(() => hook.result.current.start())
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    await expect(hook.result.current.capture()).rejects.toThrow(
      'belum mendukung',
    )
    hook.unmount()
    expect(mock.stop).toHaveBeenCalledOnce()
  })
})
