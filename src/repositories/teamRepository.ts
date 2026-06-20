import { supabase } from '../lib/supabaseClient'
import type { Profile, Team, TeamMembership, TeamRole } from '../types/team'

type TeamMemberRow = {
  team_id: string
  role: TeamRole
}

export type ActiveTeamLoadResult = {
  profile: Profile | null
  activeTeamId: string | null
  team: Team | null
  role: TeamRole | null
  memberships: TeamMembership[]
  needsOnboarding: boolean
}

function parseTeamId(data: unknown): string {
  if (typeof data === 'string' && data.trim().length > 0) {
    return data.trim()
  }
  throw new Error('create_team did not return a team id')
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, last_team_id, is_app_admin')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    const missingAdminColumn =
      error.message.includes('is_app_admin') ||
      error.code === '42703' ||
      error.code === 'PGRST204'

    if (missingAdminColumn) {
      console.warn(
        '[TeamProvider] profiles.is_app_admin unavailable; loading profile without admin flag',
        { userId, code: error.code, message: error.message },
      )

      const fallback = await supabase
        .from('profiles')
        .select('id, display_name, last_team_id')
        .eq('id', userId)
        .maybeSingle()

      if (fallback.error) {
        throw new Error(fallback.error.message)
      }

      if (!fallback.data) return null

      return {
        ...fallback.data,
        is_app_admin: false,
      }
    }

    throw new Error(error.message)
  }

  if (!data) return null

  return {
    ...data,
    is_app_admin: data.is_app_admin ?? false,
  }
}

function logSupabaseError(context: string, error: {
  code?: string
  message: string
  details?: string
  hint?: string
}): void {
  console.error(`[TeamProvider] ${context}`, {
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint,
  })
}

export async function fetchMembershipRows(userId: string): Promise<TeamMemberRow[]> {
  const { data, error } = await supabase
    .from('team_members')
    .select('team_id, role')
    .eq('user_id', userId)

  if (error) {
    logSupabaseError('team_members SELECT (fetchMembershipRows)', error)
    throw new Error(
      `team_members: ${error.message}${error.code ? ` [${error.code}]` : ''}`,
    )
  }

  return (data ?? []) as TeamMemberRow[]
}

export async function fetchMemberships(userId: string): Promise<TeamMembership[]> {
  const rows = await fetchMembershipRows(userId)
  const memberships: TeamMembership[] = []

  for (const row of rows) {
    const team = await fetchTeamById(row.team_id)
    if (!team) continue
    memberships.push({ role: row.role, team })
  }

  return memberships
}

export async function fetchTeamById(teamId: string): Promise<Team | null> {
  const { data, error } = await supabase
    .from('teams')
    .select('id, name, created_by, created_at')
    .eq('id', teamId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function updateLastTeamId(userId: string, teamId: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ last_team_id: teamId })
    .eq('id', userId)

  if (error) {
    throw new Error(error.message)
  }
}

export async function createTeam(name: string): Promise<string> {
  const { data, error } = await supabase.rpc('create_team', { p_name: name.trim() })

  if (error) {
    throw new Error(error.message)
  }

  return parseTeamId(data)
}

export async function loadActiveTeamForUser(userId: string): Promise<ActiveTeamLoadResult> {
  console.log('[TeamProvider] loadActiveTeamForUser start', { userId })

  const profile = await fetchProfile(userId)
  console.log('[TeamProvider] profile row found', {
    found: profile !== null,
    profileId: profile?.id ?? null,
    last_team_id: profile?.last_team_id ?? null,
    is_app_admin: profile?.is_app_admin ?? false,
  })

  const lastTeamId = profile?.last_team_id ?? null

  const memberRows = await fetchMembershipRows(userId)
  console.log('[TeamProvider] memberships returned', {
    count: memberRows.length,
    teamIds: memberRows.map((row) => row.team_id),
    roles: memberRows.map((row) => row.role),
  })

  const memberships: TeamMembership[] = []
  for (const row of memberRows) {
    const team = await fetchTeamById(row.team_id)
    if (!team) {
      console.warn('[TeamProvider] skipped membership list entry; team not loaded', {
        teamId: row.team_id,
      })
      continue
    }
    memberships.push({ role: row.role, team })
  }

  if (lastTeamId) {
    const membershipRow = memberRows.find((row) => row.team_id === lastTeamId) ?? null
    const team = await fetchTeamById(lastTeamId)

    console.log('[TeamProvider] last_team_id resolution', {
      lastTeamId,
      teamFound: team !== null,
      membershipFound: membershipRow !== null,
      role: membershipRow?.role ?? null,
    })

    if (team && membershipRow) {
      const selected = {
        activeTeamId: lastTeamId,
        team,
        role: membershipRow.role,
      }
      console.log('[TeamProvider] selected active team', selected)

      return {
        profile,
        ...selected,
        memberships,
        needsOnboarding: false,
      }
    }

    console.warn('[TeamProvider] last_team_id is missing, invalid, or no longer accessible', {
      lastTeamId,
    })
  }

  if (memberRows.length > 0) {
    for (const row of memberRows) {
      const team = await fetchTeamById(row.team_id)
      if (!team) {
        console.warn('[TeamProvider] fallback skipped; team not loaded', { teamId: row.team_id })
        continue
      }

      if (lastTeamId !== row.team_id) {
        try {
          await updateLastTeamId(userId, row.team_id)
        } catch (updateError) {
          console.warn('[TeamProvider] could not persist fallback last_team_id', {
            teamId: row.team_id,
            updateError,
          })
        }
      }

      const selected = {
        activeTeamId: row.team_id,
        team,
        role: row.role,
      }
      console.log('[TeamProvider] selected active team (fallback)', selected)

      return {
        profile,
        ...selected,
        memberships,
        needsOnboarding: false,
      }
    }

    throw new Error('Team memberships exist but team records could not be loaded.')
  }

  console.log('[TeamProvider] showing Create Team reason', {
    reason: 'no_team_memberships',
    userId,
    last_team_id: lastTeamId,
  })

  return {
    profile,
    activeTeamId: null,
    team: null,
    role: null,
    memberships,
    needsOnboarding: true,
  }
}

/** Loads team state immediately after create_team using the returned team id. */
export async function clearLastTeamId(userId: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ last_team_id: null })
    .eq('id', userId)

  if (error) {
    throw new Error(error.message)
  }
}

export async function deleteTeam(teamId: string, context?: { role?: string | null }): Promise<void> {
  console.log('[deleteTeam] starting', {
    teamId,
    role: context?.role ?? null,
    rpc: 'delete_team',
    params: { p_team_id: teamId },
  })

  const { data, error } = await supabase.rpc('delete_team', { p_team_id: teamId })

  console.log('[deleteTeam] RPC response', { teamId, data, error })

  if (error) {
    logSupabaseError('delete_team RPC', error)
    const details = [error.message, error.code ? `code=${error.code}` : null, error.hint ? `hint=${error.hint}` : null]
      .filter(Boolean)
      .join(' — ')
    throw new Error(details)
  }

  const remainingTeam = await fetchTeamById(teamId)
  console.log('[deleteTeam] post-delete team lookup', { teamId, remainingTeam })

  if (remainingTeam) {
    throw new Error(
      'Team was not deleted from the database. Apply supabase/migrations/20250608150000_delete_team_rpc.sql in Supabase, then try again.',
    )
  }
}

export async function loadActiveTeamAfterCreate(
  userId: string,
  teamId: string,
): Promise<TeamMembership> {
  const team = await fetchTeamById(teamId)
  if (!team) {
    throw new Error('Team was created but could not be loaded. Try refreshing the page.')
  }

  const { data: membership, error: membershipError } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .maybeSingle()

  if (membershipError) {
    logSupabaseError('team_members SELECT (loadActiveTeamAfterCreate)', membershipError)
    throw new Error(
      `team_members: ${membershipError.message}${membershipError.code ? ` [${membershipError.code}]` : ''}`,
    )
  }

  if (!membership) {
    throw new Error('Team membership was not found after creation.')
  }

  await updateLastTeamId(userId, teamId)

  return { role: membership.role as TeamRole, team }
}

export async function removeTeamMember(teamId: string, userId: string): Promise<void> {
  const { error } = await supabase.rpc('remove_team_member', {
    p_team_id: teamId,
    p_user_id: userId,
  })

  if (error) {
    throw new Error(error.message)
  }
}
