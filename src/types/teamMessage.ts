export type TeamMessageThreadKind =
  | 'everyone'
  | 'coaches'
  | 'players'
  | 'parents'
  | 'direct'

export type TeamMessageMentionAudience = 'everyone' | 'coaches' | 'players' | 'parents'

export type TeamMessageThread = {
  id: string
  team_id: string
  title: string
  thread_kind: TeamMessageThreadKind
  created_by: string
  created_at: string
  updated_at: string
  last_message_at: string | null
}

export type TeamMessageThreadWithUnread = TeamMessageThread & {
  unread_count: number
}

export type DirectMessageThreadWithUnread = TeamMessageThreadWithUnread & {
  other_user_id: string
  other_display_name: string | null
}

export type DirectMessageEligibleMember = {
  user_id: string
  role: string
  display_name: string | null
}

export type TeamMessage = {
  id: string
  thread_id: string
  team_id: string
  sender_id: string
  sender_display_name: string | null
  body: string
  mention_audiences: TeamMessageMentionAudience[]
  mentioned_user_ids: string[]
  created_at: string
  edited_at: string | null
  deleted_at: string | null
}

export type PickedUserMention = {
  userId: string
  displayName: string
  insertText: string
}

export type TeamMessageDraft = {
  body: string
  pickedUserMentions: PickedUserMention[]
}

export type MessageReadSummary = {
  read_count: number
  eligible_count: number
}

export function createEmptyTeamMessageDraft(): TeamMessageDraft {
  return { body: '', pickedUserMentions: [] }
}
