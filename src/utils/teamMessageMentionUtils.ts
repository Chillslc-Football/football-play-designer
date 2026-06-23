import type { TeamRole } from '../types/team'
import type {
  TeamMessageMentionAudience,
  TeamMessageThreadKind,
  PickedUserMention,
} from '../types/teamMessage'

/** Roles notified for each @mention token (union when multiple). */
export const MENTION_AUDIENCE_ROLES: Record<TeamMessageMentionAudience, TeamRole[]> = {
  everyone: ['team_owner', 'coach', 'player', 'parent'],
  coaches: ['team_owner', 'coach'],
  players: ['player'],
  parents: ['parent'],
}

/** Roles that can access each built-in channel (matches push + RLS). */
export const THREAD_KIND_CHANNEL_ROLES: Record<TeamMessageThreadKind, TeamRole[]> = {
  everyone: ['team_owner', 'coach', 'player', 'parent'],
  coaches: ['team_owner', 'coach'],
  players: ['team_owner', 'coach', 'player'],
  parents: ['team_owner', 'coach', 'parent'],
  direct: ['team_owner', 'coach', 'player', 'parent'],
}

export const USER_MENTION_BODY_PATTERN =
  /@\[([^\]]+)\]\(mention:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\)/gi

export const AUDIENCE_MENTION_BODY_PATTERN =
  /(^|[^\w])@(everyone|coaches|players|parents)(?!\w)/gi

export function normalizeMentionAudiences(
  value: TeamMessageMentionAudience[] | null | undefined,
): TeamMessageMentionAudience[] {
  if (!value || value.length === 0) {
    return []
  }

  return value
}

export function normalizeMentionedUserIds(
  value: string[] | null | undefined,
): string[] {
  if (!value || value.length === 0) {
    return []
  }

  return value.filter((userId) => userId.length > 0)
}

export function buildUserMentionToken(displayName: string, userId: string): string {
  const label = displayName.trim() || 'Team member'
  return `@[${label}](mention:${userId})`
}

export function encodeMessageBodyForStorage(
  body: string,
  pickedUserMentions: PickedUserMention[],
): string {
  let result = body

  for (const mention of pickedUserMentions) {
    const index = result.indexOf(mention.insertText)
    if (index === -1) {
      continue
    }

    const canonical = buildUserMentionToken(mention.displayName, mention.userId)
    result = `${result.slice(0, index)}${canonical}${result.slice(index + mention.insertText.length)}`
  }

  return result
}

export function formatMessageBodyForDisplay(body: string): string {
  return body.replace(USER_MENTION_BODY_PATTERN, '@$1')
}

export function getMentionTargetRoles(
  mentionAudiences: TeamMessageMentionAudience[],
): Set<TeamRole> {
  const roles = new Set<TeamRole>()

  for (const audience of mentionAudiences) {
    for (const role of MENTION_AUDIENCE_ROLES[audience]) {
      roles.add(role)
    }
  }

  return roles
}

export function getChannelAccessRoles(threadKind: TeamMessageThreadKind): Set<TeamRole> {
  return new Set(THREAD_KIND_CHANNEL_ROLES[threadKind])
}

export function getMentionAudienceTargetRoles(input: {
  threadKind: TeamMessageThreadKind
  mentionAudiences: TeamMessageMentionAudience[]
}): Set<TeamRole> {
  const channelRoles = getChannelAccessRoles(input.threadKind)
  const targetRoles = new Set<TeamRole>()

  for (const audience of input.mentionAudiences) {
    for (const role of MENTION_AUDIENCE_ROLES[audience]) {
      if (channelRoles.has(role)) {
        targetRoles.add(role)
      }
    }
  }

  return targetRoles
}

/** Union of audience-role targets and individual users, intersected with thread access. */
export function getNotificationTargetUserIds(input: {
  threadKind: TeamMessageThreadKind
  mentionAudiences: TeamMessageMentionAudience[]
  mentionedUserIds: string[]
  senderId: string
  members: Array<{ user_id: string; role: TeamRole }>
  threadParticipantUserIds?: string[]
}): Set<string> {
  const channelRoles = getChannelAccessRoles(input.threadKind)
  const accessibleUserIds = new Set<string>()

  if (input.threadKind === 'direct') {
    for (const userId of input.threadParticipantUserIds ?? []) {
      accessibleUserIds.add(userId)
    }
  } else {
    for (const member of input.members) {
      if (member.user_id && channelRoles.has(member.role)) {
        accessibleUserIds.add(member.user_id)
      }
    }
  }

  const mentionAudiences = normalizeMentionAudiences(input.mentionAudiences)
  const mentionedUserIds = normalizeMentionedUserIds(input.mentionedUserIds)
  const hasAnyMention = mentionAudiences.length > 0 || mentionedUserIds.length > 0
  const recipients = new Set<string>()

  if (!hasAnyMention) {
    for (const userId of accessibleUserIds) {
      if (userId !== input.senderId) {
        recipients.add(userId)
      }
    }

    return recipients
  }

  if (mentionAudiences.length > 0) {
    const targetRoles = getMentionAudienceTargetRoles({
      threadKind: input.threadKind,
      mentionAudiences,
    })

    for (const member of input.members) {
      if (
        member.user_id &&
        member.user_id !== input.senderId &&
        accessibleUserIds.has(member.user_id) &&
        targetRoles.has(member.role)
      ) {
        recipients.add(member.user_id)
      }
    }
  }

  for (const userId of mentionedUserIds) {
    if (userId !== input.senderId && accessibleUserIds.has(userId)) {
      recipients.add(userId)
    }
  }

  return recipients
}

/** @deprecated Prefer getNotificationTargetUserIds */
export function getNotificationTargetRoles(input: {
  threadKind: TeamMessageThreadKind
  mentionAudiences: TeamMessageMentionAudience[]
}): Set<TeamRole> {
  const channelRoles = getChannelAccessRoles(input.threadKind)

  if (input.mentionAudiences.length === 0) {
    return channelRoles
  }

  return getMentionAudienceTargetRoles(input)
}

export function shouldNotifyForTeamMessage(input: {
  userRole: TeamRole | null
  threadKind: TeamMessageThreadKind
  mentionAudiences: TeamMessageMentionAudience[]
  mentionedUserIds: string[]
  senderId: string
  userId: string
}): boolean {
  if (input.senderId === input.userId) {
    return false
  }

  const mentionAudiences = normalizeMentionAudiences(input.mentionAudiences)
  const mentionedUserIds = normalizeMentionedUserIds(input.mentionedUserIds)
  const hasAnyMention = mentionAudiences.length > 0 || mentionedUserIds.length > 0
  const canAccessThread = input.userRole
    ? getChannelAccessRoles(input.threadKind).has(input.userRole)
    : input.threadKind === 'direct'

  if (input.threadKind !== 'direct' && !canAccessThread) {
    return false
  }

  if (!hasAnyMention) {
    return input.threadKind === 'direct' ? true : Boolean(canAccessThread)
  }

  let shouldNotify = false

  if (mentionedUserIds.includes(input.userId)) {
    shouldNotify = true
  }

  if (mentionAudiences.length > 0 && input.userRole) {
    shouldNotify =
      shouldNotify ||
      getMentionAudienceTargetRoles({
        threadKind: input.threadKind,
        mentionAudiences,
      }).has(input.userRole)
  }

  if (input.threadKind === 'direct') {
    return shouldNotify
  }

  return shouldNotify && Boolean(canAccessThread)
}

export type TeamMessageBodySegment =
  | { type: 'text'; value: string }
  | { type: 'mention'; value: string }

type MentionSpan = {
  start: number
  end: number
  display: string
}

function collectMentionSpans(body: string): MentionSpan[] {
  const spans: MentionSpan[] = []

  const userPattern = new RegExp(USER_MENTION_BODY_PATTERN.source, 'gi')
  let userMatch: RegExpExecArray | null
  while ((userMatch = userPattern.exec(body)) !== null) {
    spans.push({
      start: userMatch.index,
      end: userPattern.lastIndex,
      display: `@${userMatch[1] ?? 'Team member'}`,
    })
  }

  const audiencePattern = new RegExp(AUDIENCE_MENTION_BODY_PATTERN.source, 'gi')
  let audienceMatch: RegExpExecArray | null
  while ((audienceMatch = audiencePattern.exec(body)) !== null) {
    const prefix = audienceMatch[1] ?? ''
    spans.push({
      start: audienceMatch.index + prefix.length,
      end: audiencePattern.lastIndex,
      display: `@${audienceMatch[2] ?? ''}`,
    })
  }

  return spans.sort((left, right) => left.start - right.start)
}

export function splitTeamMessageBodyForDisplay(body: string): TeamMessageBodySegment[] {
  if (!body) {
    return []
  }

  const spans = collectMentionSpans(body)
  if (spans.length === 0) {
    return [{ type: 'text', value: body }]
  }

  const segments: TeamMessageBodySegment[] = []
  let cursor = 0

  for (const span of spans) {
    if (span.start > cursor) {
      segments.push({ type: 'text', value: body.slice(cursor, span.start) })
    }

    segments.push({ type: 'mention', value: span.display })
    cursor = span.end
  }

  if (cursor < body.length) {
    segments.push({ type: 'text', value: body.slice(cursor) })
  }

  return segments
}
