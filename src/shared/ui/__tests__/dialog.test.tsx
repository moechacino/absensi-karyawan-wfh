import { act, fireEvent, render, screen } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { ConfirmationDialog, Dialog } from '../Dialog'

// jsdom has no native top layer/focus trap. Mock only its native dialog methods.
const originalShow = Object.getOwnPropertyDescriptor(
  HTMLDialogElement.prototype,
  'showModal',
)
const originalClose = Object.getOwnPropertyDescriptor(
  HTMLDialogElement.prototype,
  'close',
)
beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.setAttribute('open', '')
    },
  })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.removeAttribute('open')
      this.dispatchEvent(new Event('close'))
    },
  })
})
afterAll(() => {
  if (originalShow)
    Object.defineProperty(
      HTMLDialogElement.prototype,
      'showModal',
      originalShow,
    )
  else Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal')
  if (originalClose)
    Object.defineProperty(HTMLDialogElement.prototype, 'close', originalClose)
  else Reflect.deleteProperty(HTMLDialogElement.prototype, 'close')
})

describe('controlled native dialog', () => {
  it('labels/describes itself, sets initial focus, and returns focus to the opener', () => {
    const close = vi.fn()
    const { rerender } = render(
      <>
        <button>Pemanggil</button>
        <Dialog
          open={false}
          title="Konfirmasi"
          description="Periksa perubahan"
          onClose={close}
        >
          Isi
        </Dialog>
      </>,
    )
    const opener = screen.getByRole('button', { name: 'Pemanggil' })
    act(() => opener.focus())
    rerender(
      <>
        <button>Pemanggil</button>
        <Dialog
          open
          title="Konfirmasi"
          description="Periksa perubahan"
          onClose={close}
        >
          Isi
        </Dialog>
      </>,
    )
    expect(
      screen.getByRole('dialog', { name: 'Konfirmasi' }),
    ).toHaveAccessibleDescription('Periksa perubahan')
    expect(screen.getByRole('heading', { name: 'Konfirmasi' })).toHaveFocus()
    rerender(
      <>
        <button>Pemanggil</button>
        <Dialog
          open={false}
          title="Konfirmasi"
          description="Periksa perubahan"
          onClose={close}
        >
          Isi
        </Dialog>
      </>,
    )
    expect(opener).toHaveFocus()
    expect(close).not.toHaveBeenCalled()
  })

  it('delegates Escape to the parent without uncontrolled native closure', () => {
    const close = vi.fn()
    render(
      <Dialog open title="Konfirmasi" onClose={close}>
        Isi
      </Dialog>,
    )
    const event = new Event('cancel', { cancelable: true })
    fireEvent(screen.getByRole('dialog'), event)
    expect(event.defaultPrevented).toBe(true)
    expect(close).toHaveBeenCalledOnce()
  })

  it('blocks cancel/close/confirm while pending and keeps the native dialog open', () => {
    const close = vi.fn(),
      confirm = vi.fn()
    render(
      <ConfirmationDialog
        open
        busy
        title="Perubahan"
        onClose={close}
        onConfirm={confirm}
      >
        Menunggu server
      </ConfirmationDialog>,
    )
    const dialog = screen.getByRole('dialog')
    fireEvent(dialog, new Event('cancel', { cancelable: true }))
    expect(screen.getByRole('button', { name: 'Tutup dialog' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Batalkan' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Menyimpan…' }))
    expect(close).not.toHaveBeenCalled()
    expect(confirm).not.toHaveBeenCalled()
    expect(dialog).toHaveAttribute('open')
  })

  it('calls confirm without pretending the command succeeded or closing itself', () => {
    const close = vi.fn(),
      confirm = vi.fn()
    render(
      <ConfirmationDialog
        open
        title="Perubahan"
        onClose={close}
        onConfirm={confirm}
      >
        Isi
      </ConfirmationDialog>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Konfirmasi' }))
    expect(confirm).toHaveBeenCalledOnce()
    expect(close).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toHaveAttribute('open')
  })

  it('supports a chosen initial focus and StrictMode without requesting a close', () => {
    const close = vi.fn()
    const initialFocus = { current: null as HTMLButtonElement | null }
    render(
      <StrictMode>
        <Dialog
          open
          title="Tinjau"
          onClose={close}
          initialFocusRef={initialFocus}
        >
          <button ref={initialFocus}>Pilihan aman</button>
        </Dialog>
      </StrictMode>,
    )
    expect(screen.getByRole('button', { name: 'Pilihan aman' })).toHaveFocus()
    expect(close).not.toHaveBeenCalled()
  })
})
