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
    .select('id, display_name, last_team_id')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data
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
  const profile = await fetchProfile(userId)
  console.log('[TeamProvider] profile loaded', profile)

  const lastTeamId = profile?.last_team_id ?? null
  console.log('[TeamProvider] last_team_id value', lastTeamId)

  const memberRows = await fetchMembershipRows(userId)
  console.log('[TeamProvider] team_members rows', memberRows)

  const memberships: TeamMembership[] = []
  for (const row of memberRows) {
    const team = await fetchTeamById(row.team_id)
    if (!team) continue
    memberships.push({ role: row.role, team })
  }

  const findMembership = (teamId: string): TeamMembership | null =>
    memberships.find((entry) => entry.team.id === teamId) ?? null

  if (lastTeamId) {
    const activeMembership = findMembership(lastTeamId)
    console.log('[TeamProvider] active team fetch result', activeMembership?.team ?? null)

    if (activeMembership) {
      return {
        profile,
        activeTeamId: lastTeamId,
        team: activeMembership.team,
        role: activeMembership.role,
        memberships,
        needsOnboarding: false,
      }
    }
  }

  if (memberships.length > 0) {
    const fallback = memberships[0]
    console.log('[TeamProvider] team_members fallback result', {
      teamId: fallback.team.id,
      team: fallback.team,
      role: fallback.role,
    })

    if (lastTeamId !== fallback.team.id) {
      await updateLastTeamId(userId, fallback.team.id)
    }

    return {
      profile,
      activeTeamId: fallback.team.id,
      team: fallback.team,
      role: fallback.role,
      memberships,
      needsOnboarding: false,
    }
  }

  const needsOnboarding = memberRows.length === 0
  console.log('[TeamProvider] needs onboarding', needsOnboarding)

  return {
    profile,
    activeTeamId: null,
    team: null,
    role: null,
    memberships,
    needsOnboarding,
  }
}

/** Loads team state immediately after create_team using the returned team id. */
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
