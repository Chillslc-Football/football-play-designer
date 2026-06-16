import {
  adminDelete,
  adminSelect,
  adminSelectMaybeSingle,
} from './supabaseAdmin.ts';
import { sendExpoPushMessages, type ExpoPushMessage } from './expoPush.ts';

export type TeamMessageRow = {
  id: string;
  team_id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  created_at?: string;
  edited_at?: string | null;
  deleted_at?: string | null;
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

const TEAM_MESSAGE_COLUMNS = 'id,team_id,thread_id,sender_id,body,created_at,edited_at,deleted_at';

const TEAM_MESSAGE_TITLE = 'Team Chat';

function truncate(text: string, maxLength: number): string {
  const trimmed = text.trim();

  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength - 1)}…`;
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

  const members = await adminSelect<{ user_id: string }>('team_members', {
    select: 'user_id',
    team_id: `eq.${teamMessage.team_id}`,
  });

  const recipientUserIds = members
    .map((member) => member.user_id)
    .filter((userId) => userId && userId !== teamMessage.sender_id);

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

  const pushMessages: ExpoPushMessage[] = tokens.map((tokenRow) => ({
    to: tokenRow.expo_push_token,
    title: TEAM_MESSAGE_TITLE,
    body: truncate(teamMessage.body, 180),
    sound: 'default',
    channelId: 'default',
    data: {
      notification_type: 'team_message',
      team_id: teamMessage.team_id,
      thread_id: teamMessage.thread_id,
      message_id: teamMessage.id,
      sender_id: teamMessage.sender_id,
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
