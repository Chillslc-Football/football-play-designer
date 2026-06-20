import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { ConfirmDialog } from '../components/ConfirmDialog/ConfirmDialog'
import { DeleteTeamDialog } from '../components/DeleteTeamDialog/DeleteTeamDialog'
import { InviteMemberDialog } from '../components/InviteMemberDialog/InviteMemberDialog'
import { PageToolbarLayout } from '../components/PageToolbarLayout/PageToolbarLayout'
import { APP_DISPLAY_THEME } from '../constants/appDisplayTheme'
import { useAppShell } from '../context/AppShellContext'
import { useAuth } from '../hooks/useAuth'
import { useCanEdit } from '../hooks/useCanEdit'
import { useTeam } from '../hooks/useTeam'
import * as inviteRepository from '../repositories/inviteRepository'
import * as teamRepository from '../repositories/teamRepository'
import { INVITE_ROLE_LABELS } from '../types/invite'
import type { RosterRow } from '../types/teamRoster'
import { buildAcceptInviteUrl } from '../utils/inviteToken'
import { TEAM_ROLE_LABELS } from '../utils/roleLabels'
import { TEAM_FORMAT_OPTIONS } from '../types/teamFormat'
import {
  buildRosterRows,
  canRemoveTeamMember,
  formatRosterDate,
  rosterEmailLabel,
  rosterNameLabel,
} from '../utils/teamRosterUtils'
import './TeamManagementPage.css'

function roleLabel(row: RosterRow): string {
  if (row.kind === 'member') {
    return TEAM_ROLE_LABELS[row.role]
  }

  return INVITE_ROLE_LABELS[row.role]
}

function statusClassName(status: RosterRow['status']): string {
  switch (status) {
    case 'Active':
      return 'team-roster-status is-active'
    case 'Pending':
      return 'team-roster-status is-pending'
    case 'Expired':
      return 'team-roster-status is-expired'
    case 'Revoked':
      return 'team-roster-status is-revoked'
    default:
      return 'team-roster-status'
  }
}

export function TeamManagementPage() {
  const shell = useAppShell()
  const setPageToolbar = shell?.setPageToolbar
  const { user } = useAuth()
  const { team, activeTeamId, role, displayName, memberships, deleteTeam } = useTeam()
  const canEdit = useCanEdit()
  const isTeamOwner = role === 'team_owner'
  const isLastTeam = memberships.length <= 1

  const userEmail = user?.email?.trim() || null
  const userLabel = displayName || userEmail || '—'
  const roleLabelText = role ? TEAM_ROLE_LABELS[role] : '—'
  const formatLabel =
    TEAM_FORMAT_OPTIONS.find((option) => option.value === team?.format)?.label ?? '11v11 (standard)'

  const [rows, setRows] = useState<RosterRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [revokeTargetId, setRevokeTargetId] = useState<string | null>(null)
  const [revoking, setRevoking] = useState(false)
  const [removeTargetUserId, setRemoveTargetUserId] = useState<string | null>(null)
  const [removing, setRemoving] = useState(false)
  const [resendingInviteId, setResendingInviteId] = useState<string | null>(null)
  const [copiedRowId, setCopiedRowId] = useState<string | null>(null)
  const [deleteTeamOpen, setDeleteTeamOpen] = useState(false)
  const [deleteTeamError, setDeleteTeamError] = useState<string | null>(null)
  const [deletingTeam, setDeletingTeam] = useState(false)

  const loadRoster = useCallback(async () => {
    if (!activeTeamId) return

    setLoading(true)
    setError(null)

    try {
      const [members, invites] = await Promise.all([
        inviteRepository.fetchTeamMembersForTeam(activeTeamId),
        inviteRepository.fetchTeamInvitesForTeam(activeTeamId, { includeToken: canEdit }),
      ])

      setRows(buildRosterRows(members, invites))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load team roster')
    } finally {
      setLoading(false)
    }
  }, [activeTeamId, canEdit])

  useEffect(() => {
    void loadRoster()
  }, [loadRoster])

  useLayoutEffect(() => {
    if (!setPageToolbar) return

    setPageToolbar(
      <PageToolbarLayout
        actions={
          canEdit ? (
            <button type="button" className="btn btn-primary" onClick={() => setInviteOpen(true)}>
              Invite Member
            </button>
          ) : null
        }
      />,
    )

    return () => {
      setPageToolbar(null)
    }
  }, [setPageToolbar, canEdit])

  async function handleCopyInviteLink(row: RosterRow) {
    if (!canEdit || !row.token) return

    setActionError(null)

    try {
      await navigator.clipboard.writeText(buildAcceptInviteUrl(row.token))
      setCopiedRowId(row.id)
      window.setTimeout(() => {
        setCopiedRowId((current) => (current === row.id ? null : current))
      }, 2000)
    } catch {
      setActionError('Could not copy invite link. Try again or copy it manually.')
    }
  }

  async function handleResendInvite(row: RosterRow) {
    if (!canEdit || !row.token || !row.invite_id) return

    setActionError(null)
    setResendingInviteId(row.invite_id)

    try {
      await inviteRepository.sendTeamInviteEmail(row.token)
    } catch (resendError) {
      setActionError(
        resendError instanceof Error ? resendError.message : 'Could not resend invite email',
      )
    } finally {
      setResendingInviteId(null)
    }
  }

  async function handleConfirmRevoke() {
    if (!canEdit || !revokeTargetId) return

    setRevoking(true)
    setActionError(null)
    setActionSuccess(null)

    try {
      await inviteRepository.revokeTeamInvite(revokeTargetId)
      setRevokeTargetId(null)
      await loadRoster()
    } catch (revokeError) {
      setActionError(
        revokeError instanceof Error ? revokeError.message : 'Could not revoke invite',
      )
      setRevokeTargetId(null)
    } finally {
      setRevoking(false)
    }
  }

  async function handleConfirmRemoveMember() {
    if (!canEdit || !activeTeamId || !removeTargetUserId) return

    setRemoving(true)
    setActionError(null)
    setActionSuccess(null)

    try {
      await teamRepository.removeTeamMember(activeTeamId, removeTargetUserId)
      setRemoveTargetUserId(null)
      setActionSuccess('Member removed from the team.')
      await loadRoster()
    } catch (removeError) {
      setActionError(
        removeError instanceof Error ? removeError.message : 'Could not remove member',
      )
      setRemoveTargetUserId(null)
    } finally {
      setRemoving(false)
    }
  }

  function inviteMeta(row: RosterRow): string | null {
    if (row.kind !== 'invite') {
      return null
    }

    const parts: string[] = []
    const created = formatRosterDate(row.created_at)
    const expires = formatRosterDate(row.expires_at)

    if (created) {
      parts.push(`Invited ${created}`)
    }

    if (expires) {
      parts.push(`Expires ${expires}`)
    }

    return parts.length > 0 ? parts.join(' · ') : null
  }

  function handleDeleteTeamClick() {
    if (!isTeamOwner || !team) return
    setDeleteTeamError(null)
    setDeleteTeamOpen(true)
  }

  async function handleConfirmDeleteTeam() {
    if (!team || !activeTeamId || !isTeamOwner) return

    setDeletingTeam(true)
    setDeleteTeamError(null)

    console.log('[TeamManagementPage] delete team confirm', {
      teamId: activeTeamId,
      teamName: team.name,
      role,
    })

    const result = await deleteTeam(activeTeamId)
    setDeletingTeam(false)

    if (result.error) {
      console.error('[TeamManagementPage] delete team failed', {
        teamId: activeTeamId,
        role,
        error: result.error,
      })
      setDeleteTeamError(result.error)
      return
    }

    console.log('[TeamManagementPage] delete team succeeded', { teamId: activeTeamId })
    setDeleteTeamOpen(false)
  }

  return (
    <div className={`team-management-page app-shell-page app-theme-${APP_DISPLAY_THEME}`}>
      {canEdit && activeTeamId && (
        <InviteMemberDialog
          open={inviteOpen}
          teamId={activeTeamId}
          onClose={() => {
            setInviteOpen(false)
            void loadRoster()
          }}
        />
      )}

      {canEdit && (
        <ConfirmDialog
          open={removeTargetUserId !== null}
          message="Remove this person from the team? Their account will stay active, but they will lose access to this team."
          variant="delete"
          confirmLabel={removing ? 'Removing…' : 'Remove from team'}
          onConfirm={() => void handleConfirmRemoveMember()}
          onCancel={() => {
            if (removing) return
            setRemoveTargetUserId(null)
          }}
        />
      )}

      {canEdit && (
        <ConfirmDialog
          open={revokeTargetId !== null}
          message="Revoke this invite? The invite link will no longer work."
          variant="delete"
          confirmLabel={revoking ? 'Revoking…' : 'Revoke invite'}
          onConfirm={() => void handleConfirmRevoke()}
          onCancel={() => {
            if (revoking) return
            setRevokeTargetId(null)
          }}
        />
      )}

      {isTeamOwner && team && (
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

      <div className="team-management-page-screen app-shell-page-screen">
        <header className="team-management-page-header app-shell-page-header">
          <div className="team-management-page-header-main app-shell-page-header-main">
            <h1>Team Management</h1>
            <p className="team-management-page-subtitle app-shell-page-subtitle">
              {team?.name ?? 'Team'}
            </p>
          </div>
        </header>

        {!canEdit && !loading && (
          <p className="team-management-page-readonly app-shell-page-readonly">
            View only — contact your coach to invite or manage members.
          </p>
        )}

        {error && <p className="team-management-page-error app-shell-page-error">{error}</p>}
        {actionError && <p className="team-management-page-error app-shell-page-error">{actionError}</p>}
        {actionSuccess && (
          <p className="team-management-page-success app-shell-page-success">{actionSuccess}</p>
        )}

        <div className="team-management-content app-shell-page-body">
          <section
            className="team-management-overview app-shell-card"
            aria-labelledby="team-overview-heading"
          >
            <h2 id="team-overview-heading">Team Overview</h2>
            <dl className="team-overview-list">
              <div className="team-overview-item">
                <dt>Team</dt>
                <dd>{team?.name ?? '—'}</dd>
              </div>
              <div className="team-overview-item">
                <dt>You</dt>
                <dd>{userLabel}</dd>
              </div>
              <div className="team-overview-item">
                <dt>Email</dt>
                <dd>{userEmail ?? '—'}</dd>
              </div>
              <div className="team-overview-item">
                <dt>Format</dt>
                <dd>{formatLabel}</dd>
              </div>
              <div className="team-overview-item">
                <dt>Role</dt>
                <dd>{roleLabelText}</dd>
              </div>
            </dl>
          </section>

          <section className="team-management-section" aria-labelledby="team-roster-heading">
          <div className="team-management-section-header">
            <h2 id="team-roster-heading">Team Members &amp; Invites</h2>
            <p className="team-management-section-description">
              {canEdit
                ? 'Active members and outstanding invites for this team.'
                : 'See who is on the team and who has been invited.'}
            </p>
          </div>

          {loading ? (
            <p className="team-management-page-loading app-shell-page-loading">Loading roster…</p>
          ) : rows.length === 0 ? (
            <p className="team-management-page-empty app-shell-page-empty">
              No members or invites yet.
            </p>
          ) : (
            <div className="team-roster-table-wrap">
              <table className="team-roster-table">
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Email</th>
                    <th scope="col">Role</th>
                    <th scope="col">Status</th>
                    {canEdit && <th scope="col">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const meta = inviteMeta(row)
                    const isPendingInvite =
                      canEdit && row.kind === 'invite' && row.status === 'Pending'
                    const canRemoveMember =
                      row.kind === 'member' &&
                      canRemoveTeamMember(role, user?.id ?? null, row.user_id, row.role)

                    return (
                      <tr key={row.id}>
                        <td data-label="Name">
                          <span className="team-roster-primary">{rosterNameLabel(row)}</span>
                          {meta && <span className="team-roster-meta">{meta}</span>}
                        </td>
                        <td data-label="Email">{rosterEmailLabel(row)}</td>
                        <td data-label="Role">{roleLabel(row)}</td>
                        <td data-label="Status">
                          <span className={statusClassName(row.status)}>{row.status}</span>
                        </td>
                        {canEdit && (
                          <td data-label="Actions">
                            {isPendingInvite ? (
                              <div className="team-roster-actions">
                                <button
                                  type="button"
                                  className="btn team-roster-action-btn"
                                  onClick={() => void handleCopyInviteLink(row)}
                                >
                                  {copiedRowId === row.id ? 'Copied' : 'Copy Invite Link'}
                                </button>
                                <button
                                  type="button"
                                  className="btn team-roster-action-btn"
                                  disabled={resendingInviteId === row.invite_id}
                                  onClick={() => void handleResendInvite(row)}
                                >
                                  {resendingInviteId === row.invite_id ? 'Sending…' : 'Resend Invite'}
                                </button>
                                {isTeamOwner && (
                                  <button
                                    type="button"
                                    className="btn btn-danger team-roster-action-btn"
                                    disabled={revoking}
                                    onClick={() => setRevokeTargetId(row.invite_id)}
                                  >
                                    Revoke Invite
                                  </button>
                                )}
                              </div>
                            ) : canRemoveMember ? (
                              <div className="team-roster-actions">
                                <button
                                  type="button"
                                  className="btn btn-danger team-roster-action-btn"
                                  disabled={removing}
                                  onClick={() => {
                                    setActionError(null)
                                    setActionSuccess(null)
                                    setRemoveTargetUserId(row.user_id)
                                  }}
                                >
                                  Remove
                                </button>
                              </div>
                            ) : (
                              <span className="team-roster-no-actions">—</span>
                            )}
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          </section>

          {isTeamOwner && team && (
            <section
              className="team-management-danger-zone app-shell-card"
              aria-labelledby="team-danger-zone-heading"
            >
              <h2 id="team-danger-zone-heading">Danger Zone</h2>
              <p className="team-management-danger-zone-description">
                Permanently delete this team and all of its plays, formations, members, and invites.
              </p>
              <button
                type="button"
                className="btn btn-danger team-management-delete-team-btn"
                onClick={handleDeleteTeamClick}
              >
                Delete Team
              </button>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
