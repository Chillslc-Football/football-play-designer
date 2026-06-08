import type { PlayerLabel, Position } from '../types/player'
import type { Route } from '../types/route'

export type RouteEditSelection =
  | { playerId: PlayerLabel; kind: 'vertex'; vertexIndex: number }
  | { playerId: PlayerLabel; kind: 'segment'; segmentIndex: number }

/** @deprecated Use RouteEditSelection with kind 'segment'. */
export type SelectedRouteSegment = {
  playerId: Route['playerId']
  segmentIndex: number
}

/** All vertices for a route polyline: player position followed by waypoints. */
export function getRouteVertices(playerPosition: Position, route: Route): Position[] {
  return [playerPosition, ...route.points]
}

export function getAnchorVertexIndex(selection: RouteEditSelection): number {
  return selection.kind === 'vertex' ? selection.vertexIndex : selection.segmentIndex + 1
}

/** Removes one segment by deleting its end waypoint and reconnecting the neighbors. */
export function deleteRouteSegment(route: Route, segmentIndex: number): Route {
  if (segmentIndex < 0 || segmentIndex >= route.points.length) {
    return route
  }

  return {
    ...route,
    points: route.points.filter((_, index) => index !== segmentIndex),
  }
}

/** Extends a route from the selected anchor vertex with one or more new points. */
export function extendRouteFromAnchor(
  route: Route,
  anchorVertexIndex: number,
  newPoints: Position[],
): Route {
  if (newPoints.length === 0) return route

  if (anchorVertexIndex === 0) {
    return { ...route, points: newPoints }
  }

  return {
    ...route,
    points: [...route.points.slice(0, anchorVertexIndex), ...newPoints],
  }
}
