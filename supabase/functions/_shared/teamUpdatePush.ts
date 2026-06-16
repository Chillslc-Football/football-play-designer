import {
  adminDelete,
  adminSelect,
  adminSelectMaybeSingle,
} from './supabaseAdmin.ts';
import { sendExpoPushMessages, type ExpoPushMessage } from './expoPush.ts';

export type TeamUpdateRow = {
  id: string;
  team_id: string;
  title: string;
  body: string;
  update_type: string;
  is_pinned: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type TeamUpdatePushResult = {
  notification_type: 'team_update';
  team_update_id: string;
  team_id: string;
  recipient_count: number;
  token_count: number;
  sent: number;
  failed: number;
  removed_invalid_tokens: number;
};

const TEAM_UPDATE_COLUMNS =
  'id,team_id,title,body,update_type,is_pinned,created_by,created_at,updated_at';

function truncate(text: string, maxLength: number): string {
  const trimmed = text.trim();

  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength - 1)}…`;
}

async function loadTeamUpdate(teamUpdateId: string): Promise<TeamUpdateRow> {
  const data = await adminSelectMaybeSingle<TeamUpdateRow>('team_updates', {
    select: TEAM_UPDATE_COLUMNS,
    id: `eq.${teamUpdateId}`,
  });

  if (!data) {
    throw new Error(`Team update not found: ${teamUpdateId}`);
  }

  return data;
}

export async function sendTeamUpdatePushNotifications(input: {
  teamUpdateId?: string;
  record?: TeamUpdateRow;
}): Promise<TeamUpdatePushResult> {
  const teamUpdate = input.record?.id
    ? input.record
    : await loadTeamUpdate(input.teamUpdateId ?? '');

  const members = await adminSelect<{ user_id: string }>('team_members', {
    select: 'user_id',
    team_id: `eq.${teamUpdate.team_id}`,
  });

  const recipientUserIds = members
    .map((member) => member.user_id)
    .filter((userId) => userId && userId !== teamUpdate.created_by);

  if (recipientUserIds.length === 0) {
    return {
      notification_type: 'team_update',
      team_update_id: teamUpdate.id,
      team_id: teamUpdate.team_id,
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
    title: teamUpdate.title.trim(),
    body: truncate(teamUpdate.body, 180),
    sound: 'default',
    channelId: 'default',
    data: {
      notification_type: 'team_update',
      team_update_id: teamUpdate.id,
      team_id: teamUpdate.team_id,
      update_type: teamUpdate.update_type,
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
    notification_type: 'team_update',
    team_update_id: teamUpdate.id,
    team_id: teamUpdate.team_id,
    recipient_count: recipientUserIds.length,
    token_count: pushMessages.length,
    sent: pushResult.sent,
    failed: pushResult.failed,
    removed_invalid_tokens: pushResult.invalidTokens.length,
  };
}
