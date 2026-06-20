import { useEffect, useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { useTeam } from '../../hooks/useTeam'
import * as playbookEmailRepository from '../../repositories/playbookEmailRepository'
import { handleModalBackdropMouseDown } from '../../utils/modalBackdrop'
import '../ConfirmDialog/ConfirmDialog.css'
import './SharePlaybookDialog.css'

type SharePlaybookDialogProps = {
  open: boolean
  onClose: () => void
}

export function SharePlaybookDialog({ open, onClose }: SharePlaybookDialogProps) {
  const { activeTeamId } = useTeam()
  const [email, setEmail] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) {
      setEmail('')
      setNote('')
      setError(null)
      setSubmitting(false)
      setSuccess(false)
      return
    }

    emailRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !submitting) {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, submitting, onClose])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()

    if (!activeTeamId) {
      setError('No team selected')
      return
    }

    setError(null)
    setSubmitting(true)

    try {
      await playbookEmailRepository.sendPlaybookEmail({
        teamId: activeTeamId,
        recipientEmail: email,
        note,
      })
      setSuccess(true)
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : 'Could not send playbook email'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return createPortal(
    <div
      className="confirm-dialog-overlay share-playbook-dialog-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (!submitting) {
          handleModalBackdropMouseDown(event, onClose)
        }
      }}
    >
      <div
        className="confirm-dialog share-playbook-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-playbook-dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 id="share-playbook-dialog-title" className="share-playbook-dialog-title">
          Share Playbook
        </h2>

        {success ? (
          <div className="share-playbook-success">
            <p className="share-playbook-success-message">Playbook email sent.</p>
            <p className="share-playbook-message">
              An email with a link to the playbook was sent to <strong>{email.trim()}</strong>.
            </p>
            <div className="confirm-dialog-actions">
              <button type="button" className="btn btn-primary" onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        ) : (
          <form className="share-playbook-form" onSubmit={handleSubmit}>
            <p className="share-playbook-message">
              Send a link to the team playbook. The recipient must already be a team member.
            </p>

            {error && <p className="auth-error">{error}</p>}

            <div className="form-group">
              <label className="field-label" htmlFor="share-playbook-email">
                Recipient Email
              </label>
              <input
                ref={emailRef}
                id="share-playbook-email"
                className="input-field"
                type="email"
                autoComplete="email"
                required
                disabled={submitting}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="field-label" htmlFor="share-playbook-note">
                Optional Note
              </label>
              <textarea
                id="share-playbook-note"
                className="input-field share-playbook-note"
                rows={3}
                disabled={submitting}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Add a message for the recipient…"
              />
            </div>

            <div className="confirm-dialog-actions">
              <button type="button" className="btn" onClick={onClose} disabled={submitting}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Sending…' : 'Send Playbook'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body,
  )
}
