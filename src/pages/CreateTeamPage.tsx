import { useState, type FormEvent } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useTeam } from '../hooks/useTeam'
import './AuthPages.css'

export function CreateTeamPage() {
  const { user, signOut } = useAuth()
  const { createTeam } = useTeam()
  const [teamName, setTeamName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    const result = await createTeam(teamName)
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
            ? `Signed in as ${user.email}. Create a team to start designing plays.`
            : 'Create a team to start designing plays.'}
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
