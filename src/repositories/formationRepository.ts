import { supabase } from '../lib/supabaseClient'
import type { PlayerLabel, Position } from '../types/player'
import type { CustomFormation } from '../utils/formationStorage'
import { migrateFormationPositions } from '../utils/fieldView'

type FormationRow = {
  id: string
  team_id: string
  name: string
  data: CustomFormation
  created_by?: string | null
  updated_by?: string | null
  created_at?: string
  updated_at?: string
}

function logFormationError(context: string, error: { message: string; code?: string }): void {
  console.error(`[formationRepository] ${context}`, error)
}

function isPersistedFormationId(id: string): boolean {
  return !id.startsWith('custom-')
}

function resolveFormationId(formation: CustomFormation): string {
  return isPersistedFormationId(formation.id) ? formation.id : crypto.randomUUID()
}

function formationToData(formation: CustomFormation, id: string): CustomFormation {
  return {
    id,
    label: formation.label,
    positions: formation.positions,
    ...(formation.positionLabels ? { positionLabels: formation.positionLabels } : {}),
  }
}

function rowToFormation(row: FormationRow): CustomFormation {
  const stored = row.data ?? ({} as CustomFormation)
  const label = row.name ?? stored.label ?? 'Custom Formation'
  const rawPositions = stored.positions ?? {}

  return {
    id: row.id,
    label,
    positions: migrateFormationPositions(rawPositions) as Record<PlayerLabel, Position>,
    positionLabels: stored.positionLabels,
  }
}

function formationToInsertRow(formation: CustomFormation, teamId: string, userId?: string) {
  const id = resolveFormationId(formation)
  const data = formationToData(formation, id)

  return {
    id,
    team_id: teamId,
    name: formation.label,
    data,
    ...(userId ? { created_by: userId, updated_by: userId } : {}),
  }
}

function formationToUpdateRow(formation: CustomFormation, userId?: string) {
  const data = formationToData(formation, formation.id)

  return {
    name: formation.label,
    data,
    ...(userId ? { updated_by: userId } : {}),
  }
}

export async function getFormationsByTeam(teamId: string): Promise<CustomFormation[]> {
  const { data, error } = await supabase
    .from('custom_formations')
    .select('id, team_id, name, data, created_by, updated_by, created_at, updated_at')
    .eq('team_id', teamId)
    .order('name', { ascending: true })

  if (error) {
    logFormationError('getFormationsByTeam', error)
    throw new Error(`Failed to load custom formations: ${error.message}`)
  }

  return ((data ?? []) as FormationRow[]).map(rowToFormation)
}

export async function addFormation(
  teamId: string,
  formation: CustomFormation,
  userId?: string,
): Promise<CustomFormation> {
  const row = formationToInsertRow(formation, teamId, userId)
  const { data, error } = await supabase
    .from('custom_formations')
    .insert(row)
    .select('id, team_id, name, data, created_by, updated_by, created_at, updated_at')
    .single()

  if (error) {
    logFormationError('addFormation', error)
    throw new Error(`Failed to save formation: ${error.message}`)
  }

  return rowToFormation(data as FormationRow)
}

export async function updateFormation(
  teamId: string,
  formation: CustomFormation,
  userId?: string,
): Promise<CustomFormation> {
  const row = formationToUpdateRow(formation, userId)
  const { data, error } = await supabase
    .from('custom_formations')
    .update(row)
    .eq('team_id', teamId)
    .eq('id', formation.id)
    .select('id, team_id, name, data, created_by, updated_by, created_at, updated_at')
    .single()

  if (error) {
    logFormationError('updateFormation', error)
    throw new Error(`Failed to update formation: ${error.message}`)
  }

  return rowToFormation(data as FormationRow)
}

export async function saveFormation(
  teamId: string,
  formation: CustomFormation,
  userId?: string,
): Promise<CustomFormation> {
  if (isPersistedFormationId(formation.id)) {
    return updateFormation(teamId, formation, userId)
  }
  return addFormation(teamId, formation, userId)
}

export async function deleteFormation(teamId: string, formationId: string): Promise<void> {
  const { error } = await supabase
    .from('custom_formations')
    .delete()
    .eq('team_id', teamId)
    .eq('id', formationId)

  if (error) {
    logFormationError('deleteFormation', error)
    throw new Error(`Failed to delete formation: ${error.message}`)
  }
}
