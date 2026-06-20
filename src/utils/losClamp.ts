import { LOS_VIEW_Y, PLAYBOOK_MARKER_RADIUS_Y } from '../constants/field'
import type { PlayerLabel, Position } from '../types/player'
import type { Play } from '../types/play'
import { clampViewPosition } from './fieldView'

/** Minimum gap (yards) between the LOS and the visible player icon edge — 1 field unit = 1 yard. */
export const LOS_PLAYER_BUFFER_YARDS = 0.95

/**
 * Southernmost y offense center may occupy.
 * Icon north edge stays LOS_PLAYER_BUFFER_YARDS south of the LOS.
 */
export const OFFENSE_MAX_Y =
  LOS_VIEW_Y + LOS_PLAYER_BUFFER_YARDS + PLAYBOOK_MARKER_RADIUS_Y

/**
 * Northernmost y defense center may occupy.
 * Icon south edge stays LOS_PLAYER_BUFFER_YARDS north of the LOS.
 */
export const DEFENSE_MIN_Y =
  LOS_VIEW_Y - LOS_PLAYER_BUFFER_YARDS - PLAYBOOK_MARKER_RADIUS_Y

/** Maximum offensive players allowed behind the line of scrimmage. */
export const MAX_BACKFIELD_PLAYERS = 5

type PlayerLike = { id: PlayerLabel; position: Position }

/** True when the player is behind the LOS buffer (in the backfield). */
export function isInBackfield(position: Position): boolean {
  return position.y > OFFENSE_MAX_Y + 0.01
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
  enforceBackfieldLimit = true,
): boolean {
  if (!enforceBackfieldLimit) {
    return true
  }

  return backfieldCountAfterMove(players, playerId, proposedPosition) <= MAX_BACKFIELD_PLAYERS
}

/** Offense stays behind the line of scrimmage, outside the LOS buffer (south side, higher y). */
export function clampOffensePosition(position: Position): Position {
  const clamped = clampViewPosition(position)
  return { x: clamped.x, y: Math.max(OFFENSE_MAX_Y, clamped.y) }
}

/**
 * Clamps offense position and enforces the backfield player limit.
 * Blocks entering the backfield when full; keeps at the LOS buffer line at the same x.
 * Keeps the prior spot when a move would increase an already-illegal backfield count.
 */
export function resolveOffensePlayerPosition(
  players: PlayerLike[],
  playerId: PlayerLabel,
  position: Position,
  enforceBackfieldLimit = true,
): Position {
  const clamped = clampOffensePosition(position)

  if (isBackfieldPlacementAllowed(players, playerId, clamped, enforceBackfieldLimit)) {
    return clamped
  }

  const current = players.find((player) => player.id === playerId)
  if (current && isInBackfield(current.position) && isInBackfield(clamped)) {
    return current.position
  }

  return { x: clamped.x, y: OFFENSE_MAX_Y }
}

export function isBackfieldLimitExceeded(
  players: Pick<PlayerLike, 'position'>[],
  enforceBackfieldLimit = true,
): boolean {
  if (!enforceBackfieldLimit) {
    return false
  }

  return countBackfieldPlayers(players) > MAX_BACKFIELD_PLAYERS
}

/** Defense stays in front of the line of scrimmage, outside the LOS buffer (north side, lower y). */
export function clampDefensePosition(position: Position): Position {
  const clamped = clampViewPosition(position)
  return { x: clamped.x, y: Math.min(DEFENSE_MIN_Y, clamped.y) }
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
