export type InviteRole = 'coach' | 'player' | 'parent'

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
