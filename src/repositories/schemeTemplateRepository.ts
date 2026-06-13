import { supabase } from '../lib/supabaseClient'
import type { DefenderLabel } from '../types/defender'
import type { PlayerLabel, Position } from '../types/player'
import type {
  DefensiveFrontTemplateInput,
  DefensiveFrontTemplateRecord,
  FormationTemplateInput,
  FormationTemplateRecord,
} from '../types/schemeTemplate'
import { migrateFormationPositions } from '../utils/fieldView'

type FormationTemplateRow = {
  id: string
  slug: string
  label: string
  positions: Record<PlayerLabel, Position>
  position_labels?: Partial<Record<PlayerLabel, string>> | null
  is_default: boolean
  created_by?: string | null
  created_at?: string
  updated_at?: string
}

type DefensiveFrontTemplateRow = {
  id: string
  slug: string
  label: string
  positions: Record<DefenderLabel, Position>
  is_default: boolean
  created_by?: string | null
  created_at?: string
  updated_at?: string
}

function logTemplateError(context: string, error: { message: string; code?: string }): void {
  console.error(`[schemeTemplateRepository] ${context}`, error)
}

function rowToFormationTemplate(row: FormationTemplateRow): FormationTemplateRecord {
  return {
    id: row.id,
    slug: row.slug,
    label: row.label,
    positions: migrateFormationPositions(row.positions) as Record<PlayerLabel, Position>,
    positionLabels: row.position_labels ?? undefined,
    isDefault: row.is_default,
    isManaged: true,
  }
}

function rowToFrontTemplate(row: DefensiveFrontTemplateRow): DefensiveFrontTemplateRecord {
  return {
    id: row.id,
    slug: row.slug,
    label: row.label,
    positions: row.positions,
    isDefault: row.is_default,
    isManaged: true,
  }
}

export async function loadGlobalSchemeTemplates(): Promise<{
  formationTemplates: FormationTemplateRecord[]
  frontTemplates: DefensiveFrontTemplateRecord[]
}> {
  const [formationResult, frontResult] = await Promise.all([
    supabase
      .from('formation_templates')
      .select('id, slug, label, positions, position_labels, is_default, created_by, created_at, updated_at')
      .order('label', { ascending: true }),
    supabase
      .from('defensive_front_templates')
      .select('id, slug, label, positions, is_default, created_by, created_at, updated_at')
      .order('label', { ascending: true }),
  ])

  if (formationResult.error) {
    logTemplateError('loadGlobalSchemeTemplates/formations', formationResult.error)
    throw new Error(`Failed to load formation templates: ${formationResult.error.message}`)
  }

  if (frontResult.error) {
    logTemplateError('loadGlobalSchemeTemplates/fronts', frontResult.error)
    throw new Error(`Failed to load defensive front templates: ${frontResult.error.message}`)
  }

  return {
    formationTemplates: ((formationResult.data ?? []) as FormationTemplateRow[]).map(
      rowToFormationTemplate,
    ),
    frontTemplates: ((frontResult.data ?? []) as DefensiveFrontTemplateRow[]).map(
      rowToFrontTemplate,
    ),
  }
}

export async function createFormationTemplate(
  input: FormationTemplateInput,
  userId?: string,
): Promise<FormationTemplateRecord> {
  const { data, error } = await supabase
    .from('formation_templates')
    .insert({
      slug: input.slug,
      label: input.label,
      positions: input.positions,
      position_labels: input.positionLabels ?? null,
      ...(userId ? { created_by: userId } : {}),
    })
    .select('id, slug, label, positions, position_labels, is_default, created_by, created_at, updated_at')
    .single()

  if (error) {
    logTemplateError('createFormationTemplate', error)
    throw new Error(`Failed to create formation template: ${error.message}`)
  }

  return rowToFormationTemplate(data as FormationTemplateRow)
}

export async function updateFormationTemplate(
  id: string,
  input: FormationTemplateInput,
): Promise<FormationTemplateRecord> {
  const { data, error } = await supabase
    .from('formation_templates')
    .update({
      slug: input.slug,
      label: input.label,
      positions: input.positions,
      position_labels: input.positionLabels ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id, slug, label, positions, position_labels, is_default, created_by, created_at, updated_at')
    .single()

  if (error) {
    logTemplateError('updateFormationTemplate', error)
    throw new Error(`Failed to update formation template: ${error.message}`)
  }

  return rowToFormationTemplate(data as FormationTemplateRow)
}

export async function deleteFormationTemplate(id: string): Promise<void> {
  const { error } = await supabase.from('formation_templates').delete().eq('id', id)

  if (error) {
    logTemplateError('deleteFormationTemplate', error)
    throw new Error(`Failed to delete formation template: ${error.message}`)
  }
}

export async function setDefaultFormationTemplate(id: string): Promise<void> {
  const { error } = await supabase.rpc('set_default_formation_template', {
    p_template_id: id,
  })

  if (error) {
    logTemplateError('setDefaultFormationTemplate', error)
    throw new Error(`Failed to set default formation template: ${error.message}`)
  }
}

export async function createDefensiveFrontTemplate(
  input: DefensiveFrontTemplateInput,
  userId?: string,
): Promise<DefensiveFrontTemplateRecord> {
  const { data, error } = await supabase
    .from('defensive_front_templates')
    .insert({
      slug: input.slug,
      label: input.label,
      positions: input.positions,
      ...(userId ? { created_by: userId } : {}),
    })
    .select('id, slug, label, positions, is_default, created_by, created_at, updated_at')
    .single()

  if (error) {
    logTemplateError('createDefensiveFrontTemplate', error)
    throw new Error(`Failed to create defensive front template: ${error.message}`)
  }

  return rowToFrontTemplate(data as DefensiveFrontTemplateRow)
}

export async function updateDefensiveFrontTemplate(
  id: string,
  input: DefensiveFrontTemplateInput,
): Promise<DefensiveFrontTemplateRecord> {
  const { data, error } = await supabase
    .from('defensive_front_templates')
    .update({
      slug: input.slug,
      label: input.label,
      positions: input.positions,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id, slug, label, positions, is_default, created_by, created_at, updated_at')
    .single()

  if (error) {
    logTemplateError('updateDefensiveFrontTemplate', error)
    throw new Error(`Failed to update defensive front template: ${error.message}`)
  }

  return rowToFrontTemplate(data as DefensiveFrontTemplateRow)
}

export async function deleteDefensiveFrontTemplate(id: string): Promise<void> {
  const { error } = await supabase.from('defensive_front_templates').delete().eq('id', id)

  if (error) {
    logTemplateError('deleteDefensiveFrontTemplate', error)
    throw new Error(`Failed to delete defensive front template: ${error.message}`)
  }
}

export async function setDefaultDefensiveFrontTemplate(id: string): Promise<void> {
  const { error } = await supabase.rpc('set_default_defensive_front_template', {
    p_template_id: id,
  })

  if (error) {
    logTemplateError('setDefaultDefensiveFrontTemplate', error)
    throw new Error(`Failed to set default defensive front template: ${error.message}`)
  }
}

export function slugifyTemplateLabel(label: string): string {
  const normalized = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return normalized || `template-${crypto.randomUUID().slice(0, 8)}`
}
