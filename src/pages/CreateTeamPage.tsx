import { useState } from 'react'
import { CreateTeamForm } from '../components/CreateTeamForm/CreateTeamForm'
import { useAuth } from '../hooks/useAuth'
import { useTeam } from '../hooks/useTeam'
import type { TeamFormat } from '../types/teamFormat'
import './AuthPages.css'

export function CreateTeamPage() {
  const { user, signOut } = useAuth()
  const { createTeam } = useTeam()
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(name: string, format: TeamFormat) {
    setError(null)
    setSubmitting(true)

    const result = await createTeam(name, format)
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

        <CreateTeamForm
          idPrefix="onboarding-create-team"
          submitting={submitting}
          error={error}
          onSubmit={handleSubmit}
        />

        <p className="auth-switch">
          <button type="button" onClick={() => signOut()}>
            Sign out
          </button>
        </p>
      </div>
    </div>
  )
}
