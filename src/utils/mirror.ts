import { FIELD_WIDTH } from '../constants/field'
import type { Player, Position } from '../types/player'

/**
 * Coordinate reminder (bird's-eye view, offense attacks north):
 *   x = across the field — left/right of the formation
 *   y = downfield depth in the view — offense attacks upward (-y on screen toward north)
 *
 * Mirror Play flips x across the Center (C) only.
 * y is NEVER flipped — that would reverse the play direction.
 */

/**
 * Flips a point left/right across the offensive center line (C's x position).
 * Downfield depth (y) is preserved so routes still attack north.
 */
export function mirrorPositionLaterally(position: Position, centerX: number): Position {
  return {
    x: centerX - (position.x - centerX),
    y: position.y,
  }
}

/** Reads the x position of the Center (C) — the lateral mirror axis. */
export function getCenterPlayerX(players: Player[]): number {
  const center = players.find((player) => player.id === 'C')
  return center?.position.x ?? FIELD_WIDTH / 2
}

/** @deprecated Use getCenterPlayerX — kept for transitional imports. */
export function getCenterPlayerY(players: Player[]): number {
  return getCenterPlayerX(players)
}
