import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import {
  getServiceRoleKey,
  isAdminReadError,
  logServiceClientDiagnostics,
} from '../_shared/supabaseAdmin.ts';
import { sendTeamUpdatePushNotifications, type TeamUpdateRow } from '../_shared/teamUpdatePush.ts';

type DatabaseWebhookPayload = {
  type?: string;
  table?: string;
  schema?: string;
  record?: TeamUpdateRow;
  old_record?: TeamUpdateRow | null;
};

type DirectInvokePayload = {
  notification_type?: string;
  team_update_id?: string;
  record?: TeamUpdateRow;
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
  if (payload.record?.id) {
    return { record: payload.record };
  }

  if (payload.team_update_id) {
    return { teamUpdateId: payload.team_update_id };
  }

  throw new Error('Missing team update payload. Provide record or team_update_id.');
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

    const isInsertWebhook =
      payload.type === 'INSERT' &&
      payload.table === 'team_updates' &&
      payload.schema === 'public';

    const isDirectTeamUpdateInvoke =
      payload.notification_type === 'team_update' ||
      Boolean(payload.team_update_id) ||
      Boolean(payload.record?.id);

    if (!isInsertWebhook && !isDirectTeamUpdateInvoke) {
      return jsonResponse({
        ok: true,
        skipped: true,
        reason: 'Unsupported event. Only team_updates INSERT is handled.',
      });
    }

    logServiceClientDiagnostics('request received');

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
