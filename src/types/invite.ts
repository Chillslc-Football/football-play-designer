export type InviteRole = 'coach' | 'player' | 'parent'

export type TeamInvite = {
  token: string
}

export type TeamInviteRecord = {
  id: string
  team_id: string
  role: InviteRole
  email: string
  /** Present only when loaded by team_owner/coach (never for player/parent roster reads). */
  token?: string | null
  expires_at: string
  created_at: string
  accepted_at: string | null
  revoked_at: string | null
}

export type InviteDisplayStatus = 'Pending' | 'Expired' | 'Revoked'

export type InvitePreviewStatus = 'pending' | 'expired' | 'accepted' | 'revoked' | 'invalid'

export type InvitePreview = {
  teamName: string | null
  role: InviteRole | null
  email: string | null
  status: InvitePreviewStatus
}

export const INVITE_ROLE_LABELS: Record<InviteRole, string> = {
  coach: 'Coach',
  player: 'Player',
  parent: 'Parent',
}
