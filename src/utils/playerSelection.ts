import { PLAYER_SELECTION_RADIUS } from '../constants/field'
import type { Position } from '../types/player'

export function distanceBetween(a: Position, b: Position): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

/** Returns the closest entity within the selection radius, if any. */
export function findNearestByPosition<T extends { position: Position }>(
  clickPosition: Position,
  items: T[],
  maxRadius: number = PLAYER_SELECTION_RADIUS,
): T | null {
  let best: T | null = null
  let bestDistance = maxRadius

  for (const item of items) {
    const distance = distanceBetween(clickPosition, item.position)
    if (distance <= bestDistance) {
      bestDistance = distance
      best = item
    }
  }

  return best
}
