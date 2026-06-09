import {
  BUILTIN_FORMATIONS,
  DEFAULT_FORMATION_ID,
  type FormationDefinition,
} from '../data/builtinFormations'
import type { Player, PlayerLabel, Position } from '../types/player'
import type { CustomFormation } from './formationStorage'

/** Play filter value that shows every saved play. */
export const ALL_PLAYS_FILTER = 'all'

export type PlayFilterId = typeof ALL_PLAYS_FILTER | string

/** Builds player objects from a position map. */
export function playersFromPositions(
  positions: Record<PlayerLabel, Position>,
): Player[] {
  const labels = Object.keys(positions) as PlayerLabel[]
  return labels.map((label) => ({
    id: label,
    label,
    position: positions[label],
  }))
}

export function playersFromFormation(formation: FormationDefinition): Player[] {
  return playersFromPositions(formation.positions)
}

/** Converts current on-field players into a formation position map. */
export function positionsFromPlayers(players: Player[]): Record<PlayerLabel, Position> {
  return Object.fromEntries(players.map((p) => [p.id, p.position])) as Record<
    PlayerLabel,
    Position
  >
}

/** Finds a built-in or custom formation by id. */
export function getFormationById(
  id: string,
  customFormations: CustomFormation[],
): FormationDefinition | null {
  const builtin = BUILTIN_FORMATIONS.find((f) => f.id === id)
  if (builtin) return builtin

  const custom = customFormations.find((f) => f.id === id)
  if (!custom) return null

  return {
    id: custom.id,
    label: custom.label,
    positions: custom.positions,
    isBuiltin: false,
  }
}

/** Creates players for any formation id (built-in or custom). */
export function createPlayersForFormation(
  formationId: string,
  customFormations: CustomFormation[],
): Player[] {
  const formation = getFormationById(formationId, customFormations)
  if (!formation) {
    return playersFromFormation(BUILTIN_FORMATIONS[0])
  }
  return playersFromFormation(formation)
}

/** Current label for a formation id, or null if custom formation was deleted. */
export function getFormationLabel(
  formationId: string,
  customFormations: CustomFormation[],
): string | null {
  return getFormationById(formationId, customFormations)?.label ?? null
}

/**
 * Display name for a play's formation.
 * If a custom formation was deleted, keep the saved formationName text.
 */
export function resolveFormationDisplayName(
  formationId: string,
  savedFormationName: string,
  customFormations: CustomFormation[],
): string {
  const liveLabel = getFormationLabel(formationId, customFormations)
  if (liveLabel) return liveLabel

  if (formationId.startsWith('custom-')) {
    return savedFormationName ? `${savedFormationName} (Deleted Formation)` : 'Deleted Formation'
  }

  return savedFormationName || 'Unknown Formation'
}

/** True if the name matches a built-in or custom formation (case-insensitive). */
export function isFormationNameTaken(
  name: string,
  customFormations: CustomFormation[],
): boolean {
  const normalized = name.trim().toLowerCase()
  if (!normalized) return true

  const builtinMatch = BUILTIN_FORMATIONS.some(
    (f) => f.label.toLowerCase() === normalized,
  )
  const customMatch = customFormations.some(
    (f) => f.label.toLowerCase() === normalized,
  )

  return builtinMatch || customMatch
}

/** All formations for dropdowns: built-in first, then custom. */
export function getAllFormations(
  customFormations: CustomFormation[],
): FormationDefinition[] {
  const customAsDefinitions: FormationDefinition[] = customFormations.map((f) => ({
    id: f.id,
    label: f.label,
    positions: f.positions,
    isBuiltin: false,
  }))
  return [...BUILTIN_FORMATIONS, ...customAsDefinitions]
}

/** Options for the Play Filter dropdown. */
export function getPlayFilterOptions(
  customFormations: CustomFormation[],
): { id: PlayFilterId; label: string }[] {
  return [
    { id: ALL_PLAYS_FILTER, label: 'All Plays' },
    ...BUILTIN_FORMATIONS.map((f) => ({ id: f.id, label: f.label })),
    ...customFormations.map((f) => ({ id: f.id, label: f.label })),
  ]
}

/** Filters saved plays by formation id. */
export function filterPlaysByFormation<T extends { formationId: string }>(
  plays: T[],
  filterId: PlayFilterId,
): T[] {
  if (filterId === ALL_PLAYS_FILTER) return plays
  return plays.filter((play) => play.formationId === filterId)
}

export function isBuiltinFormationId(formationId: string): boolean {
  return BUILTIN_FORMATIONS.some((formation) => formation.id === formationId)
}

export function isCustomFormationId(
  formationId: string,
  customFormations: CustomFormation[] = [],
): boolean {
  if (isBuiltinFormationId(formationId)) return false
  if (customFormations.some((formation) => formation.id === formationId)) return true
  return formationId.startsWith('custom-')
}

/** Snapshot formationId + formationName onto a play before saving. */
export function withFormationSnapshot(
  play: {
    formationId: string
    formationName: string
    [key: string]: unknown
  },
  customFormations: CustomFormation[],
): { formationId: string; formationName: string } {
  const label = getFormationLabel(play.formationId, customFormations)
  return {
    formationId: play.formationId,
    formationName: label ?? play.formationName,
  }
}

export function getDefaultFormationName(): string {
  return BUILTIN_FORMATIONS.find((f) => f.id === DEFAULT_FORMATION_ID)?.label ?? 'I Formation'
}
