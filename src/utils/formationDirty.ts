import type { Player, PlayerLabel, Position } from '../types/player'
import type { CustomFormation } from './formationStorage'
import {
  isCustomFormationId,
  labelForFormationSlot,
  positionsFromPlayers,
} from './formationUtils'
import { normalizePositionLabel } from '../types/player'
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

  if (positionsComparable(currentPositions) !== positionsComparable(formation.positions)) {
    return true
  }

  const slotIds = Object.keys(formation.positions).sort() as PlayerLabel[]
  const storedLabels = Object.fromEntries(
    slotIds.map((id) => [id, labelForFormationSlot(id, formation.positionLabels)]),
  )
  const currentLabels = Object.fromEntries(
    slotIds.map((id) => {
      const player = players.find((entry) => entry.id === id)
      const raw = player?.label ?? id
      return [id, raw === '' ? '' : normalizePositionLabel(raw)]
    }),
  )

  return JSON.stringify(storedLabels) !== JSON.stringify(currentLabels)
}
