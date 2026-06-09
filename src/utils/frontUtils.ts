import {
  BUILTIN_FRONTS,
  DEFAULT_FRONT_ID,
  defendersFromFront,
  type FrontDefinition,
} from '../data/builtinFronts'
import { ALL_PLAYS_FILTER, type PlayFilterId } from './formationUtils'

export function getFrontById(id: string): FrontDefinition | null {
  return BUILTIN_FRONTS.find((front) => front.id === id) ?? null
}

export function createDefendersForFront(frontId: string) {
  const front = getFrontById(frontId) ?? getFrontById(DEFAULT_FRONT_ID)
  if (!front) return defendersFromFront(BUILTIN_FRONTS[0])
  return defendersFromFront(front)
}

export function getDefaultFrontName(): string {
  return BUILTIN_FRONTS.find((front) => front.id === DEFAULT_FRONT_ID)?.label ?? '4-3'
}

export function getFrontLabel(frontId: string): string | null {
  return getFrontById(frontId)?.label ?? null
}

export function resolveFrontDisplayName(frontId: string, savedFrontName: string): string {
  const liveLabel = getFrontLabel(frontId)
  if (liveLabel) return liveLabel
  return savedFrontName || 'Unknown Front'
}

/** Options for the Front Filter dropdown in defensive mode. */
export function getFrontFilterOptions(): { id: PlayFilterId; label: string }[] {
  return [
    { id: ALL_PLAYS_FILTER, label: 'All Plays' },
    ...BUILTIN_FRONTS.map((front) => ({ id: front.id, label: front.label })),
  ]
}

/** Filters saved defensive plays by front id. */
export function filterPlaysByFront<T extends { frontId: string }>(
  plays: T[],
  filterId: PlayFilterId,
): T[] {
  if (filterId === ALL_PLAYS_FILTER) return plays
  return plays.filter((play) => play.frontId === filterId)
}

/** Snapshot frontId + frontName onto a play before saving. */
export function withFrontSnapshot(play: {
  frontId: string
  frontName: string
  [key: string]: unknown
}): { frontId: string; frontName: string } {
  const label = getFrontLabel(play.frontId)
  return {
    frontId: play.frontId,
    frontName: label ?? play.frontName,
  }
}
