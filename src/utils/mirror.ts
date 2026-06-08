import { FIELD_CENTER_X } from '../constants/field'
import type { Position } from '../types/player'

/**
 * Flips a single point horizontally across the center of the field.
 *
 * The field runs from x = 0 to x = 120. The center is at x = 60 (midfield).
 * Mirroring keeps the same distance from center, but on the opposite side.
 *
 * Example: a point at x = 48 (12 units left of center) becomes x = 72 (12 units right).
 *
 *   mirroredX = center + (center - x) = 2 * center - x
 *
 * Y is never changed — players and routes only flip left/right, not up/down.
 */
export function mirrorPosition(position: Position): Position {
  return {
    x: 2 * FIELD_CENTER_X - position.x,
    y: position.y,
  }
}
