import type { DefenderLabel } from '../types/defender'
import type { Position } from '../types/player'
import type { DefenderRoute } from '../types/defenderRoute'

export type DefenderRouteEditSelection =
  | { defenderId: DefenderLabel; kind: 'vertex'; vertexIndex: number }
  | { defenderId: DefenderLabel; kind: 'segment'; segmentIndex: number }

export function getDefenderRouteVertices(
  defenderPosition: Position,
  route: DefenderRoute,
): Position[] {
  return [defenderPosition, ...route.points]
}

export function getDefenderAnchorVertexIndex(selection: DefenderRouteEditSelection): number {
  return selection.kind === 'vertex' ? selection.vertexIndex : selection.segmentIndex + 1
}

export function deleteEntireDefenderRoute(route: DefenderRoute): DefenderRoute {
  return {
    ...route,
    points: [],
  }
}

export function deleteDefenderRouteSegment(
  route: DefenderRoute,
  segmentIndex: number,
): DefenderRoute {
  if (segmentIndex < 0 || segmentIndex >= route.points.length) {
    return route
  }

  return {
    ...route,
    points: route.points.filter((_, index) => index !== segmentIndex),
  }
}

export function extendDefenderRouteFromAnchor(
  route: DefenderRoute,
  anchorVertexIndex: number,
  newPoints: Position[],
): DefenderRoute {
  if (newPoints.length === 0) return route

  if (anchorVertexIndex === 0) {
    return { ...route, points: newPoints }
  }

  return {
    ...route,
    points: [...route.points.slice(0, anchorVertexIndex), ...newPoints],
  }
}
