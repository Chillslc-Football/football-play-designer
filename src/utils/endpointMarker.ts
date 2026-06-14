import type { Position } from '../types/player'
import type { EndpointMarker, PlayerAction } from '../types/playerAction'
import { defaultEndpointMarker } from './playerActionChains'

const BLOCK_BAR_HALF_LENGTH = 1.2

export function resolveEndpointMarker(action: PlayerAction): EndpointMarker {
  return action.endpointMarker ?? defaultEndpointMarker(action.type)
}

/** True when the coach explicitly chose a non-default marker for this action type. */
export function hasEndpointMarkerOverride(action: PlayerAction): boolean {
  return (
    action.endpointMarker != null &&
    action.endpointMarker !== defaultEndpointMarker(action.type)
  )
}

export function pickMergedEndpointMarker(
  previous: PlayerAction,
  current: PlayerAction,
): EndpointMarker {
  if (hasEndpointMarkerOverride(current)) {
    return resolveEndpointMarker(current)
  }
  if (hasEndpointMarkerOverride(previous)) {
    return resolveEndpointMarker(previous)
  }
  return defaultEndpointMarker(current.type)
}

export function lastSegmentUsesArrowMarker(endpointMarker: EndpointMarker): boolean {
  return endpointMarker === 'arrow'
}

export function getBlockEndBar(
  vertices: Position[],
): { x1: number; y1: number; x2: number; y2: number } | null {
  if (vertices.length < 2) return null

  const end = vertices[vertices.length - 1]

  let dirX = 0
  let dirY = 0
  for (let index = vertices.length - 1; index > 0; index -= 1) {
    const dx = vertices[index].x - vertices[index - 1].x
    const dy = vertices[index].y - vertices[index - 1].y
    const length = Math.sqrt(dx * dx + dy * dy)
    if (length > 0.001) {
      dirX = dx / length
      dirY = dy / length
      break
    }
  }

  if (dirX === 0 && dirY === 0) return null

  const perpX = -dirY
  const perpY = dirX

  return {
    x1: end.x - perpX * BLOCK_BAR_HALF_LENGTH,
    y1: end.y - perpY * BLOCK_BAR_HALF_LENGTH,
    x2: end.x + perpX * BLOCK_BAR_HALF_LENGTH,
    y2: end.y + perpY * BLOCK_BAR_HALF_LENGTH,
  }
}
