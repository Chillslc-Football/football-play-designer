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
  | { playerId: PlayerLabel; actionId: string; kind: 'vertex'; vertexIndex: number }
  | { playerId: PlayerLabel; actionId: string; kind: 'segment'; segmentIndex: number }

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
  _denseRoute: boolean,
  _selectedSegmentIndex: number | null,
): boolean {
  if (vertexIndex <= 0 || vertexIndex === vertexCount - 1) {
    return false
  }
  return true
}

/** Finds the segment closest to a point — no distance cutoff (for endpoint reshape). */
function findClosestSegmentIndex(vertices: Position[], point: Position): number {
  if (vertices.length < 2) return 0

  let nearestIndex = 0
  let nearestDistance = Infinity

  for (let index = 0; index < vertices.length - 1; index += 1) {
    const segmentDistance = distanceToSegment(point, vertices[index], vertices[index + 1])
    if (segmentDistance < nearestDistance) {
      nearestDistance = segmentDistance
      nearestIndex = index
    }
  }

  return nearestIndex
}

/**
 * Repositions the endpoint while editing — trims waypoints when dragged backward
 * along the path; extends when dragged forward past the current end.
 */
export function reshapeActionPointsFromEndpointDrag(
  startPosition: Position,
  points: Position[],
  dragPosition: Position,
): Position[] {
  if (points.length === 0) return [dragPosition]

  const vertices = [startPosition, ...points]
  const segmentIndex = findClosestSegmentIndex(vertices, dragPosition)

  return [...points.slice(0, segmentIndex), dragPosition]
}

export function getAnchorVertexIndex(selection: RouteEditSelection): number {
  return selection.kind === 'vertex' ? selection.vertexIndex : selection.segmentIndex + 1
}

/** Segment index to remove when deleting from a segment or waypoint selection. */
export function getDeletableRouteSegmentIndex(selection: RouteEditSelection): number | null {
  if (selection.kind === 'segment') {
    return selection.segmentIndex
  }

  if (selection.kind === 'vertex' && selection.vertexIndex > 0) {
    return selection.vertexIndex - 1
  }

  return null
}

export function canDeleteRouteSegmentSelection(selection: RouteEditSelection | null): boolean {
  return selection !== null && getDeletableRouteSegmentIndex(selection) !== null
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
