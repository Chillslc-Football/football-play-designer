import { supabase } from '../lib/supabaseClient'
import type { TeamEvent, TeamEventDraft } from '../types/teamEvent'

type TeamEventRow = {
  id: string
  team_id: string
  title: string
  starts_at: string
  ends_at: string
  location: string | null
  description: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

const COLUMNS =
  'id, team_id, title, starts_at, ends_at, location, description, created_by, created_at, updated_at'

function rowToEvent(row: TeamEventRow): TeamEvent {
  return {
    id: row.id,
    team_id: row.team_id,
    title: row.title,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    location: row.location,
    description: row.description,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

function normalizeOptionalText(value: string | null): string | null {
  if (value === null) return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function draftToInsertPayload(draft: TeamEventDraft, teamId: string) {
  return {
    id: draft.id,
    team_id: teamId,
    title: draft.title.trim(),
    starts_at: draft.starts_at,
    ends_at: draft.ends_at,
    location: normalizeOptionalText(draft.location),
    description: normalizeOptionalText(draft.description),
  }
}

function draftToUpdatePayload(draft: TeamEventDraft) {
  return {
    title: draft.title.trim(),
    starts_at: draft.starts_at,
    ends_at: draft.ends_at,
    location: normalizeOptionalText(draft.location),
    description: normalizeOptionalText(draft.description),
    updated_at: new Date().toISOString(),
  }
}

export async function getTeamEventsByTeam(teamId: string): Promise<TeamEvent[]> {
  const { data, error } = await supabase
    .from('team_events')
    .select(COLUMNS)
    .eq('team_id', teamId)
    .order('starts_at', { ascending: true })

  if (error) {
    throw new Error(`Failed to load team events: ${error.message}`)
  }

  return ((data ?? []) as TeamEventRow[]).map(rowToEvent)
}

export async function createTeamEvent(
  teamId: string,
  draft: TeamEventDraft,
): Promise<TeamEvent> {
  const insertPayload = draftToInsertPayload(draft, teamId)

  const { data, error } = await supabase
    .from('team_events')
    .insert(insertPayload)
    .select(COLUMNS)
    .single()

  if (error) {
    throw new Error(`Failed to create team event: ${error.message}`)
  }

  return rowToEvent(data as TeamEventRow)
}

export async function updateTeamEvent(
  teamId: string,
  draft: TeamEventDraft,
): Promise<TeamEvent> {
  const updatePayload = draftToUpdatePayload(draft)

  const { data, error } = await supabase
    .from('team_events')
    .update(updatePayload)
    .eq('id', draft.id)
    .eq('team_id', teamId)
    .select(COLUMNS)
    .single()

  if (error) {
    throw new Error(`Failed to save team event: ${error.message}`)
  }

  return rowToEvent(data as TeamEventRow)
}

export async function deleteTeamEvent(teamId: string, eventId: string): Promise<void> {
  const { error } = await supabase
    .from('team_events')
    .delete()
    .eq('team_id', teamId)
    .eq('id', eventId)

  if (error) {
    throw new Error(`Failed to delete team event: ${error.message}`)
  }
}
