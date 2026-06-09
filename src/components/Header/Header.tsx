import { useAuth } from '../../hooks/useAuth'
import { useTeam } from '../../hooks/useTeam'
import './Header.css'

/**
 * The landing-page hero at the top of the app.
 * Sets the football theme and tells the user what the app does.
 */
export function Header() {
  const { user, signOut } = useAuth()
  const { team } = useTeam()
  const email = user?.email ?? ''

  return (
    <header className="header">
      <div className="header-inner">
        {email && (
          <div className="header-user">
            <span className="header-user-email" title={email}>
              {email}
            </span>
            <button type="button" className="btn header-logout-btn" onClick={() => signOut()}>
              Logout
            </button>
          </div>
        )}

        <div className="header-brand">
          <div className="header-icon" aria-hidden="true">
            🏈
          </div>
          <h1 className="header-title">Football Play Designer MVP</h1>
          {team && <p className="header-team-name">{team.name}</p>}
          <p className="header-subtitle">
            Design, save, and mirror offensive plays — built for coaches.
          </p>
        </div>
      </div>
    </header>
  )
}
