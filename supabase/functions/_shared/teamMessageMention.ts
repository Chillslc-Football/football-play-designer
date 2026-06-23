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

export function getNotificationTargetRoles(input: {
  threadKind: TeamMessageThreadKind;
  mentionAudiences: TeamMessageMentionAudience[];
}): Set<TeamMemberRole> {
  const channelRoles = new Set(THREAD_KIND_CHANNEL_ROLES[input.threadKind]);

  if (input.mentionAudiences.length === 0) {
    return channelRoles;
  }

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
