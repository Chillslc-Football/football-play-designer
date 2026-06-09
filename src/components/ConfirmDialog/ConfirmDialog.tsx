import { useEffect, useRef } from 'react'
import './ConfirmDialog.css'

export type ConfirmDialogVariant = 'delete' | 'unsaved'

type ConfirmDialogProps = {
  open: boolean
  message: string
  variant: ConfirmDialogVariant
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
  onSave?: () => void
  onDiscard?: () => void
}

export function ConfirmDialog({
  open,
  message,
  variant,
  confirmLabel = 'Delete',
  onConfirm,
  onCancel,
  onSave,
  onDiscard,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return

    cancelRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onCancel()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div
      className="confirm-dialog-overlay"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onCancel()
        }
      }}
    >
      <div
        className="confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-message"
      >
        <p id="confirm-dialog-message" className="confirm-dialog-message">
          {message}
        </p>

        <div className="confirm-dialog-actions">
          {variant === 'unsaved' ? (
            <>
              <button type="button" className="btn btn-primary" onClick={onSave}>
                Save Changes
              </button>
              <button type="button" className="btn" onClick={onDiscard}>
                Discard Changes
              </button>
              <button ref={cancelRef} type="button" className="btn" onClick={onCancel}>
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                ref={cancelRef}
                type="button"
                className="btn"
                onClick={onCancel}
              >
                Cancel
              </button>
              <button type="button" className="btn btn-danger" onClick={onConfirm}>
                {confirmLabel}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
