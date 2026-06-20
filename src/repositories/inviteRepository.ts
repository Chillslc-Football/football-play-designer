import { supabase } from '../lib/supabaseClient'
import type { InvitePreview, InvitePreviewStatus, InviteRole, TeamInvite, TeamInviteRecord } from '../types/invite'
import type { TeamMemberRecord } from '../types/teamRoster'
import type { TeamRole } from '../types/team'

type PreviewRow = {
  team_name: string | null
  role: InviteRole | null
  email: string | null
  status: InvitePreviewStatus
}

type PreviewRowRaw = PreviewRow & {
  invited_email?: string | null
}

function normalizePreview(row: PreviewRowRaw | null): InvitePreview {
  if (!row) {
    return { teamName: null, role: null, email: null, status: 'invalid' }
  }

  const email = row.email ?? row.invited_email ?? null
  const status =
    row.status ?? (row.team_name && email ? 'pending' : 'invalid')

  return {
    teamName: row.team_name,
    role: row.role,
    email,
    status,
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

type SendInviteEmailResponse = {
  ok?: boolean
  error?: string
}

async function getInvokeErrorMessage(error: unknown): Promise<string> {
  if (!error || typeof error !== 'object') {
    return 'Could not send invite email'
  }

  const invokeError = error as { name?: string; message?: string; context?: Response }

  if (invokeError.name === 'FunctionsHttpError' && invokeError.context instanceof Response) {
    try {
      const body = (await invokeError.context.json()) as SendInviteEmailResponse
      if (body.error) {
        return body.error
      }
    } catch {
      // Fall through to generic message below.
    }
  }

  if (typeof invokeError.message === 'string' && invokeError.message.length > 0) {
    return invokeError.message
  }

  return 'Could not send invite email'
}

export async function sendTeamInviteEmail(token: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('send-team-invite-email', {
    body: { token },
  })

  if (error) {
    throw new Error(await getInvokeErrorMessage(error))
  }

  const response = data as SendInviteEmailResponse | null

  if (response?.error) {
    throw new Error(response.error)
  }

  if (!response?.ok) {
    throw new Error('Failed to send invite email')
  }
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

type TeamMemberRow = {
  user_id: string
  role: TeamRole
}

type ProfileNameRow = {
  id: string
  display_name: string | null
}

const TEAM_INVITE_EDITOR_COLUMNS =
  'id, team_id, role, email, token, expires_at, created_at, accepted_at, revoked_at'

type TeamInviteRosterRow = Omit<TeamInviteRecord, 'token'>

export async function fetchTeamInvitesForTeam(
  teamId: string,
  options: { includeToken: boolean },
): Promise<TeamInviteRecord[]> {
  if (options.includeToken) {
    const { data, error } = await supabase
      .from('team_invites')
      .select(TEAM_INVITE_EDITOR_COLUMNS)
      .eq('team_id', teamId)
      .is('accepted_at', null)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? []) as TeamInviteRecord[]
  }

  const { data, error } = await supabase.rpc('get_team_invite_roster', {
    p_team_id: teamId,
  })

  if (error) {
    throw new Error(error.message)
  }

  return ((data ?? []) as TeamInviteRosterRow[]).map((row) => ({
    ...row,
    token: null,
  }))
}

export async function revokeTeamInvite(inviteId: string): Promise<void> {
  const { error } = await supabase
    .from('team_invites')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', inviteId)

  if (error) {
    throw new Error(error.message)
  }
}

async function fetchProfileDisplayNames(userIds: string[]): Promise<Map<string, string>> {
  const uniqueIds = [...new Set(userIds.filter((id) => id.length > 0))]
  if (uniqueIds.length === 0) {
    return new Map()
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name')
    .in('id', uniqueIds)

  if (error) {
    throw new Error(`Failed to load member profiles: ${error.message}`)
  }

  const names = new Map<string, string>()
  for (const row of (data ?? []) as ProfileNameRow[]) {
    const trimmed = row.display_name?.trim()
    if (trimmed) {
      names.set(row.id, trimmed)
    }
  }

  return names
}

export async function fetchTeamMembersForTeam(teamId: string): Promise<TeamMemberRecord[]> {
  const { data, error } = await supabase
    .from('team_members')
    .select('user_id, role')
    .eq('team_id', teamId)

  if (error) {
    throw new Error(error.message)
  }

  const rows = (data ?? []) as TeamMemberRow[]
  const displayNames = await fetchProfileDisplayNames(rows.map((row) => row.user_id))

  return rows.map((row) => ({
    user_id: row.user_id,
    role: row.role,
    display_name: displayNames.get(row.user_id) ?? null,
  }))
}
