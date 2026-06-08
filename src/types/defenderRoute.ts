import type { Position } from './player'
import type { DefenderLabel } from './defender'

/** A movement/assignment drawn for one defender — same shape as offensive routes. */
export type DefenderRoute = {
  defenderId: DefenderLabel
  points: Position[]
}

export function createEmptyDefenderRoutes(): DefenderRoute[] {
  return []
}
