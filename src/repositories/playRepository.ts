import { supabase } from '../lib/supabaseClient'
import type { Play } from '../types/play'
import type { PlayType } from '../types/playType'

/** Supabase `play_type` enum values. */
type DbPlayType = 'offense' | 'defense'
import type { CustomFormation } from '../utils/formationStorage'
import { normalizePlayName } from '../utils/playStorage'
import { normalizePlayRecord, type LegacyPlay } from '../utils/playNormalize'

type PlayRow = {
  id: string
  team_id: string
  name: string
  play_type: DbPlayType
  formation_id: string
  formation_name: string
  data: Play
  created_by?: string | null
  updated_by?: string | null
  created_at?: string
  updated_at?: string
}

const PLAY_COLUMNS =
  'id, team_id, name, play_type, formation_id, formation_name, data, created_by, updated_by, created_at, updated_at'

function logPlayError(context: string, error: { message: string; code?: string }): void {
  console.error(`[playRepository] ${context}`, error)
}

function toDbPlayType(playType: PlayType): DbPlayType {
  return playType === 'defensive' ? 'defense' : 'offense'
}

function fromDbPlayType(value: unknown): PlayType {
  if (value === 'defense' || value === 'defensive') return 'defensive'
  return 'offensive'
}

function playToData(play: Play, id: string): Play {
  return {
    ...play,
    id,
    name: normalizePlayName(play.name),
  }
}

function playToInsertRow(play: Play, teamId: string, userId?: string) {
  const id = play.id

  return {
    id,
    team_id: teamId,
    name: normalizePlayName(play.name),
    play_type: toDbPlayType(play.playType),
    formation_id: play.formationId,
    formation_name: play.formationName,
    data: playToData(play, id),
    ...(userId ? { created_by: userId, updated_by: userId } : {}),
  }
}

function playToUpdateRow(play: Play, userId?: string) {
  return {
    name: normalizePlayName(play.name),
    play_type: toDbPlayType(play.playType),
    formation_id: play.formationId,
    formation_name: play.formationName,
    data: playToData(play, play.id),
    ...(userId ? { updated_by: userId } : {}),
  }
}

function rowToPlay(row: PlayRow, customFormations: CustomFormation[]): Play {
  const stored = row.data ?? ({} as Partial<Play>)

  const legacy: LegacyPlay = {
    id: row.id,
    name: row.name ?? stored.name ?? 'Untitled Play',
    notes: stored.notes ?? '',
    formationId: row.formation_id ?? stored.formationId ?? '',
    formationName: row.formation_name ?? stored.formationName ?? '',
    driveStartYardLine: stored.driveStartYardLine,
    mirrored: stored.mirrored ?? false,
    playType: fromDbPlayType(row.play_type ?? stored.playType),
    players: stored.players ?? [],
    defenders: stored.defenders ?? [],
    routes: stored.routes ?? [],
    blocks: stored.blocks ?? [],
    defenderRoutes: stored.defenderRoutes ?? [],
    playerNotes: stored.playerNotes ?? {},
    createdAt: stored.createdAt ?? row.created_at ?? new Date().toISOString(),
  }

  return normalizePlayRecord(legacy, customFormations)
}

export async function getPlaysByTeam(
  teamId: string,
  customFormations: CustomFormation[],
): Promise<Play[]> {
  const { data, error } = await supabase
    .from('plays')
    .select(PLAY_COLUMNS)
    .eq('team_id', teamId)
    .order('updated_at', { ascending: false })

  if (error) {
    logPlayError('getPlaysByTeam', error)
    throw new Error(`Failed to load plays: ${error.message}`)
  }

  return ((data ?? []) as PlayRow[]).map((row) => rowToPlay(row, customFormations))
}

export async function getPlayById(
  teamId: string,
  playId: string,
  customFormations: CustomFormation[],
): Promise<Play | null> {
  const { data, error } = await supabase
    .from('plays')
    .select(PLAY_COLUMNS)
    .eq('team_id', teamId)
    .eq('id', playId)
    .maybeSingle()

  if (error) {
    logPlayError('getPlayById', error)
    throw new Error(`Failed to load play: ${error.message}`)
  }

  return data ? rowToPlay(data as PlayRow, customFormations) : null
}

export async function addPlay(
  teamId: string,
  play: Play,
  customFormations: CustomFormation[],
  userId?: string,
): Promise<Play> {
  const row = playToInsertRow(play, teamId, userId)
  const { data, error } = await supabase
    .from('plays')
    .insert(row)
    .select(PLAY_COLUMNS)
    .single()

  if (error) {
    logPlayError('addPlay', error)
    throw new Error(`Failed to save play: ${error.message}`)
  }

  return rowToPlay(data as PlayRow, customFormations)
}

export async function updatePlay(
  teamId: string,
  play: Play,
  customFormations: CustomFormation[],
  userId?: string,
): Promise<Play> {
  const row = playToUpdateRow(play, userId)
  const { data, error } = await supabase
    .from('plays')
    .update(row)
    .eq('team_id', teamId)
    .eq('id', play.id)
    .select(PLAY_COLUMNS)
    .single()

  if (error) {
    logPlayError('updatePlay', error)
    throw new Error(`Failed to update play: ${error.message}`)
  }

  return rowToPlay(data as PlayRow, customFormations)
}

export async function upsertPlay(
  teamId: string,
  play: Play,
  id: string,
  customFormations: CustomFormation[],
  userId?: string,
): Promise<Play> {
  const existing = await getPlayById(teamId, id, customFormations)
  const playToSave = { ...play, id }

  if (existing) {
    return updatePlay(teamId, playToSave, customFormations, userId)
  }

  return addPlay(teamId, playToSave, customFormations, userId)
}

export async function addNewPlay(
  teamId: string,
  play: Play,
  customFormations: CustomFormation[],
  userId?: string,
): Promise<Play> {
  const newPlay: Play = {
    ...play,
    id: crypto.randomUUID(),
    name: normalizePlayName(play.name),
  }

  return addPlay(teamId, newPlay, customFormations, userId)
}

export async function deletePlay(teamId: string, playId: string): Promise<void> {
  const { error } = await supabase
    .from('plays')
    .delete()
    .eq('team_id', teamId)
    .eq('id', playId)

  if (error) {
    logPlayError('deletePlay', error)
    throw new Error(`Failed to delete play: ${error.message}`)
  }
}

export function findSavedPlayByName(name: string, plays: Play[]): Play | undefined {
  const target = normalizePlayName(name).toLowerCase()
  return plays.find((saved) => normalizePlayName(saved.name).toLowerCase() === target)
}
