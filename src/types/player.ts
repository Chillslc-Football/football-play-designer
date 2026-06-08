import { FIELD_LENGTH, FIELD_WIDTH } from '../constants/field'
import { mirrorPosition } from '../utils/mirror'

/** A point on the field in SVG coordinates (x = length, y = width). */
export type Position = {
  x: number
  y: number
}

/** The 11 offensive positions we support. */
export type PlayerLabel =
  | 'QB'
  | 'RB'
  | 'FB'
  | 'X'
  | 'Y'
  | 'Z'
  | 'LT'
  | 'LG'
  | 'C'
  | 'RG'
  | 'RT'

export type Player = {
  id: PlayerLabel
  label: PlayerLabel
  position: Position
}

/**
 * Mirrors every player horizontally across the field center.
 *
 * - Each player's x position is flipped around midfield (x = 60).
 * - Y positions stay the same (no vertical movement).
 * - Labels (QB, RB, etc.) are unchanged — only position updates.
 */
export function mirrorPlayers(players: Player[]): Player[] {
  return players.map((player) => ({
    ...player,
    position: mirrorPosition(player.position),
  }))
}

/** Keeps a player inside the field boundaries. */
export function clampPosition(position: Position): Position {
  return {
    x: Math.min(FIELD_LENGTH - 1, Math.max(1, position.x)),
    y: Math.min(FIELD_WIDTH - 1, Math.max(1, position.y)),
  }
}
