import type { PlayerLabel, Position } from '../types/player'
import type { Route } from '../types/route'

const DENSE_ROUTE_AVG_SEGMENT_LENGTH = 1.25

function distance(a: Position, b: Position): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  return Math.sqrt(dx * dx + dy * dy)
}

function distanceToSegment(point: Position, start: Position, end: Position): number {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const lengthSquared = dx * dx + dy * dy

  if (lengthSquared === 0) {
    return distance(point, start)
  }

  const t = Math.max(
    0,
    Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared),
  )

  const projection = {
    x: start.x + t * dx,
    y: start.y + t * dy,
  }

  return distance(point, projection)
}

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

/** True when waypoints are densely spaced (typical freehand routes). */
export function isDenseRoute(vertices: Position[]): boolean {
  if (vertices.length < 4) return false

  let totalLength = 0
  for (let index = 0; index < vertices.length - 1; index += 1) {
    totalLength += distance(vertices[index], vertices[index + 1])
  }

  const averageSegmentLength = totalLength / (vertices.length - 1)
  return averageSegmentLength < DENSE_ROUTE_AVG_SEGMENT_LENGTH
}

/** Finds the segment closest to a field click (used for freehand selection). */
export function findNearestSegmentIndex(
  vertices: Position[],
  point: Position,
  maxDistance = 2.5,
): number | null {
  if (vertices.length < 2) return null

  let nearestIndex: number | null = null
  let nearestDistance = Infinity

  for (let index = 0; index < vertices.length - 1; index += 1) {
    const segmentDistance = distanceToSegment(point, vertices[index], vertices[index + 1])
    if (segmentDistance < nearestDistance) {
      nearestDistance = segmentDistance
      nearestIndex = index
    }
  }

  return nearestDistance <= maxDistance ? nearestIndex : null
}

export function getSvgPointFromMouseEvent(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
): Position {
  const point = svg.createSVGPoint()
  point.x = clientX
  point.y = clientY
  const matrix = svg.getScreenCTM()

  if (!matrix) {
    return { x: 0, y: 0 }
  }

  const transformed = point.matrixTransform(matrix.inverse())
  return { x: transformed.x, y: transformed.y }
}

export function isRouteVertexInteractive(
  vertexIndex: number,
  vertexCount: number,
  denseRoute: boolean,
  selectedSegmentIndex: number | null,
): boolean {
  if (!denseRoute) return true
  if (vertexIndex === 0 || vertexIndex === vertexCount - 1) return true
  if (selectedSegmentIndex === null) return false
  return vertexIndex === selectedSegmentIndex || vertexIndex === selectedSegmentIndex + 1
}

export function getAnchorVertexIndex(selection: RouteEditSelection): number {
  return selection.kind === 'vertex' ? selection.vertexIndex : selection.segmentIndex + 1
}

/** Clears all waypoints for a player route. */
export function deleteEntireRoute(route: Route): Route {
  return {
    ...route,
    points: [],
  }
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
