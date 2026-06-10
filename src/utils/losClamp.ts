import { LOS_VIEW_Y } from '../constants/field'
import type { PlayerLabel, Position } from '../types/player'
import type { Play } from '../types/play'
import { clampViewPosition } from './fieldView'

/** Maximum offensive players allowed behind the line of scrimmage. */
export const MAX_BACKFIELD_PLAYERS = 5

type PlayerLike = { id: PlayerLabel; position: Position }

/** True when the player is behind the LOS (not on the line). */
export function isInBackfield(position: Position): boolean {
  return position.y > LOS_VIEW_Y + 0.01
}

export function countBackfieldPlayers(players: Pick<PlayerLike, 'position'>[]): number {
  return players.filter((player) => isInBackfield(player.position)).length
}

export function backfieldCountAfterMove(
  players: PlayerLike[],
  playerId: PlayerLabel,
  proposedPosition: Position,
): number {
  let count = 0
  for (const player of players) {
    const position = player.id === playerId ? proposedPosition : player.position
    if (isInBackfield(position)) {
      count++
    }
  }
  return count
}

export function isBackfieldPlacementAllowed(
  players: PlayerLike[],
  playerId: PlayerLabel,
  proposedPosition: Position,
): boolean {
  return backfieldCountAfterMove(players, playerId, proposedPosition) <= MAX_BACKFIELD_PLAYERS
}

/** Offense stays on or behind the line of scrimmage (south side, higher y). */
export function clampOffensePosition(position: Position): Position {
  const clamped = clampViewPosition(position)
  return { x: clamped.x, y: Math.max(LOS_VIEW_Y, clamped.y) }
}

/**
 * Clamps offense position and enforces the backfield player limit.
 * Blocks entering the backfield when full; keeps on LOS at the same x.
 * Keeps the prior spot when a move would increase an already-illegal backfield count.
 */
export function resolveOffensePlayerPosition(
  players: PlayerLike[],
  playerId: PlayerLabel,
  position: Position,
): Position {
  const clamped = clampOffensePosition(position)

  if (isBackfieldPlacementAllowed(players, playerId, clamped)) {
    return clamped
  }

  const current = players.find((player) => player.id === playerId)
  if (current && isInBackfield(current.position) && isInBackfield(clamped)) {
    return current.position
  }

  return { x: clamped.x, y: LOS_VIEW_Y }
}

export function isBackfieldLimitExceeded(players: Pick<PlayerLike, 'position'>[]): boolean {
  return countBackfieldPlayers(players) > MAX_BACKFIELD_PLAYERS
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
