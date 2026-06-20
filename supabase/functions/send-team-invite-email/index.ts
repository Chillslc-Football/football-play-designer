import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { createClient } from 'npm:@supabase/supabase-js@2';

type TeamInviteRow = {
  id: string;
  team_id: string;
  role: string;
  email: string;
  token: string;
  expires_at: string;
  created_by: string;
  accepted_at: string | null;
  revoked_at: string | null;
};

type RequestPayload = {
  token?: string;
  invite_id?: string;
};

const ROLE_LABELS: Record<string, string> = {
  coach: 'Coach',
  player: 'Player',
  parent: 'Parent',
};

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

function canInviteMember(memberRole: string | null, inviteRole: string): boolean {
  if (!memberRole || (memberRole !== 'team_owner' && memberRole !== 'coach')) {
    return false;
  }

  if (inviteRole === 'coach') {
    return memberRole === 'team_owner';
  }

  return inviteRole === 'player' || inviteRole === 'parent';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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
      const body = await response.json() as { message?: string };
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
    const token = payload.token?.trim();
    const inviteId = payload.invite_id?.trim();

    if (!token && !inviteId) {
      return jsonResponse({ ok: false, error: 'token or invite_id is required' }, 400);
    }

    let inviteQuery = userClient
      .from('team_invites')
      .select(
        'id, team_id, role, email, token, expires_at, created_by, accepted_at, revoked_at',
      );

    inviteQuery = token ? inviteQuery.eq('token', token) : inviteQuery.eq('id', inviteId!);

    const { data: invite, error: inviteError } = await inviteQuery.maybeSingle();

    if (inviteError) {
      throw new Error(inviteError.message);
    }

    if (!invite) {
      return jsonResponse({ ok: false, error: 'Invite not found' }, 404);
    }

    const inviteRow = invite as TeamInviteRow;

    if (inviteRow.revoked_at) {
      return jsonResponse({ ok: false, error: 'Invite was revoked' }, 400);
    }

    if (inviteRow.accepted_at) {
      return jsonResponse({ ok: false, error: 'Invite already accepted' }, 400);
    }

    if (new Date(inviteRow.expires_at) <= new Date()) {
      return jsonResponse({ ok: false, error: 'Invite has expired' }, 400);
    }

    const { data: membership, error: memberError } = await userClient
      .from('team_members')
      .select('role')
      .eq('team_id', inviteRow.team_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (memberError) {
      throw new Error(memberError.message);
    }

    if (!canInviteMember(membership?.role ?? null, inviteRow.role)) {
      return jsonResponse({ ok: false, error: 'Not allowed to send invites for this team' }, 403);
    }

    const { data: team, error: teamError } = await userClient
      .from('teams')
      .select('name')
      .eq('id', inviteRow.team_id)
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
      .eq('id', inviteRow.created_by)
      .maybeSingle();

    const inviterName = profile?.display_name?.trim() || 'A coach';
    const roleLabel = ROLE_LABELS[inviteRow.role] ?? inviteRow.role;
    const inviteUrl = `${getAppUrl()}/accept-invite?token=${inviteRow.token}`;
    const subject = `You're invited to join ${team.name}`;
    const html = `
<p>${escapeHtml(inviterName)} invited you to join <strong>${escapeHtml(team.name)}</strong> as a ${escapeHtml(roleLabel)}.</p>
<p>Click below to accept the invite:</p>
<p><a href="${escapeHtml(inviteUrl)}">${escapeHtml(inviteUrl)}</a></p>
<p>This invite expires in 14 days.</p>
`.trim();

    await sendResendEmail({
      to: inviteRow.email,
      subject,
      html,
    });

    return jsonResponse({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[send-team-invite-email]', message);
    return jsonResponse({ ok: false, error: message }, 500);
  }
});
