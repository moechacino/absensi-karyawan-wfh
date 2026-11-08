import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
} from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createApiError } from '../../../shared/api/problem'
import { clearAccountState } from '../../../shared/query/cleanup'
import { QueryClient } from '@tanstack/react-query'
import {
  fileSizeLabel,
  safeDownloadName,
  validFileMetadata,
  verifiedImageBlob,
} from '../contentPath'
import type { FileMetadata } from '../contentPath'
import { usePrivateFile } from '../usePrivateFile'
import { useLocalPreview } from '../useLocalPreview'
import { PrivateImage } from '../PrivateImage'
import { PrivateFileViewer } from '../PrivateFileViewer'

const mocks = vi.hoisted(() => {
  const readFile = vi.fn()
  return {
    readFile,
    api: { readFile },
    actor: 'actor-one',
    status: 'authenticated',
    createUrl: vi.fn(),
    revokeUrl: vi.fn(),
  }
})
vi.mock('../../../shared/auth', () => ({
  useApi: () => mocks.api,
  useSession: () => ({
    profile: mocks.actor ? { id: mocks.actor } : null,
    status: mocks.status,
  }),
}))
const file: FileMetadata = {
  id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  fileName: 'bukti.png',
  mimeType: 'image/png',
  sizeBytes: 5,
  purpose: 'CHECK_IN_PHOTO',
  contentPath: '/api/v1/files/f47ac10b-58cc-4372-a567-0e02b2c3d479',
}
const image = () => new Blob(['bytes'], { type: 'image/png' })

beforeEach(() => {
  mocks.actor = 'actor-one'
  mocks.status = 'authenticated'
  mocks.readFile.mockReset().mockResolvedValue(image())
  mocks.createUrl.mockReset().mockReturnValue('blob:private-image')
  mocks.revokeUrl.mockReset()
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    writable: true,
    value: mocks.createUrl,
  })
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    writable: true,
    value: mocks.revokeUrl,
  })
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function () {
    this.open = false
  }
})

describe('private image reference validation', () => {
  it('accepts the exact metadata ID/path and refuses external, mismatched or PDF references', () => {
    expect(validFileMetadata(file)).toBe(true)
    for (const contentPath of [
      'https://other.example/file',
      `${file.contentPath}?token=private`,
      '/api/v1/files/another-id',
    ])
      expect(validFileMetadata({ ...file, contentPath })).toBe(false)
    expect(
      validFileMetadata({
        ...file,
        mimeType: 'application/pdf' as FileMetadata['mimeType'],
      }),
    ).toBe(false)
    expect(validFileMetadata({ ...file, sizeBytes: 0 })).toBe(false)
  })
  it('requires a complete blob with the verified metadata MIME and byte length', () => {
    expect(verifiedImageBlob(image(), file)).toBe(true)
    expect(
      verifiedImageBlob(new Blob(['bytes'], { type: 'image/svg+xml' }), file),
    ).toBe(false)
    expect(
      verifiedImageBlob(new Blob(['partial'], { type: 'image/png' }), file),
    ).toBe(false)
  })
  it('creates safe filenames and localized human-readable sizes', () => {
    expect(safeDownloadName('folder\\private/last\r\n.png')).toBe('last.png')
    expect(safeDownloadName('')).toBe('gambar')
    expect(fileSizeLabel(5)).toBe('5 B')
    expect(fileSizeLabel(1536)).toBe('1,5 KB')
  })
})

describe('private byte lifecycle', () => {
  it('passes current metadata/signal and revokes the object URL on unmount', async () => {
    const { result, unmount } = renderHook(() => usePrivateFile(file))
    await vi.waitFor(() =>
      expect(result.current.url).toBe('blob:private-image'),
    )
    expect(mocks.readFile).toHaveBeenCalledWith(file, expect.any(AbortSignal))
    const signal = mocks.readFile.mock.calls[0][1] as AbortSignal
    unmount()
    expect(signal.aborted).toBe(true)
    expect(mocks.revokeUrl).toHaveBeenCalledWith('blob:private-image')
  })
  it('does not fetch absent files, closed viewers, or another unauthenticated identity', () => {
    const { rerender } = renderHook(
      ({ enabled }) => usePrivateFile(file, enabled),
      { initialProps: { enabled: false } },
    )
    expect(mocks.readFile).not.toHaveBeenCalled()
    mocks.status = 'anonymous'
    rerender({ enabled: true })
    expect(mocks.readFile).not.toHaveBeenCalled()
  })
  it('rejects unsafe metadata before transport and refuses mismatched returned bytes', async () => {
    const unsafe = { ...file, contentPath: 'https://external.example/image' }
    const { result, rerender } = renderHook(
      ({ value }) => usePrivateFile(value),
      { initialProps: { value: unsafe } },
    )
    await vi.waitFor(() =>
      expect(result.current.error?.kind).toBe('configuration'),
    )
    expect(mocks.readFile).not.toHaveBeenCalled()
    mocks.readFile.mockResolvedValue(new Blob(['bad'], { type: 'text/html' }))
    rerender({ value: file })
    await vi.waitFor(() => expect(mocks.readFile).toHaveBeenCalledOnce())
    await vi.waitFor(() =>
      expect(result.current.error?.kind).toBe('configuration'),
    )
    expect(mocks.createUrl).not.toHaveBeenCalled()
  })
  it('clears URLs synchronously during account cleanup and ignores late content responses', async () => {
    let finish: ((blob: Blob) => void) | undefined
    mocks.readFile.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    const { result } = renderHook(() => usePrivateFile(file))
    await vi.waitFor(() => expect(finish).toBeDefined())
    await act(async () => clearAccountState(new QueryClient()))
    await act(async () => finish!(image()))
    expect(result.current.url).toBeNull()
    expect(mocks.createUrl).not.toHaveBeenCalled()
  })
  it('revokes already received bytes on identity change and creates a fresh authorized read', async () => {
    const { result, rerender } = renderHook(() => usePrivateFile(file))
    await vi.waitFor(() => expect(result.current.url).not.toBeNull())
    mocks.actor = 'actor-two'
    rerender()
    expect(mocks.revokeUrl).toHaveBeenCalledWith('blob:private-image')
    await vi.waitFor(() => expect(mocks.readFile).toHaveBeenCalledTimes(2))
  })
  it('exposes errors and only retries on an explicit callback', async () => {
    mocks.readFile.mockRejectedValueOnce(
      createApiError('http', { status: 503, retryAfter: '3' }),
    )
    const { result } = renderHook(() => usePrivateFile(file))
    await vi.waitFor(() => expect(result.current.error?.status).toBe(503))
    expect(mocks.readFile).toHaveBeenCalledOnce()
    act(() => result.current.retry())
    await vi.waitFor(() => expect(result.current.url).not.toBeNull())
    expect(mocks.readFile).toHaveBeenCalledTimes(2)
  })
})

describe('image components and local previews', () => {
  it('uses authenticated blob URLs and falls back to initials on display failure', async () => {
    render(<PrivateImage file={file} alt="Contoh Karyawan" />)
    await vi.waitFor(() =>
      expect(
        screen.getByRole('img', { name: 'Contoh Karyawan' }),
      ).toHaveAttribute('src', 'blob:private-image'),
    )
    const img = screen.getByRole('img', { name: 'Contoh Karyawan' })
    expect(img).toHaveAttribute('src', 'blob:private-image')
    fireEvent.error(img)
    expect(
      screen.getByRole('img', { name: 'Contoh Karyawan' }),
    ).toHaveTextContent('CK')
  })
  it('creates/revokes unsent local previews without fetching/uploading or retaining removed selections', async () => {
    const selected = new File(['bytes'], 'photo.png', { type: 'image/png' })
    const { result, rerender } = renderHook(
      ({ value }) => useLocalPreview(value),
      { initialProps: { value: selected as File | null } },
    )
    await vi.waitFor(() => expect(result.current).toBe('blob:private-image'))
    expect(mocks.readFile).not.toHaveBeenCalled()
    rerender({ value: null })
    expect(result.current).toBeNull()
    expect(mocks.revokeUrl).toHaveBeenCalledWith('blob:private-image')
  })
  it('supports zoom and a local download fallback, revoking bytes when the viewer closes', async () => {
    const { rerender } = render(
      <PrivateFileViewer file={file} open onClose={vi.fn()} />,
    )
    const zoom = await screen.findByRole('button', { name: 'Perbesar gambar' })
    fireEvent.click(zoom)
    expect(
      screen.getByRole('button', { name: 'Ukuran normal' }),
    ).toBeInTheDocument()
    const download = screen.getByRole('link', { name: 'Unduh gambar' })
    expect(download).toHaveAttribute('href', 'blob:private-image')
    expect(download).toHaveAttribute('download', 'bukti.png')
    fireEvent.error(screen.getByRole('img', { name: 'bukti.png' }))
    expect(screen.getByRole('status')).toHaveTextContent(
      'Pratinjau tidak dapat ditampilkan',
    )
    rerender(<PrivateFileViewer file={file} open={false} onClose={vi.fn()} />)
    expect(mocks.revokeUrl).toHaveBeenCalledWith('blob:private-image')
  })
  it('shows generic inaccessible content and respects explicit Retry-After before reauthorization', async () => {
    vi.useFakeTimers()
    mocks.readFile.mockRejectedValueOnce(
      createApiError('http', { status: 503, retryAfter: '2' }),
    )
    render(<PrivateFileViewer file={file} open onClose={vi.fn()} />)
    await act(async () => {})
    expect(
      screen.getByRole('button', { name: 'Muat ulang dalam 2 detik' }),
    ).toBeDisabled()
    expect(mocks.readFile).toHaveBeenCalledOnce()
    await act(async () => vi.advanceTimersByTimeAsync(2000))
    fireEvent.click(screen.getByRole('button', { name: 'Muat ulang gambar' }))
    await act(async () => {})
    expect(mocks.readFile).toHaveBeenCalledTimes(2)
  })
  it('shows the same generic file-not-found message without exposing ownership', async () => {
    mocks.readFile.mockRejectedValueOnce(
      createApiError('http', { status: 404 }),
    )
    render(<PrivateFileViewer file={file} open onClose={vi.fn()} />)
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Gambar tidak tersedia atau tidak dapat diakses.',
    )
    expect(screen.queryByText(/pemilik/i)).not.toBeInTheDocument()
  })
})
