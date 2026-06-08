import type { Defender, DefenderLabel } from '../types/defender'
import type { DefenderRoute } from '../types/defenderRoute'
import type { Player, Position } from '../types/player'
import { getCenterPlayerX, mirrorPositionLaterally } from './mirror'

const DEFENSE_MIRROR_PARTNER: Record<DefenderLabel, DefenderLabel> = {
  LE: 'RE',
  RE: 'LE',
  DT1: 'DT2',
  DT2: 'DT1',
  LOLB: 'ROLB',
  ROLB: 'LOLB',
  MLB: 'MLB',
  CB1: 'CB2',
  CB2: 'CB1',
  FS: 'SS',
  SS: 'FS',
}

function isSwapPair(label: DefenderLabel): boolean {
  return DEFENSE_MIRROR_PARTNER[label] !== label
}

function swapPairedDefenderPositions(
  positions: Record<DefenderLabel, Position>,
): Record<DefenderLabel, Position> {
  const result = { ...positions }
  const handled = new Set<DefenderLabel>()

  for (const label of Object.keys(positions) as DefenderLabel[]) {
    if (!isSwapPair(label) || handled.has(label)) continue

    const partner = DEFENSE_MIRROR_PARTNER[label]
    const temp = result[label]
    result[label] = result[partner]
    result[partner] = temp
    handled.add(label)
    handled.add(partner)
  }

  return result
}

export function getDefenderMirrorPartner(label: DefenderLabel): DefenderLabel {
  return DEFENSE_MIRROR_PARTNER[label]
}

export function mirrorDefenderRoutes(
  defenderRoutes: DefenderRoute[],
  centerX: number,
): DefenderRoute[] {
  return defenderRoutes.map((route) => ({
    ...route,
    defenderId: getDefenderMirrorPartner(route.defenderId),
    points: route.points.map((point) => mirrorPositionLaterally(point, centerX)),
  }))
}

export function mirrorDefenders(defenders: Defender[], players: Player[]): Defender[] {
  const centerX = getCenterPlayerX(players)

  const mirroredPositions = Object.fromEntries(
    defenders.map((defender) => [
      defender.id,
      mirrorPositionLaterally(defender.position, centerX),
    ]),
  ) as Record<DefenderLabel, Position>

  const finalPositions = swapPairedDefenderPositions(mirroredPositions)

  return defenders.map((defender) => ({
    ...defender,
    position: finalPositions[defender.id],
  }))
}
