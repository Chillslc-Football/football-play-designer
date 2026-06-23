import type { TeamRole } from '../types/team'
import type {
  TeamMessageMentionAudience,
  TeamMessageThreadKind,
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

export function normalizeMentionAudiences(
  value: TeamMessageMentionAudience[] | null | undefined,
): TeamMessageMentionAudience[] {
  if (!value || value.length === 0) {
    return []
  }

  return value
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

/** Final notification roles = mention roles ∩ channel access (empty mentions → all channel roles). */
export function getNotificationTargetRoles(input: {
  threadKind: TeamMessageThreadKind
  mentionAudiences: TeamMessageMentionAudience[]
}): Set<TeamRole> {
  const channelRoles = getChannelAccessRoles(input.threadKind)

  if (input.mentionAudiences.length === 0) {
    return channelRoles
  }

  const mentionRoles = getMentionTargetRoles(input.mentionAudiences)
  const targetRoles = new Set<TeamRole>()

  for (const role of mentionRoles) {
    if (channelRoles.has(role)) {
      targetRoles.add(role)
    }
  }

  return targetRoles
}

export function shouldNotifyForTeamMessage(input: {
  userRole: TeamRole | null
  threadKind: TeamMessageThreadKind
  mentionAudiences: TeamMessageMentionAudience[]
  senderId: string
  userId: string
}): boolean {
  if (input.senderId === input.userId) {
    return false
  }

  if (!input.userRole) {
    return false
  }

  const targetRoles = getNotificationTargetRoles({
    threadKind: input.threadKind,
    mentionAudiences: normalizeMentionAudiences(input.mentionAudiences),
  })

  return targetRoles.has(input.userRole)
}

const MENTION_BODY_PATTERN =
  /(^|[^\w])@(everyone|coaches|players|parents)(?!\w)/gi

export type TeamMessageBodySegment =
  | { type: 'text'; value: string }
  | { type: 'mention'; value: string }

export function splitTeamMessageBodyForDisplay(body: string): TeamMessageBodySegment[] {
  if (!body) {
    return []
  }

  const segments: TeamMessageBodySegment[] = []
  let lastIndex = 0
  const pattern = new RegExp(MENTION_BODY_PATTERN.source, 'gi')
  let match: RegExpExecArray | null

  while ((match = pattern.exec(body)) !== null) {
    const prefix = match[1] ?? ''
    const mentionToken = `@${match[2] ?? ''}`
    const matchStart = match.index

    if (matchStart > lastIndex) {
      segments.push({ type: 'text', value: body.slice(lastIndex, matchStart) })
    }

    if (prefix) {
      segments.push({ type: 'text', value: prefix })
    }

    segments.push({ type: 'mention', value: mentionToken })
    lastIndex = pattern.lastIndex
  }

  if (lastIndex < body.length) {
    segments.push({ type: 'text', value: body.slice(lastIndex) })
  }

  return segments.length > 0 ? segments : [{ type: 'text', value: body }]
}
