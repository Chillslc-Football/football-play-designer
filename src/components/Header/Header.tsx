import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useTeam } from '../../hooks/useTeam'
import type { PlayType } from '../../types/playType'
import { DeleteTeamDialog } from '../DeleteTeamDialog/DeleteTeamDialog'
import { FeedbackDialog } from '../FeedbackDialog/FeedbackDialog'
import { PlayTypeSelector } from '../PlayTypeSelector/PlayTypeSelector'
import './Header.css'

type HeaderProps = {
  playType: PlayType
  canEdit?: boolean
  onPlayTypeChange: (playType: PlayType) => void
  onTeamChange?: (teamId: string) => void
  onLogout?: () => void
}

export function Header({
  playType,
  canEdit = true,
  onPlayTypeChange,
  onTeamChange,
  onLogout,
}: HeaderProps) {
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
        <div className="header-brand">
          <h1 className="header-title">Football Play Designer MVP</h1>
        </div>

        <PlayTypeSelector
          playType={playType}
          canEdit={canEdit}
          onChange={onPlayTypeChange}
        />

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
              {isTeamOwner && team && (
                <button
                  type="button"
                  className="btn btn-danger header-action-btn"
                  onClick={handleDeleteTeamClick}
                >
                  Delete Team
                </button>
              )}
            </div>

            <button
              type="button"
              className="btn header-action-btn"
              onClick={() => setFeedbackOpen(true)}
            >
              Report Issue / Enhancement
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
