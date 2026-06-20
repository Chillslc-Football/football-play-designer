import type { InviteDisplayStatus, TeamInviteRecord } from '../types/invite'
import type { TeamRole } from '../types/team'
import type { RosterRow, TeamMemberRecord } from '../types/teamRoster'
import { formatTeamUpdateTimestamp } from './teamUpdateUtils'

/** Whether the signed-in user may remove a member from the current team. */
export function canRemoveTeamMember(
  actorRole: TeamRole | null,
  actorUserId: string | null,
  targetUserId: string,
  targetMemberRole: TeamRole,
): boolean {
  if (!actorRole || !actorUserId) return false
  if (actorRole !== 'team_owner' && actorRole !== 'coach') return false
  if (targetUserId === actorUserId) return false
  if (targetMemberRole === 'team_owner') return false
  if (actorRole === 'coach' && targetMemberRole === 'coach') return false
  return targetMemberRole === 'coach' || targetMemberRole === 'player' || targetMemberRole === 'parent'
}

export function getInviteDisplayStatus(invite: TeamInviteRecord): InviteDisplayStatus {
  if (invite.revoked_at) {
    return 'Revoked'
  }

  if (new Date(invite.expires_at) <= new Date()) {
    return 'Expired'
  }

  return 'Pending'
}

function memberSortKey(member: TeamMemberRecord): string {
  const name = member.display_name?.trim()
  if (name) {
    return name.toLowerCase()
  }

  return member.user_id
}

export function buildRosterRows(
  members: TeamMemberRecord[],
  invites: TeamInviteRecord[],
): RosterRow[] {
  const memberRows: RosterRow[] = members
    .slice()
    .sort((left, right) => memberSortKey(left).localeCompare(memberSortKey(right)))
    .map((member) => ({
      id: `member-${member.user_id}`,
      kind: 'member' as const,
      user_id: member.user_id,
      name: member.display_name?.trim() || null,
      email: null,
      role: member.role,
      status: 'Active' as const,
      created_at: null,
      expires_at: null,
      token: null,
      invite_id: null,
    }))

  const inviteRows: RosterRow[] = invites
    .filter((invite) => !invite.accepted_at)
    .slice()
    .sort((left, right) => {
      const leftPending = getInviteDisplayStatus(left) === 'Pending'
      const rightPending = getInviteDisplayStatus(right) === 'Pending'
      if (leftPending !== rightPending) {
        return leftPending ? -1 : 1
      }

      return new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
    })
    .map((invite) => ({
      id: `invite-${invite.id}`,
      kind: 'invite' as const,
      name: null,
      email: invite.email,
      role: invite.role,
      status: getInviteDisplayStatus(invite),
      created_at: invite.created_at,
      expires_at: invite.expires_at,
      token: invite.token ?? null,
      invite_id: invite.id,
    }))

  return [...memberRows, ...inviteRows]
}

export function formatRosterDate(iso: string | null): string | null {
  if (!iso) {
    return null
  }

  return formatTeamUpdateTimestamp(iso)
}

export function rosterNameLabel(row: RosterRow): string {
  if (row.kind === 'member') {
    return row.name ?? '—'
  }

  return '—'
}

export function rosterEmailLabel(row: RosterRow): string {
  return row.email ?? '—'
}
