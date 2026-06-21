import type { InviteRole } from './invite'

export type JoinLinkRole = InviteRole

export type JoinLinkRecord = {
  role: JoinLinkRole
  token: string
  created_at: string
  last_used_at: string | null
}

export type JoinLinkPreviewStatus = 'active' | 'revoked' | 'invalid'

export type JoinLinkPreview = {
  teamName: string | null
  role: JoinLinkRole | null
  status: JoinLinkPreviewStatus
}

export type AcceptJoinLinkStatus = 'joined' | 'already_member' | 'invalid'

export type AcceptJoinLinkResult = {
  teamId: string | null
  status: AcceptJoinLinkStatus
}

export const JOIN_LINK_ROLE_HINTS: Record<JoinLinkRole, string> = {
  coach: 'For assistant coaches.',
  player: 'For players.',
  parent: 'For parents.',
}
