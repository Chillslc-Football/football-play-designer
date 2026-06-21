import { useState } from 'react'
import { useAppShell } from '../../context/AppShellContext'
import { useAppAdmin } from '../../hooks/useAppAdmin'
import { useAuth } from '../../hooks/useAuth'
import { useTeam } from '../../hooks/useTeam'
import { TEAM_ROLE_LABELS } from '../../utils/roleLabels'
import { FeedbackDialog } from '../FeedbackDialog/FeedbackDialog'
import { FeedbackReviewDialog } from '../FeedbackReviewDialog/FeedbackReviewDialog'
import { HelpDialog } from '../HelpDialog/HelpDialog'
import { AppShellNav } from '../AppShellNav/AppShellNav'
import './Header.css'

type HeaderProps = {
  onTeamChange?: (teamId: string) => void
  onLogout?: () => void
}

export function Header({ onTeamChange, onLogout }: HeaderProps) {
  const shell = useAppShell()
  const { user, signOut } = useAuth()
  const { team, activeTeamId, memberships, role } = useTeam()
  const isAppAdmin = useAppAdmin()
  const email = user?.email ?? ''
  const userId = user?.id ?? ''
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [feedbackReviewOpen, setFeedbackReviewOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

  const isTeamManagementView = shell?.view === 'team-management'

  function openTeamManagement() {
    shell?.setView('team-management')
  }

  function handleTeamChange(teamId: string) {
    if (onTeamChange) {
      onTeamChange(teamId)
    }
  }

  function handleLogout() {
    if (onLogout) {
      onLogout()
      return
    }
    void signOut()
  }

  return (
    <header className="header no-print">
      {userId && (
        <FeedbackDialog
          open={feedbackOpen}
          userId={userId}
          teamId={activeTeamId}
          onClose={() => setFeedbackOpen(false)}
        />
      )}
      {isAppAdmin && (
        <FeedbackReviewDialog
          open={feedbackReviewOpen}
          onClose={() => setFeedbackReviewOpen(false)}
        />
      )}
      <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />

      <div className="header-inner">
        <div className="header-brand">
          <a
            className="header-brand-link"
            href="https://www.winnerschoiceplaybook.com/"
            rel="noopener noreferrer"
          >
            <h1 className="header-title">Winner&apos;s Choice</h1>
          </a>
        </div>

        <AppShellNav />

        <div className="header-spacer" aria-hidden="true" />

        {email && (
          <div className="header-actions">
            <div className="header-team-group">
              <span className="header-user-label">Team</span>
              {memberships.length > 1 ? (
                <select
                  className="select-field header-team-select"
                  value={activeTeamId ?? ''}
                  onChange={(event) => handleTeamChange(event.target.value)}
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
              {role && (
                <span className="header-role-badge" title="Your team role">
                  {TEAM_ROLE_LABELS[role]}
                </span>
              )}
              {team && (
                <button
                  type="button"
                  className={`btn header-action-btn${isTeamManagementView ? ' is-active' : ''}`}
                  aria-current={isTeamManagementView ? 'page' : undefined}
                  onClick={openTeamManagement}
                >
                  Team Management
                </button>
              )}
            </div>

            {isAppAdmin && (
              <button
                type="button"
                className="btn header-action-btn"
                onClick={() => setFeedbackReviewOpen(true)}
              >
                View Issues / Enhancements
              </button>
            )}

            <button
              type="button"
              className="btn header-action-btn"
              onClick={() => setFeedbackOpen(true)}
            >
              Report Issue / Enhancement
            </button>

            <button
              type="button"
              className="btn header-action-btn"
              onClick={() => setHelpOpen(true)}
            >
              Help
            </button>

            <div className="header-account-group">
              <span className="header-user-email" title={email}>
                {email}
              </span>
              <button type="button" className="btn header-action-btn" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
