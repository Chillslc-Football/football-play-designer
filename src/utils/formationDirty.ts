import type { Player, PlayerLabel, Position } from '../types/player'
import type { CustomFormation } from './formationStorage'
import { isCustomFormationId, positionsFromPlayers } from './formationUtils'
import { clampOffensePosition } from './losClamp'

function positionsComparable(positions: Record<PlayerLabel, Position>): string {
  const sortedKeys = Object.keys(positions).sort() as PlayerLabel[]
  const sorted = Object.fromEntries(sortedKeys.map((key) => [key, positions[key]]))
  return JSON.stringify(sorted)
}

/** True when on a custom formation whose stored positions differ from current player layout. */
export function hasFormationPositionChanges(
  formationId: string,
  players: Player[],
  customFormations: CustomFormation[],
): boolean {
  if (!isCustomFormationId(formationId, customFormations)) return false

  const formation = customFormations.find((entry) => entry.id === formationId)
  if (!formation) return false

  const currentPositions = positionsFromPlayers(
    players.map((player) => ({
      ...player,
      position: clampOffensePosition(player.position),
    })),
  )

  return positionsComparable(currentPositions) !== positionsComparable(formation.positions)
}
