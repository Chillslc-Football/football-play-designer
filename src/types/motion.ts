import type { PlayerLabel, Position } from './player'

export type MotionType = 'jog' | 'sprint'

/** A pre-snap motion path drawn for one player — separate from routes and blocks. */
export type Motion = {
  playerId: PlayerLabel
  motionType: MotionType
  points: Position[]
}

export function createEmptyMotions(): Motion[] {
  return []
}
