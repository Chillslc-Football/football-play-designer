import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useTeam } from '../../hooks/useTeam'
import { DeleteTeamDialog } from '../DeleteTeamDialog/DeleteTeamDialog'
import { FeedbackDialog } from '../FeedbackDialog/FeedbackDialog'
import './Header.css'

type HeaderProps = {
  onTeamChange?: (teamId: string) => void
  onLogout?: () => void
}

/**
 * The landing-page hero at the top of the app.
 * Sets the football theme and tells the user what the app does.
 */
export function Header({ onTeamChange, onLogout }: HeaderProps) {
  const { user, signOut } = useAuth()
  const { team, activeTeamId, memberships, role, deleteTeam } = useTeam()
  const email = user?.email ?? ''
  const userId = user?.id ?? ''
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [deleteTeamOpen, setDeleteTeamOpen] = useState(false)
  const [deleteTeamError, setDeleteTeamError] = useState<string | null>(null)
  const [deletingTeam, setDeletingTeam] = useState(false)

  const isTeamOwner = role === 'team_owner'
  const isLastTeam = memberships.length <= 1

  function handleTeamChange(teamId: string) {
    if (onTeamChange) {
      onTeamChange(teamId)
      return
    }
  }

  function handleLogout() {
    if (onLogout) {
      onLogout()
      return
    }
    void signOut()
  }

  function handleDeleteTeamClick() {
    if (!isTeamOwner || !team) return
    setDeleteTeamError(null)
    setDeleteTeamOpen(true)
  }

  async function handleConfirmDeleteTeam() {
    if (!team || !activeTeamId) return

    setDeletingTeam(true)
    setDeleteTeamError(null)

    const result = await deleteTeam(activeTeamId)
    setDeletingTeam(false)

    if (result.error) {
      setDeleteTeamError(result.error)
      return
    }

    setDeleteTeamOpen(false)
  }

  return (
    <header className="header">
      {team && (
        <DeleteTeamDialog
          open={deleteTeamOpen}
          teamName={team.name}
          isLastTeam={isLastTeam}
          deleting={deletingTeam}
          error={deleteTeamError}
          onConfirm={() => void handleConfirmDeleteTeam()}
          onCancel={() => {
            if (deletingTeam) return
            setDeleteTeamOpen(false)
            setDeleteTeamError(null)
          }}
        />
      )}
      {userId && (
        <FeedbackDialog
          open={feedbackOpen}
          userId={userId}
          teamId={activeTeamId}
          onClose={() => setFeedbackOpen(false)}
        />
      )}

      <div className="header-inner">
        {email && (
          <div className="header-user">
            <div className="header-team-row">
              <span className="header-user-label">Team:</span>
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
              {isTeamOwner && team && (
                <button
                  type="button"
                  className="btn btn-danger header-delete-team-btn"
                  onClick={handleDeleteTeamClick}
                >
                  Delete Team
                </button>
              )}
            </div>

            <div className="header-account-row">
              <span className="header-signed-in">
                Signed in as:{' '}
                <span className="header-user-email" title={email}>
                  {email}
                </span>
              </span>
              <button
                type="button"
                className="btn header-feedback-btn"
                onClick={() => setFeedbackOpen(true)}
              >
                Report Issue / Enhancement
              </button>
              <button type="button" className="btn header-logout-btn" onClick={handleLogout}>
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
