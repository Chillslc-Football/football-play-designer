import { useEffect, useRef } from 'react'
import { handleModalBackdropMouseDown } from '../../utils/modalBackdrop'
import '../ConfirmDialog/ConfirmDialog.css'
import './SavePlaybookPdfDialog.css'

export const SAVE_PLAYBOOK_PDF_MESSAGE =
  'Choose Save as PDF in the print window, then attach the file to your email.'

type SavePlaybookPdfDialogProps = {
  open: boolean
  onContinue: () => void
  onCancel: () => void
}

export function SavePlaybookPdfDialog({
  open,
  onContinue,
  onCancel,
}: SavePlaybookPdfDialogProps) {
  const continueRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return

    continueRef.current?.focus()

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
      className="confirm-dialog-overlay save-playbook-pdf-dialog-overlay"
      role="presentation"
      onMouseDown={(event) => handleModalBackdropMouseDown(event, onCancel)}
    >
      <div
        className="confirm-dialog save-playbook-pdf-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-playbook-pdf-title"
        aria-describedby="save-playbook-pdf-message"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 id="save-playbook-pdf-title" className="save-playbook-pdf-dialog-title">
          Save Playbook as PDF
        </h2>

        <p id="save-playbook-pdf-message" className="save-playbook-pdf-dialog-message">
          {SAVE_PLAYBOOK_PDF_MESSAGE}
        </p>

        <div className="save-playbook-pdf-dialog-actions">
          <button ref={continueRef} type="button" className="btn btn-primary" onClick={onContinue}>
            Continue
          </button>
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
