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

function draftToRow(draft: WristbandCardDraft, teamId: string, userId?: string) {
  return {
    id: draft.id,
    team_id: teamId,
    name: draft.name.trim(),
    wristband_width: draft.wristband_width,
    wristband_height: draft.wristband_height,
    size_unit: 'inches',
    left_heading: draft.left_heading.trim(),
    right_heading: draft.right_heading.trim(),
    left_play_ids: draft.left_play_ids,
    right_play_ids: draft.right_play_ids,
    ...(userId ? { created_by: userId } : {}),
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
  userId?: string,
): Promise<WristbandCard> {
  const row = draftToRow(draft, teamId, userId)

  const { data, error } = await supabase
    .from('wristband_cards')
    .upsert(row, { onConflict: 'id' })
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
