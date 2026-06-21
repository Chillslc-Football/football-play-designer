import { useState, type FormEvent } from 'react'
import { DEFAULT_TEAM_FORMAT, TEAM_FORMAT_OPTIONS, type TeamFormat } from '../../types/teamFormat'
import '../../pages/AuthPages.css'
import './CreateTeamForm.css'

type CreateTeamFormProps = {
  idPrefix?: string
  submitLabel?: string
  submitting?: boolean
  error?: string | null
  onSubmit: (name: string, format: TeamFormat) => void | Promise<void>
  className?: string
}

export function CreateTeamForm({
  idPrefix = 'create-team',
  submitLabel = 'Create team',
  submitting = false,
  error = null,
  onSubmit,
  className,
}: CreateTeamFormProps) {
  const [teamName, setTeamName] = useState('')
  const [teamFormat, setTeamFormat] = useState<TeamFormat>(DEFAULT_TEAM_FORMAT)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    await onSubmit(teamName, teamFormat)
  }

  const formClassName = ['create-team-form', 'auth-form', className].filter(Boolean).join(' ')

  return (
    <form className={formClassName} onSubmit={handleSubmit}>
      {error && <p className="auth-error">{error}</p>}

      <div className="form-group">
        <label className="field-label" htmlFor={`${idPrefix}-name`}>
          Team name
        </label>
        <input
          id={`${idPrefix}-name`}
          className="input-field"
          type="text"
          required
          minLength={2}
          maxLength={120}
          placeholder="e.g. Varsity Offense"
          value={teamName}
          disabled={submitting}
          onChange={(event) => setTeamName(event.target.value)}
        />
      </div>

      <div className="form-group">
        <span className="field-label" id={`${idPrefix}-format-label`}>
          Team format
        </span>
        <div
          className="auth-format-options"
          role="radiogroup"
          aria-labelledby={`${idPrefix}-format-label`}
        >
          {TEAM_FORMAT_OPTIONS.map((option) => (
            <label key={option.value} className="auth-format-option">
              <input
                type="radio"
                name={`${idPrefix}-format`}
                value={option.value}
                checked={teamFormat === option.value}
                disabled={submitting}
                onChange={() => setTeamFormat(option.value)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
        <p className="auth-format-hint">
          Sets how many players appear in the Play Designer for this team.
        </p>
      </div>

      <button type="submit" className="btn btn-primary" disabled={submitting}>
        {submitting ? 'Creating team…' : submitLabel}
      </button>
    </form>
  )
}
