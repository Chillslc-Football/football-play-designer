import { MIN_PLAYER_CENTER_SPACING } from '../constants/field'
import type { Position } from '../types/player'

type PositionedEntity = {
  id: string
  position: Position
}

function pushApart(from: Position, otherCenter: Position, minDistance: number): Position {
  const dx = from.x - otherCenter.x
  const dy = from.y - otherCenter.y
  const distance = Math.sqrt(dx * dx + dy * dy)

  if (distance >= minDistance) {
    return from
  }

  if (distance < 1e-6) {
    return { x: otherCenter.x + minDistance, y: otherCenter.y }
  }

  const scale = minDistance / distance
  return {
    x: otherCenter.x + dx * scale,
    y: otherCenter.y + dy * scale,
  }
}

/** Keeps a dragged player/defender from overlapping another marker. */
export function applyPlayerSpacing<T extends PositionedEntity>(
  entities: T[],
  movingId: string,
  proposed: Position,
  minCenterSpacing: number = MIN_PLAYER_CENTER_SPACING,
): Position {
  let resolved = proposed

  for (let pass = 0; pass < 3; pass++) {
    for (const other of entities) {
      if (other.id === movingId) continue
      resolved = pushApart(resolved, other.position, minCenterSpacing)
    }
  }

  return resolved
}
