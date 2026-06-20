import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { createClient } from 'npm:@supabase/supabase-js@2';

import { createServiceClient } from '../_shared/supabaseAdmin.ts';

type RequestPayload = {
  team_id?: string;
  recipient_email?: string;
  note?: string;
};

const NOT_TEAM_MEMBER_ERROR =
  'Invite this person to the team first, then they can view the playbook.';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

function normalizeSecret(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

function getAppUrl(): string {
  const appUrl =
    normalizeSecret(Deno.env.get('APP_URL')) ?? normalizeSecret(Deno.env.get('SITE_URL'));

  if (!appUrl) {
    throw new Error('APP_URL is not configured.');
  }

  return appUrl.replace(/\/$/, '');
}

function getUserJwt(req: Request): string | null {
  const authHeader = req.headers.get('Authorization') ?? '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? null;
}

function canSendPlaybookEmail(memberRole: string | null): boolean {
  return memberRole === 'team_owner' || memberRole === 'coach';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatNoteHtml(note: string, senderName: string): string {
  const trimmed = note.trim();
  if (!trimmed) {
    return '';
  }

  const escaped = escapeHtml(trimmed).replace(/\r\n/g, '\n').replace(/\n/g, '<br>');
  return `<p><strong>Note from ${escapeHtml(senderName)}:</strong><br>${escaped}</p>`;
}

function buildPlaybookUrl(teamId: string): string {
  const params = new URLSearchParams({
    team: teamId,
    open: 'play-library',
  });
  return `${getAppUrl()}/?${params.toString()}`;
}

async function sendResendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const apiKey = normalizeSecret(Deno.env.get('RESEND_API_KEY'));
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured.');
  }

  const from = normalizeSecret(Deno.env.get('RESEND_FROM_EMAIL'));
  if (!from) {
    throw new Error('RESEND_FROM_EMAIL is not configured.');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [params.to],
      subject: params.subject,
      html: params.html,
    }),
  });

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = (await response.json()) as { message?: string };
      if (body.message) {
        detail = body.message;
      }
    } catch {
      const text = await response.text();
      if (text) {
        detail = text;
      }
    }

    throw new Error(`Failed to send email: ${detail}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'Method not allowed' }, 405);
  }

  try {
    const jwt = getUserJwt(req);
    if (!jwt) {
      return jsonResponse({ ok: false, error: 'Not authenticated' }, 401);
    }

    const supabaseUrl = normalizeSecret(Deno.env.get('SUPABASE_URL'));
    const anonKey = normalizeSecret(Deno.env.get('SUPABASE_ANON_KEY'));
    if (!supabaseUrl || !anonKey) {
      throw new Error('Missing Supabase configuration.');
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser(jwt);

    if (userError || !user) {
      return jsonResponse({ ok: false, error: 'Not authenticated' }, 401);
    }

    const payload = (await req.json()) as RequestPayload;
    const teamId = payload.team_id?.trim();
    const recipientEmail = payload.recipient_email?.trim().toLowerCase() ?? '';
    const note = typeof payload.note === 'string' ? payload.note : '';

    if (!teamId) {
      return jsonResponse({ ok: false, error: 'team_id is required' }, 400);
    }

    if (!recipientEmail) {
      return jsonResponse({ ok: false, error: 'recipient_email is required' }, 400);
    }

    const { data: membership, error: memberError } = await userClient
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (memberError) {
      throw new Error(memberError.message);
    }

    if (!canSendPlaybookEmail(membership?.role ?? null)) {
      return jsonResponse({ ok: false, error: 'Not allowed to share playbooks for this team' }, 403);
    }

    const adminClient = createServiceClient();
    const { data: isMember, error: membershipLookupError } = await adminClient.rpc(
      'is_team_member_by_email',
      {
        p_team_id: teamId,
        p_email: recipientEmail,
      },
    );

    if (membershipLookupError) {
      throw new Error(membershipLookupError.message);
    }

    if (!isMember) {
      return jsonResponse({ ok: false, error: NOT_TEAM_MEMBER_ERROR }, 400);
    }

    const { data: team, error: teamError } = await userClient
      .from('teams')
      .select('name')
      .eq('id', teamId)
      .maybeSingle();

    if (teamError) {
      throw new Error(teamError.message);
    }

    if (!team?.name) {
      return jsonResponse({ ok: false, error: 'Team not found' }, 404);
    }

    const { data: profile } = await userClient
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .maybeSingle();

    const senderName = profile?.display_name?.trim() || 'A coach';
    const playbookUrl = buildPlaybookUrl(teamId);
    const subject = `${team.name} playbook shared with you`;
    const noteHtml = formatNoteHtml(note, senderName);
    const html = `
<p>${escapeHtml(senderName)} shared the <strong>${escapeHtml(team.name)}</strong> playbook with you.</p>
${noteHtml}
<p><a href="${escapeHtml(playbookUrl)}">Open Playbook</a></p>
`.trim();

    await sendResendEmail({
      to: recipientEmail,
      subject,
      html,
    });

    return jsonResponse({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[send-playbook-email]', message);
    return jsonResponse({ ok: false, error: message }, 500);
  }
});
