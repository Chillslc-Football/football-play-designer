import { useAuth } from '../../hooks/useAuth'
import { useTeam } from '../../hooks/useTeam'
import './Header.css'

/**
 * The landing-page hero at the top of the app.
 * Sets the football theme and tells the user what the app does.
 */
export function Header() {
  const { user, signOut } = useAuth()
  const { team, activeTeamId, memberships, switchTeam } = useTeam()
  const email = user?.email ?? ''

  async function handleTeamChange(teamId: string) {
    const result = await switchTeam(teamId)
    if (result.error) {
      console.error('[Header] team switch failed', result.error)
    }
  }

  return (
    <header className="header">
      <div className="header-inner">
        {email && (
          <div className="header-user">
            <div className="header-team-row">
              <span className="header-user-label">Team:</span>
              {memberships.length > 1 ? (
                <select
                  className="select-field header-team-select"
                  value={activeTeamId ?? ''}
                  onChange={(event) => void handleTeamChange(event.target.value)}
                  aria-label="Active team"
                >
                  {memberships.map((membership) => (
                    <option key={membership.team.id} value={membership.team.id}>
                      {membership.team.name}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="header-team-name">{team?.name ?? '—'}</span>
              )}
            </div>

            <div className="header-account-row">
              <span className="header-signed-in">
                Signed in as:{' '}
                <span className="header-user-email" title={email}>
                  {email}
                </span>
              </span>
              <button type="button" className="btn header-logout-btn" onClick={() => signOut()}>
                Logout
              </button>
            </div>
          </div>
        )}

        <div className="header-brand">
          <div className="header-icon" aria-hidden="true">
            🏈
          </div>
          <h1 className="header-title">Football Play Designer MVP</h1>
          <p className="header-subtitle">
            Design, save, and mirror offensive plays — built for coaches.
          </p>
        </div>
      </div>
    </header>
  )
}
