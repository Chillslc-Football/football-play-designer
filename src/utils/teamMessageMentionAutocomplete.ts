import type { PickedUserMention, DirectMessageEligibleMember, TeamMessageMentionAudience } from '../types/teamMessage'
import type { TeamRole } from '../types/team'
import { TEAM_ROLE_LABELS } from './roleLabels'

export type AudienceMentionOption = {
  kind: 'audience'
  token: string
  audience: TeamMessageMentionAudience
  label: string
  description: string
}

export type MemberMentionOption = {
  kind: 'member'
  token: string
  userId: string
  label: string
  description: string
}

export type MentionSuggestion = AudienceMentionOption | MemberMentionOption

export const AUDIENCE_MENTION_OPTIONS: AudienceMentionOption[] = [
  {
    kind: 'audience',
    token: '@everyone',
    audience: 'everyone',
    label: '@everyone',
    description: 'Notify everyone in this channel',
  },
  {
    kind: 'audience',
    token: '@coaches',
    audience: 'coaches',
    label: '@coaches',
    description: 'Notify coaches',
  },
  {
    kind: 'audience',
    token: '@players',
    audience: 'players',
    label: '@players',
    description: 'Notify players',
  },
  {
    kind: 'audience',
    token: '@parents',
    audience: 'parents',
    label: '@parents',
    description: 'Notify parents',
  },
]

export type ActiveMentionQuery = {
  startIndex: number
  query: string
  endIndex: number
}

export function getActiveMentionQuery(
  body: string,
  cursorPosition: number,
): ActiveMentionQuery | null {
  const safeCursor = Math.max(0, Math.min(cursorPosition, body.length))
  const beforeCursor = body.slice(0, safeCursor)
  const atIndex = beforeCursor.lastIndexOf('@')

  if (atIndex === -1) {
    return null
  }

  if (atIndex > 0 && /\w/.test(beforeCursor.charAt(atIndex - 1))) {
    return null
  }

  const query = beforeCursor.slice(atIndex + 1)

  if (/\s/.test(query)) {
    return null
  }

  return {
    startIndex: atIndex,
    query: query.toLowerCase(),
    endIndex: safeCursor,
  }
}

function memberDisplayName(member: DirectMessageEligibleMember): string {
  return member.display_name?.trim() || 'Team member'
}

export function buildMemberMentionOption(
  member: DirectMessageEligibleMember,
): MemberMentionOption {
  const displayName = memberDisplayName(member)
  const roleLabel = TEAM_ROLE_LABELS[member.role as TeamRole] ?? member.role

  return {
    kind: 'member',
    token: `@${displayName}`,
    userId: member.user_id,
    label: `@${displayName}`,
    description: roleLabel,
  }
}

export function filterMentionSuggestions(
  query: string,
  members: DirectMessageEligibleMember[],
): MentionSuggestion[] {
  const audienceMatches = AUDIENCE_MENTION_OPTIONS.filter(
    (option) =>
      option.audience.startsWith(query) || option.token.slice(1).startsWith(query),
  )

  const memberMatches = members
    .map(buildMemberMentionOption)
    .filter((option) => {
      const normalizedLabel = option.label.slice(1).toLowerCase()
      const normalizedDescription = option.description.toLowerCase()
      return normalizedLabel.includes(query) || normalizedDescription.includes(query)
    })
    .sort((left, right) => left.label.localeCompare(right.label))

  return [...audienceMatches, ...memberMatches]
}

export function insertMentionToken(
  body: string,
  startIndex: number,
  endIndex: number,
  token: string,
): { nextBody: string; nextCursor: number } {
  const mention = `${token} `
  const nextBody = `${body.slice(0, startIndex)}${mention}${body.slice(endIndex)}`
  const nextCursor = startIndex + mention.length

  return { nextBody, nextCursor }
}

export function buildPickedUserMention(option: MemberMentionOption): PickedUserMention {
  return {
    userId: option.userId,
    displayName: option.label.slice(1),
    insertText: option.token,
  }
}
