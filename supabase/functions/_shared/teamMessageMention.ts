export type TeamMessageMentionAudience = 'everyone' | 'coaches' | 'players' | 'parents';

export type TeamMessageThreadKind = 'everyone' | 'coaches' | 'players' | 'parents' | 'direct';

export type TeamMemberRole = 'team_owner' | 'coach' | 'player' | 'parent';

/** Keep in sync with src/utils/teamMessageMentionUtils.ts */
export const MENTION_AUDIENCE_ROLES: Record<TeamMessageMentionAudience, TeamMemberRole[]> = {
  everyone: ['team_owner', 'coach', 'player', 'parent'],
  coaches: ['team_owner', 'coach'],
  players: ['player'],
  parents: ['parent'],
};

export const THREAD_KIND_CHANNEL_ROLES: Record<TeamMessageThreadKind, TeamMemberRole[]> = {
  everyone: ['team_owner', 'coach', 'player', 'parent'],
  coaches: ['team_owner', 'coach'],
  players: ['team_owner', 'coach', 'player'],
  parents: ['team_owner', 'coach', 'parent'],
  direct: ['team_owner', 'coach', 'player', 'parent'],
};

export function normalizeMentionAudiences(
  value: TeamMessageMentionAudience[] | null | undefined,
): TeamMessageMentionAudience[] {
  if (!value || value.length === 0) {
    return [];
  }

  return value;
}

export function normalizeMentionedUserIds(value: string[] | null | undefined): string[] {
  if (!value || value.length === 0) {
    return [];
  }

  return value.filter((userId) => userId.length > 0);
}

export function getMentionAudienceTargetRoles(input: {
  threadKind: TeamMessageThreadKind;
  mentionAudiences: TeamMessageMentionAudience[];
}): Set<TeamMemberRole> {
  const channelRoles = new Set(THREAD_KIND_CHANNEL_ROLES[input.threadKind]);
  const targetRoles = new Set<TeamMemberRole>();

  for (const audience of input.mentionAudiences) {
    for (const role of MENTION_AUDIENCE_ROLES[audience]) {
      if (channelRoles.has(role)) {
        targetRoles.add(role);
      }
    }
  }

  return targetRoles;
}

export function getNotificationTargetUserIds(input: {
  threadKind: TeamMessageThreadKind;
  mentionAudiences: TeamMessageMentionAudience[];
  mentionedUserIds: string[];
  senderId: string;
  members: Array<{ user_id: string; role: TeamMemberRole }>;
  threadParticipantUserIds?: string[];
}): Set<string> {
  const channelRoles = new Set(THREAD_KIND_CHANNEL_ROLES[input.threadKind]);
  const accessibleUserIds = new Set<string>();

  if (input.threadKind === 'direct') {
    for (const userId of input.threadParticipantUserIds ?? []) {
      accessibleUserIds.add(userId);
    }
  } else {
    for (const member of input.members) {
      if (member.user_id && channelRoles.has(member.role)) {
        accessibleUserIds.add(member.user_id);
      }
    }
  }

  const mentionAudiences = normalizeMentionAudiences(input.mentionAudiences);
  const mentionedUserIds = normalizeMentionedUserIds(input.mentionedUserIds);
  const hasAnyMention = mentionAudiences.length > 0 || mentionedUserIds.length > 0;
  const recipients = new Set<string>();

  if (!hasAnyMention) {
    for (const userId of accessibleUserIds) {
      if (userId !== input.senderId) {
        recipients.add(userId);
      }
    }

    return recipients;
  }

  if (mentionAudiences.length > 0) {
    const targetRoles = getMentionAudienceTargetRoles({
      threadKind: input.threadKind,
      mentionAudiences,
    });

    for (const member of input.members) {
      if (
        member.user_id &&
        member.user_id !== input.senderId &&
        accessibleUserIds.has(member.user_id) &&
        targetRoles.has(member.role)
      ) {
        recipients.add(member.user_id);
      }
    }
  }

  for (const userId of mentionedUserIds) {
    if (userId !== input.senderId && accessibleUserIds.has(userId)) {
      recipients.add(userId);
    }
  }

  return recipients;
}

/** @deprecated use getMentionAudienceTargetRoles for audience-only role sets */
export function getNotificationTargetRoles(input: {
  threadKind: TeamMessageThreadKind;
  mentionAudiences: TeamMessageMentionAudience[];
}): Set<TeamMemberRole> {
  const channelRoles = new Set(THREAD_KIND_CHANNEL_ROLES[input.threadKind]);

  if (input.mentionAudiences.length === 0) {
    return channelRoles;
  }

  return getMentionAudienceTargetRoles(input);
}
