import type { InviteDisplayStatus, InviteRole } from './invite'
import type { TeamRole } from './team'

export type TeamMemberRecord = {
  user_id: string
  role: TeamRole
  display_name: string | null
}

type RosterRowBase = {
  id: string
  name: string | null
  email: string | null
  created_at: string | null
  expires_at: string | null
  token: string | null
  invite_id: string | null
}

export type MemberRosterRow = RosterRowBase & {
  kind: 'member'
  role: TeamRole
  status: 'Active'
  user_id: string
}

export type InviteRosterRow = RosterRowBase & {
  kind: 'invite'
  role: InviteRole
  status: InviteDisplayStatus
}

export type RosterRow = MemberRosterRow | InviteRosterRow
