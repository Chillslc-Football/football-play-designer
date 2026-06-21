import { useEffect, useRef, useState } from 'react'
import '../ConfirmDialog/ConfirmDialog.css'
import './DeleteTeamDialog.css'

type DeleteTeamDialogProps = {
  open: boolean
  teamName: string
  isLastTeam: boolean
  deleting?: boolean
  error?: string | null
  onConfirm: () => void
  onCancel: () => void
}

export function DeleteTeamDialog({
  open,
  teamName,
  isLastTeam,
  deleting = false,
  error = null,
  onConfirm,
  onCancel,
}: DeleteTeamDialogProps) {
  const [typedName, setTypedName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) {
      setTypedName('')
      return
    }

    inputRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !deleting) {
        onCancel()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, deleting, onCancel])

  if (!open) return null

  const nameMatches = typedName.trim() === teamName.trim()

  return (
    <div
      className="confirm-dialog-overlay"
      role="presentation"
      onClick={(event) => {
        if (!deleting && event.target === event.currentTarget) {
          onCancel()
        }
      }}
    >
      <div
        className="confirm-dialog delete-team-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-team-dialog-title"
      >
        <h2 id="delete-team-dialog-title" className="delete-team-dialog-title">
          Delete Team
        </h2>
        <p className="delete-team-dialog-body">
          This will permanently delete the team.
        </p>
        <p className="delete-team-dialog-body">
          Plays and formations will be archived and can be imported into future teams.
        </p>
        <p className="delete-team-dialog-note">Archived assets include:</p>
        <ul className="delete-team-dialog-assets">
          <li>Plays</li>
          <li>Custom Formations</li>
        </ul>

        {isLastTeam && (
          <p className="delete-team-dialog-warning">
            This is your only team. Deleting it removes members and invites. You will need to
            create a new team to continue.
          </p>
        )}

        <label htmlFor="delete-team-name-confirm" className="field-label delete-team-dialog-label">
          Type <strong>{teamName}</strong> to confirm
        </label>
        <input
          ref={inputRef}
          id="delete-team-name-confirm"
          type="text"
          className="input-field delete-team-dialog-input"
          value={typedName}
          onChange={(event) => setTypedName(event.target.value)}
          placeholder={teamName}
          disabled={deleting}
          autoComplete="off"
        />

        {error && <p className="delete-team-dialog-error">{error}</p>}

        <div className="confirm-dialog-actions">
          <button type="button" className="btn" onClick={onCancel} disabled={deleting}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={onConfirm}
            disabled={!nameMatches || deleting}
          >
            {deleting ? 'Deleting…' : 'Delete Team'}
          </button>
        </div>
      </div>
    </div>
  )
}
