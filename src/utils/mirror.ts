import { FIELD_WIDTH } from '../constants/field'
import type { Player, Position } from '../types/player'

/**
 * Coordinate reminder (bird's-eye view, offense faces right):
 *   x = downfield toward the end zone — offense always attacks left-to-right (+x)
 *   y = across the field — left/right of the formation
 *
 * Mirror Play flips y across the Center (C) only.
 * x is NEVER flipped — that would reverse the play direction.
 */

/**
 * Flips a point left/right across the offensive center line (C's y position).
 * Downfield depth (x) is preserved so routes still attack left-to-right.
 *
 * Formula: mirroredY = centerY - (originalY - centerY)
 */
export function mirrorPositionLaterally(position: Position, centerY: number): Position {
  return {
    x: position.x,
    y: centerY - (position.y - centerY),
  }
}

/** Reads the y position of the Center (C) — the lateral mirror axis. */
export function getCenterPlayerY(players: Player[]): number {
  const center = players.find((player) => player.id === 'C')
  return center?.position.y ?? FIELD_WIDTH / 2
}
