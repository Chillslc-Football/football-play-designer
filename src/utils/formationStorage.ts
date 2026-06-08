import type { PlayerLabel, Position } from '../types/player'

/**
 * Custom formations are stored here in localStorage.
 * Built-in formations stay in src/data/builtinFormations.ts.
 */
export const CUSTOM_FORMATIONS_KEY = 'football-play-designer-custom-formations'

export type CustomFormation = {
  id: string
  label: string
  positions: Record<PlayerLabel, Position>
}

export function getCustomFormations(): CustomFormation[] {
  const raw = localStorage.getItem(CUSTOM_FORMATIONS_KEY)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw) as CustomFormation[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeCustomFormations(formations: CustomFormation[]): void {
  localStorage.setItem(CUSTOM_FORMATIONS_KEY, JSON.stringify(formations))
}

/** Adds a new custom formation. Caller must check for duplicate names first. */
export function addCustomFormation(formation: CustomFormation): void {
  const formations = getCustomFormations()
  formations.push(formation)
  writeCustomFormations(formations)
}

/** Removes one custom formation by id. Saved plays are not deleted. */
export function deleteCustomFormation(formationId: string): void {
  const formations = getCustomFormations().filter((f) => f.id !== formationId)
  writeCustomFormations(formations)
}

export function createCustomFormationId(): string {
  return `custom-${crypto.randomUUID()}`
}
