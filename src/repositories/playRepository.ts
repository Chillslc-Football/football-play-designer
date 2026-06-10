import { supabase } from '../lib/supabaseClient'
import type { Play } from '../types/play'
import type { PlayType } from '../types/playType'
import { normalizeCategories } from '../utils/categoryUtils'
import type { CustomFormation } from '../utils/formationStorage'

/** Supabase `play_type` enum values. */
type DbPlayType = 'offense' | 'defense'
import { normalizePlayName } from '../utils/playStorage'
import { renderPlayToDbPlay } from '../utils/positionCoordinates'
import { normalizePlayRecord, type LegacyPlay } from '../utils/playNormalize'

type PlayRow = {
  id: string
  team_id: string
  name: string
  play_type: DbPlayType
  formation_id: string
  formation_name: string
  front_id: string | null
  front_name: string | null
  opponent_formation_id: string | null
  opponent_formation_name: string | null
  categories: string[] | null
  data: Play
  created_by?: string | null
  updated_by?: string | null
  created_at?: string
  updated_at?: string
}

const PLAY_COLUMNS =
  'id, team_id, name, play_type, formation_id, formation_name, front_id, front_name, opponent_formation_id, opponent_formation_name, categories, data, created_by, updated_by, created_at, updated_at'

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
  const renderPlay: Play = {
    ...play,
    id,
    name: normalizePlayName(play.name),
    categories: normalizeCategories(play.categories),
  }

  return renderPlayToDbPlay(renderPlay)
}

function playCategories(play: Play, rowCategories?: string[] | null): string[] {
  if (rowCategories != null) {
    return normalizeCategories(rowCategories)
  }
  return normalizeCategories(play.categories)
}

function playSchemeColumns(play: Play) {
  const isDefensive = play.playType === 'defensive'

  return {
    formation_id: play.formationId,
    formation_name: play.formationName,
    front_id: isDefensive ? play.frontId : null,
    front_name: isDefensive ? play.frontName : null,
    opponent_formation_id: play.opponentFormationId,
    opponent_formation_name: play.opponentFormationName,
  }
}

function playToInsertRow(play: Play, teamId: string, userId?: string) {
  const id = play.id

  return {
    id,
    team_id: teamId,
    name: normalizePlayName(play.name),
    play_type: toDbPlayType(play.playType),
    ...playSchemeColumns(play),
    categories: playCategories(play),
    data: playToData(play, id),
    ...(userId ? { created_by: userId, updated_by: userId } : {}),
  }
}

function playToUpdateRow(play: Play, userId?: string) {
  return {
    name: normalizePlayName(play.name),
    play_type: toDbPlayType(play.playType),
    ...playSchemeColumns(play),
    categories: playCategories(play),
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
    frontId: row.front_id ?? stored.frontId,
    frontName: row.front_name ?? stored.frontName,
    opponentFormationId: row.opponent_formation_id ?? stored.opponentFormationId ?? null,
    opponentFormationName: row.opponent_formation_name ?? stored.opponentFormationName ?? null,
    driveStartYardLine: stored.driveStartYardLine,
    mirrored: stored.mirrored ?? false,
    playType: fromDbPlayType(row.play_type ?? stored.playType),
    players: stored.players ?? [],
    defenders: stored.defenders ?? [],
    routes: stored.routes ?? [],
    blocks: stored.blocks ?? [],
    motions: stored.motions ?? [],
    defenderRoutes: stored.defenderRoutes ?? [],
    playerNotes: stored.playerNotes ?? {},
    categories: playCategories(stored as Play, row.categories),
    positionFormat: stored.positionFormat,
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
  console.log('Creating play once:', row)
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
