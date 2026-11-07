import { useEffect, useId, useRef } from 'react'
import type { PropsWithChildren, ReactNode, RefObject } from 'react'
import { Button, IconButton } from './Button'

interface DialogProps {
  open: boolean
  title: string
  description?: string
  onClose: () => void
  busy?: boolean
  footer?: ReactNode
  initialFocusRef?: RefObject<HTMLElement | null>
}

export function Dialog({
  open,
  title,
  description,
  onClose,
  busy,
  footer,
  children,
  initialFocusRef,
}: PropsWithChildren<DialogProps>) {
  const id = useId()
  const dialog = useRef<HTMLDialogElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const ignoredCloseEvents = useRef(0)

  useEffect(() => {
    const node = dialog.current
    if (!node || !open) return
    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    if (!node.open) node.showModal()
    const initialFocus = initialFocusRef?.current ?? heading.current
    initialFocus?.focus({ preventScroll: true })
    return () => {
      if (node.open) {
        ignoredCloseEvents.current += 1
        node.close()
      }
      if (previousFocus?.isConnected)
        previousFocus.focus({ preventScroll: true })
    }
  }, [open, initialFocusRef])

  return (
    <dialog
      ref={dialog}
      aria-labelledby={`${id}-title`}
      aria-describedby={description ? `${id}-description` : undefined}
      aria-busy={busy || undefined}
      className="fixed inset-0 m-auto max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] max-w-xl overflow-y-auto rounded-panel bg-surface p-0 text-ink shadow-xl backdrop:bg-ink/40"
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) onClose()
      }}
      onClose={() => {
        if (ignoredCloseEvents.current) {
          ignoredCloseEvents.current -= 1
          return
        }
        if (!open) return
        if (busy) {
          dialog.current?.showModal()
          return
        }
        onClose()
      }}
    >
      <div className="space-y-4 p-6">
        <div className="flex items-start justify-between gap-3">
          <h2
            ref={heading}
            tabIndex={-1}
            id={`${id}-title`}
            className="min-w-0 text-title font-medium outline-none [overflow-wrap:anywhere]"
          >
            {title}
          </h2>
          <IconButton
            label="Tutup dialog"
            icon="close"
            disabled={busy}
            onClick={onClose}
          />
        </div>
        {description && (
          <p
            id={`${id}-description`}
            className="text-small text-text-muted [overflow-wrap:anywhere]"
          >
            {description}
          </p>
        )}
        <div className="min-w-0 [overflow-wrap:anywhere]">{children}</div>
        {footer && (
          <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-4">
            {footer}
          </div>
        )}
      </div>
    </dialog>
  )
}

export function ConfirmationDialog({
  onConfirm,
  confirmLabel = 'Konfirmasi',
  busyLabel = 'Menyimpan…',
  danger,
  children,
  ...props
}: PropsWithChildren<
  Omit<DialogProps, 'footer'> & {
    onConfirm: () => void
    confirmLabel?: string
    busyLabel?: string
    danger?: boolean
  }
>) {
  return (
    <Dialog
      {...props}
      footer={
        <>
          <Button
            variant="secondary"
            disabled={props.busy}
            onClick={props.onClose}
          >
            Batalkan
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            busy={props.busy}
            busyLabel={busyLabel}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Dialog>
  )
}
