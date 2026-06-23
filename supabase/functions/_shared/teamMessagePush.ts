import {
  adminDelete,
  adminSelect,
  adminSelectMaybeSingle,
} from './supabaseAdmin.ts';
import { sendExpoPushMessages, type ExpoPushMessage } from './expoPush.ts';
import {
  getNotificationTargetUserIds,
  normalizeMentionAudiences,
  normalizeMentionedUserIds,
  type TeamMessageMentionAudience,
} from './teamMessageMention.ts';

export type TeamMessageRow = {
  id: string;
  team_id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  mention_audiences?: TeamMessageMentionAudience[] | null;
  mentioned_user_ids?: string[] | null;
  created_at?: string;
  edited_at?: string | null;
  deleted_at?: string | null;
};

type TeamMessageThreadKind = 'everyone' | 'coaches' | 'players' | 'parents' | 'direct';

type TeamMessageThreadRow = {
  id: string;
  team_id: string;
  thread_kind: TeamMessageThreadKind;
  title: string;
};

type TeamMemberRow = {
  user_id: string;
  role: 'team_owner' | 'coach' | 'player' | 'parent';
};

type ThreadParticipantRow = {
  user_id: string;
};

type ProfileNameRow = {
  display_name: string | null;
};

type TeamMessagePushResult = {
  notification_type: 'team_message';
  message_id: string;
  team_id: string;
  recipient_count: number;
  token_count: number;
  sent: number;
  failed: number;
  removed_invalid_tokens: number;
};

const TEAM_MESSAGE_COLUMNS =
  'id,team_id,thread_id,sender_id,body,mention_audiences,mentioned_user_ids,created_at,edited_at,deleted_at';
const TEAM_MESSAGE_THREAD_COLUMNS = 'id,team_id,thread_kind,title';

const THREAD_KIND_PUSH_TITLES: Record<Exclude<TeamMessageThreadKind, 'direct'>, string> = {
  everyone: 'Everyone',
  coaches: 'Coaches',
  players: 'Players',
  parents: 'Parents',
};

const USER_MENTION_BODY_PATTERN =
  /@\[([^\]]+)\]\(mention:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\)/gi;

function truncate(text: string, maxLength: number): string {
  const trimmed = text.trim();

  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength - 1)}…`;
}

function formatMessageBodyForDisplay(body: string): string {
  return body.replace(USER_MENTION_BODY_PATTERN, '@$1');
}

function assertTeamMessageRow(record: TeamMessageRow): TeamMessageRow {
  if (!record.id) {
    throw new Error('Missing required team message field: id');
  }

  if (!record.team_id) {
    throw new Error('Missing required team message field: team_id');
  }

  if (!record.thread_id) {
    throw new Error('Missing required team message field: thread_id');
  }

  if (!record.sender_id) {
    throw new Error('Missing required team message field: sender_id');
  }

  if (!record.body?.trim()) {
    throw new Error('Missing required team message field: body');
  }

  return record;
}

async function loadTeamMessage(messageId: string): Promise<TeamMessageRow> {
  const data = await adminSelectMaybeSingle<TeamMessageRow>('team_messages', {
    select: TEAM_MESSAGE_COLUMNS,
    id: `eq.${messageId}`,
  });

  if (!data) {
    throw new Error(`Team message not found: ${messageId}`);
  }

  return assertTeamMessageRow(data);
}

async function loadTeamMessageThread(threadId: string): Promise<TeamMessageThreadRow> {
  const data = await adminSelectMaybeSingle<TeamMessageThreadRow>('team_message_threads', {
    select: TEAM_MESSAGE_THREAD_COLUMNS,
    id: `eq.${threadId}`,
  });

  if (!data) {
    throw new Error(`Team message thread not found: ${threadId}`);
  }

  if (!data.thread_kind) {
    throw new Error(`Team message thread missing thread_kind: ${threadId}`);
  }

  return data;
}

async function loadThreadParticipants(threadId: string): Promise<ThreadParticipantRow[]> {
  return adminSelect<ThreadParticipantRow>('team_message_thread_participants', {
    select: 'user_id',
    thread_id: `eq.${threadId}`,
  });
}

async function loadSenderDisplayName(senderId: string): Promise<string | null> {
  const data = await adminSelectMaybeSingle<ProfileNameRow>('profiles', {
    select: 'display_name',
    id: `eq.${senderId}`,
  });

  const trimmed = data?.display_name?.trim();
  return trimmed ? trimmed : null;
}

export function isTeamMessageRecord(record: unknown): record is TeamMessageRow {
  if (!record || typeof record !== 'object') {
    return false;
  }

  const candidate = record as TeamMessageRow;

  return Boolean(
    candidate.id &&
      candidate.team_id &&
      candidate.thread_id &&
      candidate.sender_id &&
      candidate.body?.trim(),
  );
}

export async function sendTeamMessagePushNotifications(input: {
  messageId?: string;
  record?: TeamMessageRow;
}): Promise<TeamMessagePushResult> {
  const teamMessage = input.record?.id
    ? assertTeamMessageRow(input.record)
    : await loadTeamMessage(input.messageId ?? '');

  const thread = await loadTeamMessageThread(teamMessage.thread_id);
  const mentionAudiences = normalizeMentionAudiences(teamMessage.mention_audiences);
  const mentionedUserIds = normalizeMentionedUserIds(teamMessage.mentioned_user_ids);

  const members = await adminSelect<TeamMemberRow>('team_members', {
    select: 'user_id,role',
    team_id: `eq.${teamMessage.team_id}`,
  });

  const threadParticipantUserIds =
    thread.thread_kind === 'direct'
      ? (await loadThreadParticipants(thread.id)).map((participant) => participant.user_id)
      : undefined;

  const recipientUserIds = [...getNotificationTargetUserIds({
    threadKind: thread.thread_kind,
    mentionAudiences,
    mentionedUserIds,
    senderId: teamMessage.sender_id,
    members,
    threadParticipantUserIds,
  })];

  if (recipientUserIds.length === 0) {
    return {
      notification_type: 'team_message',
      message_id: teamMessage.id,
      team_id: teamMessage.team_id,
      recipient_count: 0,
      token_count: 0,
      sent: 0,
      failed: 0,
      removed_invalid_tokens: 0,
    };
  }

  const tokens = await adminSelect<{
    id: string;
    user_id: string;
    expo_push_token: string;
  }>('push_device_tokens', {
    select: 'id,user_id,expo_push_token',
    user_id: `in.(${recipientUserIds.join(',')})`,
  });

  const pushTitle =
    thread.thread_kind === 'direct'
      ? (await loadSenderDisplayName(teamMessage.sender_id)) ?? 'Direct Message'
      : THREAD_KIND_PUSH_TITLES[thread.thread_kind];

  const pushMessages: ExpoPushMessage[] = tokens.map((tokenRow) => ({
    to: tokenRow.expo_push_token,
    title: pushTitle,
    body: truncate(formatMessageBodyForDisplay(teamMessage.body), 180),
    sound: 'default',
    channelId: 'default',
    data: {
      notification_type: 'team_message',
      team_id: teamMessage.team_id,
      thread_id: teamMessage.thread_id,
      message_id: teamMessage.id,
      sender_id: teamMessage.sender_id,
      thread_kind: thread.thread_kind,
      mention_audiences: mentionAudiences,
      mentioned_user_ids: mentionedUserIds,
    },
  }));

  const pushResult = await sendExpoPushMessages(pushMessages);

  if (pushResult.invalidTokens.length > 0) {
    for (const token of pushResult.invalidTokens) {
      const escapedToken = token.replace(/"/g, '""');
      await adminDelete('push_device_tokens', {
        expo_push_token: `eq."${escapedToken}"`,
      });
    }
  }

  return {
    notification_type: 'team_message',
    message_id: teamMessage.id,
    team_id: teamMessage.team_id,
    recipient_count: recipientUserIds.length,
    token_count: pushMessages.length,
    sent: pushResult.sent,
    failed: pushResult.failed,
    removed_invalid_tokens: pushResult.invalidTokens.length,
  };
}
