import { useState, type FormEvent } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useTeam } from '../hooks/useTeam'
import { DEFAULT_TEAM_FORMAT, TEAM_FORMAT_OPTIONS, type TeamFormat } from '../types/teamFormat'
import './AuthPages.css'

export function CreateTeamPage() {
  const { user, signOut } = useAuth()
  const { createTeam } = useTeam()
  const [teamName, setTeamName] = useState('')
  const [teamFormat, setTeamFormat] = useState<TeamFormat>(DEFAULT_TEAM_FORMAT)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    const result = await createTeam(teamName, teamFormat)
    if (result.error) {
      setError(result.error)
    }

    setSubmitting(false)
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Create your team</h1>
        <p className="auth-card-subtitle">
          {user?.email
            ? `Signed in as ${user.email}. Create a team to get started, or use an invite link to join an existing team.`
            : 'Create a team to get started, or use an invite link to join an existing team.'}
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <p className="auth-error">{error}</p>}

          <div className="form-group">
            <label className="field-label" htmlFor="team-name">
              Team name
            </label>
            <input
              id="team-name"
              className="input-field"
              type="text"
              required
              minLength={2}
              maxLength={120}
              placeholder="e.g. Varsity Offense"
              value={teamName}
              onChange={(event) => setTeamName(event.target.value)}
            />
          </div>

          <div className="form-group">
            <span className="field-label" id="team-format-label">
              Team format
            </span>
            <div className="auth-format-options" role="radiogroup" aria-labelledby="team-format-label">
              {TEAM_FORMAT_OPTIONS.map((option) => (
                <label key={option.value} className="auth-format-option">
                  <input
                    type="radio"
                    name="team-format"
                    value={option.value}
                    checked={teamFormat === option.value}
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
            {submitting ? 'Creating team…' : 'Create team'}
          </button>
        </form>

        <p className="auth-switch">
          <button type="button" onClick={() => signOut()}>
            Sign out
          </button>
        </p>
      </div>
    </div>
  )
}
