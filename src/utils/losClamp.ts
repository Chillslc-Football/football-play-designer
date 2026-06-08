import { LOS_VIEW_Y } from '../constants/field'
import type { Position } from '../types/player'
import type { Play } from '../types/play'
import { clampViewPosition } from './fieldView'

/** Offense stays on or behind the line of scrimmage (south side, higher y). */
export function clampOffensePosition(position: Position): Position {
  const clamped = clampViewPosition(position)
  return { x: clamped.x, y: Math.max(LOS_VIEW_Y, clamped.y) }
}

/** Defense stays on or in front of the line of scrimmage (north side, lower y). */
export function clampDefensePosition(position: Position): Position {
  const clamped = clampViewPosition(position)
  return { x: clamped.x, y: Math.min(LOS_VIEW_Y, clamped.y) }
}

/** Ensures every player and defender respects their side of the ball. */
export function clampPlayPositions(play: Play): Play {
  return {
    ...play,
    players: play.players.map((player) => ({
      ...player,
      position: clampOffensePosition(player.position),
    })),
    defenders: play.defenders.map((defender) => ({
      ...defender,
      position: clampDefensePosition(defender.position),
    })),
  }
}
