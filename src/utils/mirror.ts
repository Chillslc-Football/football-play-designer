import { FIELD_WIDTH } from '../constants/field'
import type { Player, Position } from '../types/player'
import type { TeamFormat } from '../types/teamFormat'
import { clampViewPosition } from './fieldView'

/**
 * Coordinate reminder (bird's-eye view, offense attacks north):
 *   x = across the field — left/right of the formation
 *   y = downfield depth in the view — offense attacks upward (-y on screen toward north)
 *
 * Mirror Play flips x across a lateral axis only.
 * y is NEVER flipped — that would reverse the play direction.
 *
 * 11v11: axis is the Center (C) — at field center in standard formations.
 * 7v7/8v8: axis is field center — C sits left of midpoint on evenly spaced LOS layouts.
 */

/**
 * Flips a point left/right across the mirror axis.
 * Downfield depth (y) is preserved so routes still attack north.
 */
export function mirrorPositionLaterally(position: Position, axisX: number): Position {
  return {
    x: axisX - (position.x - axisX),
    y: position.y,
  }
}

/** Mirror a path/action point and clamp to the visible field bounds. */
export function clampMirroredPoint(position: Position, axisX: number): Position {
  return clampViewPosition(mirrorPositionLaterally(position, axisX))
}

/** Reads the x position of the Center (C) — the 11v11 lateral mirror axis. */
export function getCenterPlayerX(players: Player[]): number {
  const center = players.find((player) => player.id === 'C')
  return center?.position.x ?? FIELD_WIDTH / 2
}

/**
 * Mirror axis for the active team format.
 * Reduced formats use field center; 11v11 uses C (equivalent for standard formations).
 */
export function getMirrorAxisX(players: Player[], teamFormat?: TeamFormat): number {
  if (teamFormat === '7v7' || teamFormat === '8v8') {
    return FIELD_WIDTH / 2
  }

  return getCenterPlayerX(players)
}

/** @deprecated Use getCenterPlayerX — kept for transitional imports. */
export function getCenterPlayerY(players: Player[]): number {
  return getCenterPlayerX(players)
}
