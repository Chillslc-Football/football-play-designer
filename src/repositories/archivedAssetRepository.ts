import { supabase } from '../lib/supabaseClient'
import type { ArchivedFormation, ArchivedPlay } from '../types/archivedAsset'
import { isFormatCompatible } from '../utils/archivedAssetUtils'
import { normalizeTeamFormat, type TeamFormat } from '../types/teamFormat'

const ARCHIVED_PLAY_COLUMNS =
  'id, archive_id, original_id, original_team_id, original_team_name, team_format, archived_at, name, play_type'

const ARCHIVED_FORMATION_COLUMNS =
  'id, archive_id, original_id, original_team_id, original_team_name, team_format, archived_at, name'

type ArchivedPlayRow = {
  id: string
  archive_id: string
  original_id: string
  original_team_id: string
  original_team_name: string
  team_format: string
  archived_at: string
  name: string
  play_type: string
}

type ArchivedFormationRow = {
  id: string
  archive_id: string
  original_id: string
  original_team_id: string
  original_team_name: string
  team_format: string
  archived_at: string
  name: string
}

function logArchivedAssetError(context: string, error: { message: string; code?: string }): void {
  console.error(`[archivedAssetRepository] ${context}`, error)
}

function rowToArchivedPlay(row: ArchivedPlayRow): ArchivedPlay {
  return {
    id: row.id,
    archiveId: row.archive_id,
    originalId: row.original_id,
    originalTeamId: row.original_team_id,
    originalTeamName: row.original_team_name,
    teamFormat: normalizeTeamFormat(row.team_format),
    archivedAt: row.archived_at,
    name: row.name,
    playType: row.play_type,
  }
}

function rowToArchivedFormation(row: ArchivedFormationRow): ArchivedFormation {
  return {
    id: row.id,
    archiveId: row.archive_id,
    originalId: row.original_id,
    originalTeamId: row.original_team_id,
    originalTeamName: row.original_team_name,
    teamFormat: normalizeTeamFormat(row.team_format),
    archivedAt: row.archived_at,
    name: row.name,
  }
}

export async function getArchivedPlays(): Promise<ArchivedPlay[]> {
  const { data, error } = await supabase
    .from('archived_plays')
    .select(ARCHIVED_PLAY_COLUMNS)
    .order('archived_at', { ascending: false })
    .order('name', { ascending: true })

  if (error) {
    logArchivedAssetError('getArchivedPlays', error)
    throw new Error(`Failed to load archived plays: ${error.message}`)
  }

  return ((data ?? []) as ArchivedPlayRow[]).map(rowToArchivedPlay)
}

export async function getArchivedFormations(): Promise<ArchivedFormation[]> {
  const { data, error } = await supabase
    .from('archived_custom_formations')
    .select(ARCHIVED_FORMATION_COLUMNS)
    .order('archived_at', { ascending: false })
    .order('name', { ascending: true })

  if (error) {
    logArchivedAssetError('getArchivedFormations', error)
    throw new Error(`Failed to load archived formations: ${error.message}`)
  }

  return ((data ?? []) as ArchivedFormationRow[]).map(rowToArchivedFormation)
}

export function filterCompatibleArchivedPlays(
  plays: ArchivedPlay[],
  teamFormat: TeamFormat,
): ArchivedPlay[] {
  return plays.filter((play) => isFormatCompatible(play.teamFormat, teamFormat))
}

export function filterCompatibleArchivedFormations(
  formations: ArchivedFormation[],
  teamFormat: TeamFormat,
): ArchivedFormation[] {
  return formations.filter((formation) => isFormatCompatible(formation.teamFormat, teamFormat))
}

export type ArchivedAssetImportDiagnostics = {
  archivedPlaysCount: number
  archivedFormationsCount: number
  compatiblePlaysCount: number
  compatibleFormationsCount: number
  shouldShowWizard: boolean
}

export async function getArchivedAssetImportDiagnostics(
  teamFormat: TeamFormat,
): Promise<ArchivedAssetImportDiagnostics> {
  const [plays, formations] = await Promise.all([
    getArchivedPlays(),
    getArchivedFormations(),
  ])

  const compatiblePlaysCount = filterCompatibleArchivedPlays(plays, teamFormat).length
  const compatibleFormationsCount = filterCompatibleArchivedFormations(formations, teamFormat).length

  return {
    archivedPlaysCount: plays.length,
    archivedFormationsCount: formations.length,
    compatiblePlaysCount,
    compatibleFormationsCount,
    shouldShowWizard: compatiblePlaysCount > 0 || compatibleFormationsCount > 0,
  }
}

export async function countCompatibleArchivedAssets(
  teamFormat: TeamFormat,
): Promise<{ plays: number; formations: number }> {
  const diagnostics = await getArchivedAssetImportDiagnostics(teamFormat)
  return {
    plays: diagnostics.compatiblePlaysCount,
    formations: diagnostics.compatibleFormationsCount,
  }
}

export async function hasCompatibleArchivedAssets(teamFormat: TeamFormat): Promise<boolean> {
  const diagnostics = await getArchivedAssetImportDiagnostics(teamFormat)
  return diagnostics.shouldShowWizard
}

export async function importArchivedPlays(
  archivedPlayIds: string[],
  targetTeamId: string,
): Promise<number> {
  if (archivedPlayIds.length === 0) return 0

  const { data, error } = await supabase.rpc('import_archived_plays', {
    p_archived_play_ids: archivedPlayIds,
    p_target_team_id: targetTeamId,
  })

  if (error) {
    logArchivedAssetError('importArchivedPlays', error)
    throw new Error(error.message)
  }

  return typeof data === 'number' ? data : 0
}

export async function importArchivedFormations(
  archivedFormationIds: string[],
  targetTeamId: string,
): Promise<number> {
  if (archivedFormationIds.length === 0) return 0

  const { data, error } = await supabase.rpc('import_archived_formations', {
    p_archived_formation_ids: archivedFormationIds,
    p_target_team_id: targetTeamId,
  })

  if (error) {
    logArchivedAssetError('importArchivedFormations', error)
    throw new Error(error.message)
  }

  return typeof data === 'number' ? data : 0
}

export async function deleteArchivedPlays(archivedPlayIds: string[]): Promise<number> {
  if (archivedPlayIds.length === 0) return 0

  const { data, error } = await supabase.rpc('delete_archived_plays', {
    p_archived_play_ids: archivedPlayIds,
  })

  if (error) {
    logArchivedAssetError('deleteArchivedPlays', error)
    throw new Error(error.message)
  }

  return typeof data === 'number' ? data : 0
}

export async function deleteArchivedFormations(archivedFormationIds: string[]): Promise<number> {
  if (archivedFormationIds.length === 0) return 0

  const { data, error } = await supabase.rpc('delete_archived_formations', {
    p_archived_formation_ids: archivedFormationIds,
  })

  if (error) {
    logArchivedAssetError('deleteArchivedFormations', error)
    throw new Error(error.message)
  }

  return typeof data === 'number' ? data : 0
}
