import { useEffect, useState } from 'react'
import { CreateTeamForm } from '../CreateTeamForm/CreateTeamForm'
import { useTeam } from '../../hooks/useTeam'
import type { TeamFormat } from '../../types/teamFormat'
import '../ConfirmDialog/ConfirmDialog.css'
import './CreateTeamDialog.css'

type CreateTeamDialogProps = {
  open: boolean
  onClose: () => void
  onCreated?: () => void
}

export function CreateTeamDialog({ open, onClose, onCreated }: CreateTeamDialogProps) {
  const { createTeam } = useTeam()
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formKey, setFormKey] = useState(0)

  useEffect(() => {
    if (!open) {
      setError(null)
      setSubmitting(false)
      setFormKey((current) => current + 1)
    }
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

  if (!open) return null

  async function handleSubmit(name: string, format: TeamFormat) {
    setError(null)
    setSubmitting(true)

    const result = await createTeam(name, format)
    setSubmitting(false)

    if (result.error) {
      setError(result.error)
      return
    }

    onCreated?.()
    onClose()
  }

  return (
    <div
      className="confirm-dialog-overlay"
      role="presentation"
      onClick={(event) => {
        if (!submitting && event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        className="confirm-dialog create-team-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-team-dialog-title"
      >
        <h2 id="create-team-dialog-title" className="create-team-dialog-title">
          Create New Team
        </h2>
        <p className="create-team-dialog-message">
          Start a team you own. Your memberships on other teams stay unchanged.
        </p>

        <CreateTeamForm
          key={formKey}
          idPrefix="create-team-dialog"
          submitLabel="Create team"
          submitting={submitting}
          error={error}
          onSubmit={handleSubmit}
        />

        <div className="create-team-dialog-footer">
          <button type="button" className="btn" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
