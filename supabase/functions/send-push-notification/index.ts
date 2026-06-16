import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import {
  getServiceRoleKey,
  isAdminReadError,
  logServiceClientDiagnostics,
} from '../_shared/supabaseAdmin.ts';
import {
  isTeamMessageRecord,
  sendTeamMessagePushNotifications,
  type TeamMessageRow,
} from '../_shared/teamMessagePush.ts';
import { sendTeamUpdatePushNotifications, type TeamUpdateRow } from '../_shared/teamUpdatePush.ts';

type DatabaseWebhookPayload = {
  type?: string;
  table?: string;
  schema?: string;
  record?: TeamUpdateRow | TeamMessageRow;
  old_record?: TeamUpdateRow | TeamMessageRow | null;
};

type DirectInvokePayload = {
  notification_type?: string;
  team_update_id?: string;
  team_message_id?: string;
  message_id?: string;
  record?: TeamUpdateRow | TeamMessageRow;
};

type RequestPayload = DatabaseWebhookPayload & DirectInvokePayload;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-push-webhook-secret',
};

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function isAuthorized(req: Request): boolean {
  const webhookSecret = Deno.env.get('PUSH_WEBHOOK_SECRET');
  const providedSecret = req.headers.get('x-push-webhook-secret');

  if (webhookSecret && providedSecret === webhookSecret) {
    return true;
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  const serviceRoleKey = getServiceRoleKey() ?? '';

  if (serviceRoleKey && authHeader === `Bearer ${serviceRoleKey}`) {
    return true;
  }

  return false;
}

function resolveTeamUpdateInput(payload: RequestPayload): { teamUpdateId?: string; record?: TeamUpdateRow } {
  if (payload.record && !isTeamMessageRecord(payload.record)) {
    return { record: payload.record as TeamUpdateRow };
  }

  if (payload.team_update_id) {
    return { teamUpdateId: payload.team_update_id };
  }

  throw new Error('Missing team update payload. Provide record or team_update_id.');
}

function resolveTeamMessageInput(payload: RequestPayload): { messageId?: string; record?: TeamMessageRow } {
  if (payload.record && isTeamMessageRecord(payload.record)) {
    return { record: payload.record };
  }

  const messageId = payload.team_message_id ?? payload.message_id;

  if (messageId) {
    return { messageId };
  }

  throw new Error('Missing team message payload. Provide record, team_message_id, or message_id.');
}

function isTeamUpdateInsertWebhook(payload: RequestPayload): boolean {
  return (
    payload.type === 'INSERT' &&
    payload.table === 'team_updates' &&
    payload.schema === 'public'
  );
}

function isTeamMessageInsertWebhook(payload: RequestPayload): boolean {
  return (
    payload.type === 'INSERT' &&
    payload.table === 'team_messages' &&
    payload.schema === 'public'
  );
}

function isDirectTeamUpdateInvoke(payload: RequestPayload): boolean {
  if (payload.notification_type === 'team_update') {
    return true;
  }

  if (payload.team_update_id) {
    return true;
  }

  return Boolean(payload.record?.id) && !isTeamMessageRecord(payload.record);
}

function isDirectTeamMessageInvoke(payload: RequestPayload): boolean {
  if (payload.notification_type === 'team_message') {
    return true;
  }

  if (payload.team_message_id || payload.message_id) {
    return true;
  }

  return isTeamMessageRecord(payload.record);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  if (!isAuthorized(req)) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  try {
    const payload = (await req.json()) as RequestPayload;

    const routeTeamMessage =
      isTeamMessageInsertWebhook(payload) || isDirectTeamMessageInvoke(payload);
    const routeTeamUpdate =
      isTeamUpdateInsertWebhook(payload) || isDirectTeamUpdateInvoke(payload);

    if (!routeTeamMessage && !routeTeamUpdate) {
      return jsonResponse({
        ok: true,
        skipped: true,
        reason: 'Unsupported event. Only team_updates and team_messages INSERT are handled.',
      });
    }

    logServiceClientDiagnostics('request received');

    if (routeTeamMessage) {
      const result = await sendTeamMessagePushNotifications(resolveTeamMessageInput(payload));

      return jsonResponse({
        ok: true,
        ...result,
      });
    }

    const result = await sendTeamUpdatePushNotifications(resolveTeamUpdateInput(payload));

    return jsonResponse({
      ok: true,
      ...result,
    });
  } catch (error) {
    if (isAdminReadError(error)) {
      return jsonResponse(
        {
          ok: false,
          error: error.message,
          diagnostics: error.diagnostics,
        },
        500,
      );
    }

    const message = error instanceof Error ? error.message : 'Unknown error';

    return jsonResponse({ ok: false, error: message }, 500);
  }
});
