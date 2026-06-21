import { supabase } from '../lib/supabaseClient'
import type {
  AcceptJoinLinkResult,
  AcceptJoinLinkStatus,
  JoinLinkPreview,
  JoinLinkPreviewStatus,
  JoinLinkRecord,
  JoinLinkRole,
} from '../types/joinLink'

type JoinLinkRow = {
  role: JoinLinkRole
  token: string
  created_at: string
  last_used_at: string | null
}

type PreviewRow = {
  team_name: string | null
  role: JoinLinkRole | null
  status: JoinLinkPreviewStatus
}

type AcceptRow = {
  team_id: string | null
  status: AcceptJoinLinkStatus
}

function firstRow<T>(data: unknown): T | null {
  if (data == null) return null
  if (Array.isArray(data)) {
    return (data[0] as T | undefined) ?? null
  }
  return data as T
}

export async function fetchTeamJoinLinks(teamId: string): Promise<JoinLinkRecord[]> {
  const { data, error } = await supabase.rpc('get_team_join_links', {
    p_team_id: teamId,
  })

  if (error) {
    throw new Error(error.message)
  }

  return ((data ?? []) as JoinLinkRow[]).map((row) => ({
    role: row.role,
    token: row.token,
    created_at: row.created_at,
    last_used_at: row.last_used_at,
  }))
}

export async function regenerateTeamJoinLink(
  teamId: string,
  role: JoinLinkRole,
): Promise<string> {
  const { data, error } = await supabase.rpc('regenerate_team_join_link', {
    p_team_id: teamId,
    p_role: role,
  })

  if (error) {
    throw new Error(error.message)
  }

  if (typeof data !== 'string' || data.trim().length === 0) {
    throw new Error('Join link was regenerated but no token was returned')
  }

  return data.trim()
}

export async function previewTeamJoinLink(token: string): Promise<JoinLinkPreview> {
  const { data, error } = await supabase.rpc('preview_team_join_link', {
    p_token: token,
  })

  if (error) {
    throw new Error(error.message)
  }

  const row = firstRow<PreviewRow>(data)
  if (!row) {
    return { teamName: null, role: null, status: 'invalid' }
  }

  return {
    teamName: row.team_name,
    role: row.role,
    status: row.status ?? 'invalid',
  }
}

export async function acceptTeamJoinLink(token: string): Promise<AcceptJoinLinkResult> {
  const { data, error } = await supabase.rpc('accept_team_join_link', {
    p_token: token,
  })

  if (error) {
    throw new Error(error.message)
  }

  const row = firstRow<AcceptRow>(data)
  if (!row) {
    return { teamId: null, status: 'invalid' }
  }

  return {
    teamId: row.team_id,
    status: row.status ?? 'invalid',
  }
}
