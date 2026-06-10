import { supabase } from '../lib/supabaseClient'
import type { InvitePreview, InvitePreviewStatus, InviteRole, TeamInvite } from '../types/invite'

type PreviewRow = {
  team_name: string | null
  role: InviteRole | null
  email: string | null
  status: InvitePreviewStatus
}

function normalizePreview(row: PreviewRow | null): InvitePreview {
  if (!row) {
    return { teamName: null, role: null, email: null, status: 'invalid' }
  }

  return {
    teamName: row.team_name,
    role: row.role,
    email: row.email,
    status: row.status,
  }
}

export async function createTeamInvite(
  teamId: string,
  email: string,
  role: InviteRole,
): Promise<TeamInvite> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    throw new Error(userError.message)
  }

  if (!user) {
    throw new Error('Not signed in')
  }

  const { data, error } = await supabase
    .from('team_invites')
    .insert({
      team_id: teamId,
      role,
      email: email.trim().toLowerCase(),
      created_by: user.id,
    })
    .select('token')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  if (!data || typeof data.token !== 'string' || data.token.length === 0) {
    throw new Error('Invite was created but no token was returned')
  }

  return { token: data.token }
}

export async function previewTeamInvite(token: string): Promise<InvitePreview> {
  const { data, error } = await supabase.rpc('preview_team_invite', {
    p_token: token,
  })

  if (error) {
    throw new Error(error.message)
  }

  const row = Array.isArray(data)
    ? (data[0] as PreviewRow | undefined)
    : (data as PreviewRow | null | undefined)

  if (!row) {
    return { teamName: null, role: null, email: null, status: 'invalid' }
  }

  return normalizePreview(row)
}

export async function acceptTeamInvite(token: string): Promise<string> {
  const { data, error } = await supabase.rpc('accept_team_invite', {
    p_token: token,
  })

  if (error) {
    throw new Error(error.message)
  }

  if (typeof data !== 'string' || data.trim().length === 0) {
    throw new Error('Invite accepted but team id was not returned')
  }

  return data.trim()
}
