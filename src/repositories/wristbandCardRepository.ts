import { supabase } from '../lib/supabaseClient'
import type { WristbandCard, WristbandCardDraft } from '../types/wristbandCard'

type WristbandCardRow = {
  id: string
  team_id: string
  name: string
  wristband_width: number | string
  wristband_height: number | string
  size_unit: string
  left_heading: string
  right_heading: string
  left_play_ids: string[] | null
  right_play_ids: string[] | null
  created_by: string | null
  created_at: string
  updated_at: string
}

/** Columns sent on INSERT — created_by is set by DB default auth.uid(). */
export type WristbandCardInsertPayload = {
  id: string
  team_id: string
  name: string
  wristband_width: number
  wristband_height: number
  size_unit: 'inches'
  left_heading: string
  right_heading: string
  left_play_ids: string[]
  right_play_ids: string[]
}

type WristbandCardUpdatePayload = Omit<WristbandCardInsertPayload, 'id' | 'team_id'> & {
  updated_at: string
}

const COLUMNS =
  'id, team_id, name, wristband_width, wristband_height, size_unit, left_heading, right_heading, left_play_ids, right_play_ids, created_by, created_at, updated_at'

function toNumber(value: number | string): number {
  return typeof value === 'number' ? value : Number(value)
}

function rowToCard(row: WristbandCardRow): WristbandCard {
  return {
    id: row.id,
    team_id: row.team_id,
    name: row.name,
    wristband_width: toNumber(row.wristband_width),
    wristband_height: toNumber(row.wristband_height),
    size_unit: 'inches',
    left_heading: row.left_heading ?? '',
    right_heading: row.right_heading ?? '',
    left_play_ids: row.left_play_ids ?? [],
    right_play_ids: row.right_play_ids ?? [],
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

function draftToInsertPayload(draft: WristbandCardDraft, teamId: string): WristbandCardInsertPayload {
  const {
    id,
    name,
    wristband_width,
    wristband_height,
    left_heading,
    right_heading,
    left_play_ids,
    right_play_ids,
  } = draft

  return {
    id,
    team_id: teamId,
    name: name.trim(),
    wristband_width,
    wristband_height,
    size_unit: 'inches',
    left_heading: left_heading.trim(),
    right_heading: right_heading.trim(),
    left_play_ids,
    right_play_ids,
  }
}

function draftToUpdatePayload(draft: WristbandCardDraft, teamId: string): WristbandCardUpdatePayload {
  const insertPayload = draftToInsertPayload(draft, teamId)
  const { id: _id, team_id: _teamId, ...rest } = insertPayload

  return {
    ...rest,
    updated_at: new Date().toISOString(),
  }
}

export async function getWristbandCardsByTeam(teamId: string): Promise<WristbandCard[]> {
  const { data, error } = await supabase
    .from('wristband_cards')
    .select(COLUMNS)
    .eq('team_id', teamId)
    .order('updated_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to load wristband cards: ${error.message}`)
  }

  return ((data ?? []) as WristbandCardRow[]).map(rowToCard)
}

export async function upsertWristbandCard(
  teamId: string,
  draft: WristbandCardDraft,
): Promise<WristbandCard> {
  const { data: existing, error: lookupError } = await supabase
    .from('wristband_cards')
    .select('id')
    .eq('id', draft.id)
    .eq('team_id', teamId)
    .maybeSingle()

  if (lookupError) {
    throw new Error(`Failed to save wristband card: ${lookupError.message}`)
  }

  if (existing) {
    const updatePayload = draftToUpdatePayload(draft, teamId)
    const { data, error } = await supabase
      .from('wristband_cards')
      .update(updatePayload)
      .eq('id', draft.id)
      .eq('team_id', teamId)
      .select(COLUMNS)
      .single()

    if (error) {
      throw new Error(`Failed to save wristband card: ${error.message}`)
    }

    return rowToCard(data as WristbandCardRow)
  }

  const insertPayload = draftToInsertPayload(draft, teamId)

  const { data, error } = await supabase
    .from('wristband_cards')
    .insert(insertPayload)
    .select(COLUMNS)
    .single()

  if (error) {
    throw new Error(`Failed to save wristband card: ${error.message}`)
  }

  return rowToCard(data as WristbandCardRow)
}

export async function deleteWristbandCard(teamId: string, cardId: string): Promise<void> {
  const { error } = await supabase
    .from('wristband_cards')
    .delete()
    .eq('team_id', teamId)
    .eq('id', cardId)

  if (error) {
    throw new Error(`Failed to delete wristband card: ${error.message}`)
  }
}
