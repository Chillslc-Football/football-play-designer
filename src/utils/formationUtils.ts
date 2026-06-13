import {
  BUILTIN_FORMATIONS,
  DEFAULT_FORMATION_ID,
  type FormationDefinition,
} from '../data/builtinFormations'
import {
  getDefaultFormationTemplateId,
  getResolvedFormationTemplates,
} from './schemeTemplateStore'
import {
  normalizePositionLabel,
  resolvePlayerDisplayLabel,
  type Player,
  type PlayerLabel,
  type Position,
} from '../types/player'
import type { CustomFormation } from './formationStorage'

/** Play filter value that shows every saved play. */
export const ALL_PLAYS_FILTER = 'all'

export type PlayFilterId = typeof ALL_PLAYS_FILTER | string

/** Display label for a formation slot; uses stored custom label when present. */
export function labelForFormationSlot(
  id: PlayerLabel,
  positionLabels?: Partial<Record<PlayerLabel, string>>,
): string {
  if (positionLabels && Object.prototype.hasOwnProperty.call(positionLabels, id)) {
    return resolvePlayerDisplayLabel(id, positionLabels[id])
  }
  return id
}

/** Builds player objects from a position map and optional custom labels. */
export function playersFromPositions(
  positions: Record<PlayerLabel, Position>,
  positionLabels?: Partial<Record<PlayerLabel, string>>,
): Player[] {
  const slotIds = Object.keys(positions) as PlayerLabel[]
  return slotIds.map((id) => ({
    id,
    label: labelForFormationSlot(id, positionLabels),
    position: positions[id],
  }))
}

/** Extracts per-slot labels from on-field players for formation save. */
export function positionLabelsFromPlayers(players: Player[]): Partial<Record<PlayerLabel, string>> {
  return Object.fromEntries(
    players.map((player) => [
      player.id,
      player.label === undefined || player.label === null
        ? player.id
        : normalizePositionLabel(player.label),
    ]),
  ) as Partial<Record<PlayerLabel, string>>
}

export function playersFromFormation(formation: FormationDefinition): Player[] {
  return playersFromPositions(formation.positions, formation.positionLabels)
}

/** Converts current on-field players into a formation position map. */
export function positionsFromPlayers(players: Player[]): Record<PlayerLabel, Position> {
  return Object.fromEntries(players.map((p) => [p.id, p.position])) as Record<
    PlayerLabel,
    Position
  >
}

/** Finds a global or custom formation by id. */
export function getFormationById(
  id: string,
  customFormations: CustomFormation[],
): FormationDefinition | null {
  const global = getResolvedFormationTemplates().find((formation) => formation.id === id)
  if (global) return global

  const custom = customFormations.find((f) => f.id === id)
  if (!custom) return null

  return {
    id: custom.id,
    label: custom.label,
    positions: custom.positions,
    positionLabels: custom.positionLabels,
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
    const fallback = getFormationById(getDefaultFormationTemplateId(), customFormations)
    return playersFromFormation(fallback ?? BUILTIN_FORMATIONS[0])
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

  const builtinMatch = getResolvedFormationTemplates().some(
    (formation) => formation.label.toLowerCase() === normalized,
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
    positionLabels: f.positionLabels,
    positions: f.positions,
    isBuiltin: false,
  }))
  return [...getResolvedFormationTemplates(), ...customAsDefinitions]
}

/** Options for the Play Filter dropdown. */
export function getPlayFilterOptions(
  customFormations: CustomFormation[],
): { id: PlayFilterId; label: string }[] {
  return [
    { id: ALL_PLAYS_FILTER, label: 'All Plays' },
    ...getResolvedFormationTemplates().map((formation) => ({
      id: formation.id,
      label: formation.label,
    })),
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
  return getResolvedFormationTemplates().some((formation) => formation.id === formationId)
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
  return (
    getResolvedFormationTemplates().find((formation) => formation.id === getDefaultFormationTemplateId())
      ?.label ?? BUILTIN_FORMATIONS.find((f) => f.id === DEFAULT_FORMATION_ID)?.label ?? 'I Formation'
  )
}
