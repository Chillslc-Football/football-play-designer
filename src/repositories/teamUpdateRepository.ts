import { supabase } from '../lib/supabaseClient'
import {
  DEFAULT_TEAM_UPDATE_TYPE,
  type TeamUpdate,
  type TeamUpdateDraft,
} from '../types/teamUpdate'

type TeamUpdateRow = {
  id: string
  team_id: string
  title: string
  body: string
  update_type: string
  is_pinned: boolean
  show_on_home: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

const COLUMNS =
  'id, team_id, title, body, update_type, is_pinned, show_on_home, created_by, created_at, updated_at'

function rowToUpdate(row: TeamUpdateRow): TeamUpdate {
  return {
    id: row.id,
    team_id: row.team_id,
    title: row.title,
    body: row.body,
    update_type: DEFAULT_TEAM_UPDATE_TYPE,
    is_pinned: row.is_pinned,
    show_on_home: row.show_on_home,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

function draftToInsertPayload(draft: TeamUpdateDraft, teamId: string) {
  return {
    id: draft.id,
    team_id: teamId,
    title: draft.title.trim(),
    body: draft.body.trim(),
    update_type: DEFAULT_TEAM_UPDATE_TYPE,
    is_pinned: draft.is_pinned,
  }
}

function draftToUpdatePayload(draft: TeamUpdateDraft) {
  return {
    title: draft.title.trim(),
    body: draft.body.trim(),
    update_type: DEFAULT_TEAM_UPDATE_TYPE,
    is_pinned: draft.is_pinned,
    updated_at: new Date().toISOString(),
  }
}

export async function getTeamUpdatesByTeam(teamId: string): Promise<TeamUpdate[]> {
  const { data, error } = await supabase
    .from('team_updates')
    .select(COLUMNS)
    .eq('team_id', teamId)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to load team updates: ${error.message}`)
  }

  return ((data ?? []) as TeamUpdateRow[]).map(rowToUpdate)
}

export async function createTeamUpdate(
  teamId: string,
  draft: TeamUpdateDraft,
): Promise<TeamUpdate> {
  const insertPayload = draftToInsertPayload(draft, teamId)

  const { data, error } = await supabase
    .from('team_updates')
    .insert(insertPayload)
    .select(COLUMNS)
    .single()

  if (error) {
    throw new Error(`Failed to create team update: ${error.message}`)
  }

  return rowToUpdate(data as TeamUpdateRow)
}

export async function updateTeamUpdate(
  teamId: string,
  draft: TeamUpdateDraft,
): Promise<TeamUpdate> {
  const updatePayload = draftToUpdatePayload(draft)

  const { data, error } = await supabase
    .from('team_updates')
    .update(updatePayload)
    .eq('id', draft.id)
    .eq('team_id', teamId)
    .select(COLUMNS)
    .single()

  if (error) {
    throw new Error(`Failed to save team update: ${error.message}`)
  }

  return rowToUpdate(data as TeamUpdateRow)
}

export async function setTeamUpdateShowOnHome(
  updateId: string,
  showOnHome: boolean,
): Promise<TeamUpdate> {
  const { data, error } = await supabase.rpc('set_team_update_show_on_home', {
    p_update_id: updateId,
    p_show_on_home: showOnHome,
  })

  if (error) {
    throw new Error(`Failed to update show on home: ${error.message}`)
  }

  return rowToUpdate(data as TeamUpdateRow)
}

export async function deleteTeamUpdate(teamId: string, updateId: string): Promise<void> {
  const { error } = await supabase
    .from('team_updates')
    .delete()
    .eq('team_id', teamId)
    .eq('id', updateId)

  if (error) {
    throw new Error(`Failed to delete team update: ${error.message}`)
  }
}
